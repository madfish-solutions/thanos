import { localForger } from '@taquito/local-forging';
import { valueDecoder } from '@taquito/local-forging/dist/lib/michelson/codec';
import { Uint8ArrayConsumer } from '@taquito/local-forging/dist/lib/uint8array-consumer';
import { emitMicheline } from '@taquito/michel-codec';
import { RpcClient } from '@taquito/rpc';
import { TezosOperationError } from '@taquito/taquito';
import {
  TempleDAppMessageType,
  TempleDAppErrorType,
  TempleDAppGetCurrentPermissionResponse,
  TempleDAppPermissionRequest,
  TempleDAppPermissionResponse,
  TempleDAppOperationRequest,
  TempleDAppOperationResponse,
  TempleDAppSignRequest,
  TempleDAppSignResponse,
  TempleDAppBroadcastRequest,
  TempleDAppBroadcastResponse
} from '@temple-wallet/dapp/dist/types';
import { nanoid } from 'nanoid';
import { v4 as uuid } from 'uuid';

import {
  TezosDAppNetwork,
  TezosDAppSession,
  getDApp as genericGetDApp,
  setDApp as genericSetDApp,
  removeDApps as genericRemoveDApps
} from 'app/storage/dapps';
import { CUSTOM_TEZOS_NETWORKS_STORAGE_KEY, TEZOS_CHAINS_SPECS_STORAGE_KEY } from 'lib/constants';
import { fetchFromStorage } from 'lib/storage';
import { addLocalOperation } from 'lib/temple/activity';
import * as Beacon from 'lib/temple/beacon';
import { buildFinalTezosOpParams } from 'lib/temple/helpers';
import {
  TempleMessageType,
  TempleRequest,
  TempleNotification,
  TEZOS_MAINNET_CHAIN_ID,
  TempleTezosChainId,
  TempleTezosDAppPayload
} from 'lib/temple/types';
import { isValidTezosAddress } from 'lib/tezos';
import { TezosChainSpecs } from 'temple/front/chains-specs';
import { StoredTezosNetwork, TEZOS_DEFAULT_NETWORKS } from 'temple/networks';
import { loadTezosChainId } from 'temple/tezos';
import { TempleChainKind } from 'temple/types';

import { intercom } from './defaults';
import { dryRunOpParams } from './dryrun';
import { RequestConfirmParams, requestConfirm as genericRequestConfirm } from './request-confirm';
import { withUnlocked } from './store';

const HEX_PATTERN = /^[0-9a-fA-F]+$/;
const TEZ_MSG_SIGN_PATTERN = /^0501[a-f0-9]{8}54657a6f73205369676e6564204d6573736167653a20[a-f0-9]*$/;

export async function getCurrentPermission(origin: string): Promise<TempleDAppGetCurrentPermissionResponse> {
  const dApp = await getDApp(origin);
  const permission = dApp
    ? {
        rpc: await getAssertNetworkRPC(dApp.network),
        pkh: dApp.pkh,
        publicKey: dApp.publicKey
      }
    : null;
  return {
    type: TempleDAppMessageType.GetCurrentPermissionResponse,
    permission
  };
}

export async function requestPermission(
  origin: string,
  req: TempleDAppPermissionRequest
): Promise<TempleDAppPermissionResponse> {
  if (typeof req?.appMeta?.name !== 'string') throw new Error(TempleDAppErrorType.InvalidParams);

  const networkRpc = await getNetworkRPC(req.network).then(rpcUrl => {
    if (!rpcUrl) throw new Error(TempleDAppErrorType.InvalidParams);

    return rpcUrl;
  });

  const dApp = await getDApp(origin);

  if (!req.force && dApp && isNetworkEquals(req.network, dApp.network) && req.appMeta.name === dApp.appMeta.name) {
    return {
      type: TempleDAppMessageType.PermissionResponse,
      rpc: networkRpc,
      pkh: dApp.pkh,
      publicKey: dApp.publicKey
    };
  }

  return new Promise(async (resolve, reject) => {
    const id = nanoid();

    await requestConfirm({
      id,
      payload: {
        type: 'connect',
        origin,
        networkRpc,
        appMeta: req.appMeta
      },
      onDecline: () => {
        reject(new Error(TempleDAppErrorType.NotGranted));
      },
      handleIntercomRequest: async (confirmReq, decline) => {
        if (confirmReq?.type === TempleMessageType.DAppPermConfirmationRequest && confirmReq?.id === id) {
          const { confirmed, accountPublicKeyHash, accountPublicKey } = confirmReq;
          if (confirmed && accountPublicKeyHash && accountPublicKey) {
            await setDApp(origin, {
              network: req.network,
              appMeta: req.appMeta,
              pkh: accountPublicKeyHash,
              publicKey: accountPublicKey
            });
            resolve({
              type: TempleDAppMessageType.PermissionResponse,
              pkh: accountPublicKeyHash,
              publicKey: accountPublicKey,
              rpc: networkRpc
            });
            const broadcastMsg: TempleNotification = {
              type: TempleMessageType.SelectedAccountChanged,
              accountPublicKeyHash
            };
            intercom.broadcast(broadcastMsg);
          } else {
            decline();
          }

          return {
            type: TempleMessageType.DAppPermConfirmationResponse
          };
        }
        return undefined;
      }
    });
  });
}

export async function requestOperation(
  origin: string,
  req: TempleDAppOperationRequest
): Promise<TempleDAppOperationResponse> {
  if (
    ![
      isValidTezosAddress(req?.sourcePkh),
      req?.opParams?.length > 0,
      req?.opParams?.every(op => typeof op.kind === 'string')
    ].every(Boolean)
  ) {
    throw new Error(TempleDAppErrorType.InvalidParams);
  }

  const dApp = await getDApp(origin);

  if (!dApp) {
    throw new Error(TempleDAppErrorType.NotGranted);
  }

  if (req.sourcePkh !== dApp.pkh) {
    throw new Error(TempleDAppErrorType.NotFound);
  }

  return new Promise(async (resolve, reject) => {
    const id = nanoid();
    const networkRpc = await getAssertNetworkRPC(dApp.network);

    await requestConfirm({
      id,
      payload: {
        type: 'confirm_operations',
        origin,
        networkRpc,
        appMeta: dApp.appMeta,
        sourcePkh: req.sourcePkh,
        sourcePublicKey: dApp.publicKey,
        opParams: req.opParams
      },
      onDecline: () => {
        reject(new Error(TempleDAppErrorType.NotGranted));
      },
      handleIntercomRequest: (confirmReq, decline) =>
        handleIntercomRequest(confirmReq, decline, id, dApp, networkRpc, req, resolve, reject)
    });
  });
}

const handleIntercomRequest = async (
  confirmReq: TempleRequest,
  decline: () => void,
  id: string,
  dApp: TezosDAppSession,
  networkRpc: string,
  req: TempleDAppOperationRequest,
  resolve: any,
  reject: any
) => {
  if (confirmReq?.type === TempleMessageType.DAppTezosOpsConfirmationRequest && confirmReq?.id === id) {
    const { modifiedStorageLimit, modifiedTotalFee, confirmed } = confirmReq;
    if (confirmed) {
      try {
        const op = await withUnlocked(({ vault }) =>
          vault.sendOperations(
            dApp.pkh,
            networkRpc,
            buildFinalTezosOpParams(req.opParams, modifiedTotalFee, modifiedStorageLimit)
          )
        );

        safeGetChain(networkRpc, op);

        resolve({
          type: TempleDAppMessageType.OperationResponse,
          opHash: op.hash
        });
      } catch (err: any) {
        if (err instanceof TezosOperationError) {
          err.message = TempleDAppErrorType.TezosOperation;
          reject(err);
        } else {
          throw err;
        }
      }
    } else {
      decline();
    }

    return {
      type: TempleMessageType.DAppOpsConfirmationResponse
    };
  }
  return undefined;
};

const safeGetChain = async (networkRpc: string, op: any) => {
  try {
    const chainId = await loadTezosChainId(networkRpc);
    await addLocalOperation(chainId, op.hash, op.results);
  } catch {}
};

export async function requestSign(origin: string, req: TempleDAppSignRequest): Promise<TempleDAppSignResponse> {
  if (req?.payload?.startsWith('0x')) {
    req = { ...req, payload: req.payload.substring(2) };
  }

  if (![isValidTezosAddress(req?.sourcePkh), HEX_PATTERN.test(req?.payload)].every(Boolean)) {
    throw new Error(TempleDAppErrorType.InvalidParams);
  }

  const dApp = await getDApp(origin);

  if (!dApp) {
    throw new Error(TempleDAppErrorType.NotGranted);
  }

  if (req.sourcePkh !== dApp.pkh) {
    throw new Error(TempleDAppErrorType.NotFound);
  }

  return new Promise((resolve, reject) => generatePromisifySign(resolve, reject, dApp, req));
}

const generatePromisifySign = async (resolve: any, reject: any, dApp: TezosDAppSession, req: TempleDAppSignRequest) => {
  const id = nanoid();
  const networkRpc = await getAssertNetworkRPC(dApp.network);

  let preview: any;
  try {
    if (req.payload.startsWith('03')) {
      const parsed = await localForger.parse(req.payload.slice(2));
      if (parsed.contents.length > 0) {
        preview = parsed;
      }
    } else {
      const value = valueDecoder(Uint8ArrayConsumer.fromHexString(req.payload.slice(2)));
      const parsed = emitMicheline(value, {
        indent: '  ',
        newline: '\n'
      }).slice(1, -1);

      if (req.payload.match(TEZ_MSG_SIGN_PATTERN)) {
        preview = value.string;
      } else if (parsed.length > 0) {
        preview = parsed;
      } else {
        const parsed = await localForger.parse(req.payload);
        if (parsed.contents.length > 0) {
          preview = parsed;
        }
      }
    }
  } catch {
    preview = null;
  }

  await requestConfirm({
    id,
    payload: {
      type: 'sign',
      origin,
      networkRpc,
      appMeta: dApp.appMeta,
      sourcePkh: req.sourcePkh,
      payload: req.payload,
      preview
    },
    onDecline: () => {
      reject(new Error(TempleDAppErrorType.NotGranted));
    },
    handleIntercomRequest: async (confirmReq, decline) => {
      if (confirmReq?.type === TempleMessageType.DAppSignConfirmationRequest && confirmReq?.id === id) {
        if (confirmReq.confirmed) {
          const { prefixSig: signature } = await withUnlocked(({ vault }) => vault.sign(dApp.pkh, req.payload));
          resolve({
            type: TempleDAppMessageType.SignResponse,
            signature
          });
        } else {
          decline();
        }

        return {
          type: TempleMessageType.DAppSignConfirmationResponse
        };
      }
      return undefined;
    }
  });
};

export async function requestBroadcast(
  origin: string,
  req: TempleDAppBroadcastRequest
): Promise<TempleDAppBroadcastResponse> {
  if (![req?.signedOpBytes?.length > 0].every(Boolean)) {
    throw new Error(TempleDAppErrorType.InvalidParams);
  }

  const dApp = await getDApp(origin);

  if (!dApp) {
    throw new Error(TempleDAppErrorType.NotGranted);
  }

  try {
    const rpc = new RpcClient(await getAssertNetworkRPC(dApp.network));
    const opHash = await rpc.injectOperation(req.signedOpBytes);
    return {
      type: TempleDAppMessageType.BroadcastResponse,
      opHash
    };
  } catch (err: any) {
    throw err instanceof TezosOperationError
      ? (() => {
          err.message = TempleDAppErrorType.TezosOperation;
          return err;
        })()
      : new Error('Failed to broadcast');
  }
}

async function getDApp(origin: string) {
  return genericGetDApp(TempleChainKind.Tezos, origin);
}

async function setDApp(origin: string, permissions: TezosDAppSession) {
  return genericSetDApp(TempleChainKind.Tezos, origin, permissions);
}

export async function removeDApps(origins: string[]) {
  const result = await genericRemoveDApps(TempleChainKind.Tezos, origins);
  const messageBeforeEncryption = Beacon.encodeMessage({
    id: uuid(),
    version: '4',
    senderId: await Beacon.getSenderId(),
    type: 'disconnect'
  });
  const encryptionResults = await Promise.allSettled(
    origins.map(async (origin): Promise<[string, string]> => {
      const pubKey = await Beacon.getDAppPublicKey(origin);

      if (!pubKey) {
        throw new Error('Public key not found');
      }

      return [origin, await Beacon.encryptMessage(messageBeforeEncryption, pubKey)];
    })
  );
  await Beacon.removeDAppPublicKey(origins);
  const messagePayloads = Object.fromEntries(
    encryptionResults
      .filter((r): r is PromiseFulfilledResult<[string, string]> => r.status === 'fulfilled')
      .map(r => r.value)
  );
  intercom.broadcast({
    type: TempleMessageType.TempleTezosDAppsDisconnected,
    messagePayloads
  });

  return result;
}

async function requestConfirm(params: Omit<RequestConfirmParams<TempleTezosDAppPayload>, 'transformPayload'>) {
  return genericRequestConfirm({
    ...params,
    transformPayload: async payload => {
      if (payload.type === 'confirm_operations') {
        const dryrunResult = await dryRunOpParams({
          opParams: payload.opParams,
          networkRpc: payload.networkRpc,
          sourcePkh: payload.sourcePkh,
          sourcePublicKey: payload.sourcePublicKey
        });
        if (dryrunResult) {
          const newPayload = { ...payload };

          if (dryrunResult.error) {
            newPayload.error = dryrunResult;
          }
          if (dryrunResult.result) {
            newPayload.estimates = dryrunResult.result.estimates;
          }

          return newPayload;
        }
      }
      return payload;
    }
  });
}

async function getNetworkRPC(net: TezosDAppNetwork) {
  if (net === 'sandbox') {
    return 'http://localhost:8732';
  }

  if (net === 'mainnet') return await getActiveTempleRpcUrlByChainId(TEZOS_MAINNET_CHAIN_ID);

  if (net === 'ghostnet') return await getActiveTempleRpcUrlByChainId(TempleTezosChainId.Ghostnet);

  if (typeof net === 'string') return null;

  return removeLastSlash(net.rpc);
}

async function getAssertNetworkRPC(net: TezosDAppNetwork) {
  const rpcUrl = await getNetworkRPC(net);

  if (!rpcUrl) throw new Error('Unsupported network');

  return rpcUrl;
}

async function getActiveTempleRpcUrlByChainId(chainId: string): Promise<string | undefined> {
  const customTezosNetworks = await fetchFromStorage<StoredTezosNetwork[]>(CUSTOM_TEZOS_NETWORKS_STORAGE_KEY);
  const chainNetworks = (
    customTezosNetworks ? [...TEZOS_DEFAULT_NETWORKS, ...customTezosNetworks] : TEZOS_DEFAULT_NETWORKS
  ).filter(n => n.chainId === chainId);

  const tezosChainsSpecs = await fetchFromStorage<OptionalRecord<TezosChainSpecs>>(TEZOS_CHAINS_SPECS_STORAGE_KEY);
  const activeRpcId = tezosChainsSpecs?.[chainId]?.activeRpcId;

  const activeChainRpc = (activeRpcId && chainNetworks.find(n => n.id === activeRpcId)) || chainNetworks[0];

  return activeChainRpc?.rpcBaseURL;
}

function isNetworkEquals(fNet: TezosDAppNetwork, sNet: TezosDAppNetwork) {
  return typeof fNet !== 'string' && typeof sNet !== 'string'
    ? removeLastSlash(fNet.rpc) === removeLastSlash(sNet.rpc)
    : fNet === sNet;
}

function removeLastSlash(str: string) {
  return str.endsWith('/') ? str.slice(0, -1) : str;
}
