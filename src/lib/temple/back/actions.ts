import { DerivationType } from '@taquito/ledger-signer';
import { TezosOperationError } from '@taquito/taquito';
import { char2Bytes } from '@taquito/utils';
import {
  TempleDAppMessageType,
  TempleDAppErrorType,
  TempleDAppRequest,
  TempleDAppResponse
} from '@temple-wallet/dapp/dist/types';
import browser, { Runtime } from 'webextension-polyfill';

import { CUSTOM_TEZOS_NETWORKS_STORAGE_KEY } from 'lib/constants';
import { BACKGROUND_IS_WORKER } from 'lib/env';
import { putToStorage } from 'lib/storage';
import { addLocalOperation } from 'lib/temple/activity';
import * as Beacon from 'lib/temple/beacon';
import { TempleState, TempleMessageType, TempleRequest, TempleSettings, TempleAccountType } from 'lib/temple/types';
import { PromisesQueue, PromisesQueueCounters, delay } from 'lib/utils';
import { evmRpcMethodsNames, GET_DEFAULT_WEB3_PARAMS_METHOD_NAME } from 'temple/evm/constants';
import { EvmTxParams } from 'temple/evm/types';
import { EvmChain } from 'temple/front';
import { loadTezosChainId } from 'temple/tezos';
import { TempleChainKind } from 'temple/types';

import {
  getCurrentPermission,
  requestPermission,
  requestOperation,
  requestSign,
  requestBroadcast,
  removeDApps as removeTezDApps
} from './dapp';
import { intercom } from './defaults';
import type { DryRunResult } from './dryrun';
import { buildFinalOpParams, dryRunOpParams } from './dryrun';
import {
  connectEvm,
  getDefaultWeb3Params,
  getEvmPermissions,
  requestEvmPermissions,
  requestEvmPersonalSign,
  requestEvmTypedSign,
  revokeEvmPermissions,
  switchChain,
  removeDApps as removeEvmDApps,
  init as initEvm,
  recoverEvmMessageAddress,
  handleEvmRpcRequest,
  addChain,
  addAsset
} from './evm-dapp';
import {
  addEthAssetPayloadValidationSchema,
  addEthChainPayloadValidationSchema,
  ethChangePermissionsPayloadValidationSchema,
  ethOldSignTypedDataValidationSchema,
  ethPersonalSignPayloadValidationSchema,
  ethSignTypedDataValidationSchema,
  personalSignRecoverPayloadValidationSchema,
  switchEthChainPayloadValidationSchema
} from './evm-validation-schemas';
import {
  toFront,
  store,
  inited,
  locked,
  unlocked,
  accountsUpdated,
  settingsUpdated,
  withInited,
  withUnlocked,
  dAppQueueCountersUpdated
} from './store';
import { Vault } from './vault';

export { switchChain as switchEvmChain } from './evm-dapp';

const ACCOUNT_OR_GROUP_NAME_PATTERN = /^.{1,16}$/;
const AUTODECLINE_AFTER = 60_000;
const BEACON_ID = `temple_wallet_${browser.runtime.id}`;
let initLocked = false;

const dAppQueue = new PromisesQueue();
const unlockQueue = new PromisesQueue();

dAppQueue.on(PromisesQueue.COUNTERS_CHANGE_EVENT_NAME, (counters: PromisesQueueCounters) => {
  dAppQueueCountersUpdated(counters);
});

export async function init() {
  const vaultExist = await Vault.isExist();
  inited(vaultExist);

  if (initLocked) {
    initLocked = false;
    locked();
  }

  await initEvm();
}

export async function getFrontState(): Promise<TempleState> {
  const state = store.getState();
  if (state.inited) {
    if (BACKGROUND_IS_WORKER) return await unlockQueue.enqueue(async () => toFront(store.getState()));
    else return toFront(state);
  } else {
    await delay(10);

    return getFrontState();
  }
}

export function canInteractWithDApps() {
  return Vault.isExist();
}

export function sendEvmTransaction(accountPkh: HexString, network: EvmChain, txParams: EvmTxParams) {
  return withUnlocked(async ({ vault }) => {
    return await vault.sendEvmTransaction(accountPkh, network, txParams);
  });
}

export function registerNewWallet(password: string, mnemonic?: string) {
  return withInited(async () => {
    const accountPkh = await Vault.spawn(password, mnemonic);
    await unlock(password);

    return accountPkh;
  });
}

export async function lock() {
  if (!(await Vault.isExist())) {
    return;
  }

  if (!store.getState().inited) initLocked = true;
  if (BACKGROUND_IS_WORKER) await Vault.forgetSession();

  return withInited(() => {
    locked();
  });
}

export function unlock(password: string) {
  return withInited(() =>
    unlockQueue.enqueue(async () => {
      const vault = await Vault.setup(password, BACKGROUND_IS_WORKER);
      const accounts = await vault.fetchAccounts();
      const settings = await vault.fetchSettings();
      unlocked({ vault, accounts, settings });
    })
  );
}

export async function unlockFromSession() {
  await unlockQueue.enqueue(async () => {
    const vault = await Vault.recoverFromSession();
    if (vault == null) return;
    const accounts = await vault.fetchAccounts();
    const settings = await vault.fetchSettings();
    unlocked({ vault, accounts, settings });
  });
}

export function findFreeHDAccountIndex(walletId: string) {
  return withUnlocked(({ vault }) => vault.findFreeHDAccountIndex(walletId));
}

export function createHDAccount(walletId: string, name?: string, hdIndex?: number) {
  return withUnlocked(async ({ vault }) => {
    if (name) {
      name = name.trim();
      if (!ACCOUNT_OR_GROUP_NAME_PATTERN.test(name)) {
        throw new Error('Invalid name. It should be 1-16 characters');
      }
    }

    const updatedAccounts = await vault.createHDAccount(walletId, name, hdIndex);
    accountsUpdated(updatedAccounts);
  });
}

export function revealMnemonic(walletId: string, password: string) {
  return withUnlocked(() => Vault.revealMnemonic(walletId, password));
}

export function generateSyncPayload(password: string, walletId: string) {
  return withUnlocked(() => Vault.generateSyncPayload(password, walletId));
}

export function revealPrivateKey(address: string, password: string) {
  return withUnlocked(() => Vault.revealPrivateKey(address, password));
}

export function revealPublicKey(accountAddress: string) {
  return withUnlocked(({ vault }) => vault.revealPublicKey(accountAddress));
}

export function removeAccount(id: string, password: string) {
  return withUnlocked(async () => {
    const { newAccounts } = await Vault.removeAccount(id, password);
    accountsUpdated(newAccounts);
  });
}

export function setAccountHidden(id: string, value: boolean) {
  return withUnlocked(async ({ vault }) => {
    const updatedAccounts = await vault.setAccountHidden(id, value);
    accountsUpdated(updatedAccounts);
  });
}

export function editAccount(id: string, name: string) {
  return withUnlocked(async ({ vault }) => {
    name = name.trim();
    if (!ACCOUNT_OR_GROUP_NAME_PATTERN.test(name)) {
      throw new Error('Invalid name. It should be 1-16 characters');
    }

    const updatedAccounts = await vault.editAccountName(id, name);
    accountsUpdated(updatedAccounts);
  });
}

export function importAccount(chain: TempleChainKind, privateKey: string, encPassword?: string) {
  return withUnlocked(async ({ vault }) => {
    const updatedAccounts = await vault.importAccount(chain, privateKey, encPassword);
    accountsUpdated(updatedAccounts);
  });
}

export function importMnemonicAccount(mnemonic: string, password?: string, derivationPath?: string) {
  return withUnlocked(async ({ vault }) => {
    const updatedAccounts = await vault.importMnemonicAccount(mnemonic, password, derivationPath);
    accountsUpdated(updatedAccounts);
  });
}

export function importWatchOnlyAccount(chain: TempleChainKind, address: string, chainId?: string) {
  return withUnlocked(async ({ vault }) => {
    const updatedAccounts = await vault.importWatchOnlyAccount(chain, address, chainId);
    accountsUpdated(updatedAccounts);
  });
}

export function createLedgerAccount(name: string, derivationPath?: string, derivationType?: DerivationType) {
  return withUnlocked(async ({ vault }) => {
    const updatedAccounts = await vault.createLedgerAccount(name, derivationPath, derivationType);
    accountsUpdated(updatedAccounts);
  });
}

export function updateSettings(settings: Partial<TempleSettings>) {
  return withUnlocked(async ({ vault }) => {
    const updatedSettings = await vault.updateSettings(settings);

    putToStorage(CUSTOM_TEZOS_NETWORKS_STORAGE_KEY, updatedSettings.customTezosNetworks);

    settingsUpdated(updatedSettings);
  });
}

export function removeHdWallet(id: string, password: string) {
  return withUnlocked(async () => {
    const { newAccounts } = await Vault.removeHdWallet(id, password);
    accountsUpdated(newAccounts);
  });
}

export function removeAccountsByType(type: Exclude<TempleAccountType, TempleAccountType.HD>, password: string) {
  return withUnlocked(async () => {
    const newAccounts = await Vault.removeAccountsByType(type, password);
    accountsUpdated(newAccounts);
  });
}

export function createOrImportWallet(mnemonic?: string) {
  return withUnlocked(async ({ vault }) => {
    const { newAccounts } = await vault.createOrImportWallet(mnemonic);
    accountsUpdated(newAccounts);
  });
}

export async function removeDAppSession(origins: string[]) {
  return {
    [TempleChainKind.Tezos]: await removeTezDApps(origins),
    [TempleChainKind.EVM]: await removeEvmDApps(origins)
  };
}

export function sendOperations(
  port: Runtime.Port,
  id: string,
  sourcePkh: string,
  networkRpc: string,
  opParams: any[],
  straightaway?: boolean
): Promise<{ opHash: string }> {
  return withUnlocked(async ({ vault }) => {
    const sourcePublicKey = await revealPublicKey(sourcePkh);
    const dryRunResult = await dryRunOpParams({
      opParams,
      networkRpc,
      sourcePkh,
      sourcePublicKey
    });
    if (dryRunResult && dryRunResult.result) {
      opParams = dryRunResult.result.opParams;
    }

    return new Promise(async (resolve, reject) => {
      if (straightaway) {
        try {
          const op = await vault.sendOperations(sourcePkh, networkRpc, opParams);

          await safeAddLocalOperation(networkRpc, op);

          resolve({ opHash: op.hash });
        } catch (err: any) {
          reject(err);
        }
      } else {
        return promisableUnlock(resolve, reject, port, id, sourcePkh, networkRpc, opParams, dryRunResult);
      }
    });
  });
}

const promisableUnlock = async (
  resolve: (arg: { opHash: string }) => void,
  reject: (err: Error) => void,
  port: Runtime.Port,
  id: string,
  sourcePkh: string,
  networkRpc: string,
  opParams: any[],
  dryRunResult: DryRunResult | null
) => {
  intercom.notify(port, {
    type: TempleMessageType.ConfirmationRequested,
    id,
    payload: {
      type: 'operations',
      sourcePkh,
      networkRpc,
      opParams,
      ...((dryRunResult && dryRunResult.result) ?? {})
    },
    ...(dryRunResult && dryRunResult.error ? { error: dryRunResult } : {})
  });

  let closing = false;

  const decline = () => {
    reject(new Error('Declined'));
  };
  const declineAndClose = () => {
    decline();
    closing = close(closing, port, id, stopTimeout, stopRequestListening, stopDisconnectListening);
  };

  const stopRequestListening = intercom.onRequest(async (req: TempleRequest, reqPort) => {
    if (reqPort === port && req?.type === TempleMessageType.ConfirmationRequest && req?.id === id) {
      if (req.confirmed) {
        try {
          const op = await withUnlocked(({ vault }) =>
            vault.sendOperations(
              sourcePkh,
              networkRpc,
              buildFinalOpParams(opParams, req.modifiedTotalFee, req.modifiedStorageLimit)
            )
          );

          await safeAddLocalOperation(networkRpc, op);

          resolve({ opHash: op.hash });
        } catch (err: any) {
          if (err instanceof TezosOperationError) {
            reject(err);
          } else {
            throw err;
          }
        }
      } else {
        decline();
      }

      closing = close(closing, port, id, stopTimeout, stopRequestListening, stopDisconnectListening);

      return {
        type: TempleMessageType.ConfirmationResponse
      };
    }
    return undefined;
  });

  const stopDisconnectListening = intercom.onDisconnect(port, declineAndClose);

  // Decline after timeout
  const t = setTimeout(declineAndClose, AUTODECLINE_AFTER);
  const stopTimeout = () => clearTimeout(t);
};

const safeAddLocalOperation = async (networkRpc: string, op: any) => {
  try {
    const chainId = await loadTezosChainId(networkRpc);
    await addLocalOperation(chainId, op.hash, op.results);
  } catch {}
  return undefined;
};

export function sign(
  port: Runtime.Port,
  id: string,
  sourcePkh: string,
  networkRpc: string,
  bytes: string,
  watermark?: string
) {
  return withUnlocked(
    () =>
      new Promise(async (resolve, reject) => {
        intercom.notify(port, {
          type: TempleMessageType.ConfirmationRequested,
          id,
          payload: {
            type: 'sign',
            sourcePkh,
            networkRpc,
            bytes,
            watermark
          }
        });

        let closing = false;

        const decline = () => {
          reject(new Error('Declined'));
        };
        const declineAndClose = () => {
          decline();
          closing = close(closing, port, id, stopTimeout, stopRequestListening, stopDisconnectListening);
        };

        const stopRequestListening = intercom.onRequest(async (req: TempleRequest, reqPort) => {
          if (reqPort === port && req?.type === TempleMessageType.ConfirmationRequest && req?.id === id) {
            if (req.confirmed) {
              const result = await withUnlocked(({ vault }) => vault.sign(sourcePkh, bytes, watermark));
              resolve(result);
            } else {
              decline();
            }

            closing = close(closing, port, id, stopTimeout, stopRequestListening, stopDisconnectListening);

            return {
              type: TempleMessageType.ConfirmationResponse
            };
          }
          return undefined;
        });

        const stopDisconnectListening = intercom.onDisconnect(port, declineAndClose);

        // Decline after timeout
        const t = setTimeout(declineAndClose, AUTODECLINE_AFTER);
        const stopTimeout = () => clearTimeout(t);
      })
  );
}

export async function processDApp(origin: string, req: TempleDAppRequest): Promise<TempleDAppResponse | void> {
  switch (req?.type) {
    case TempleDAppMessageType.GetCurrentPermissionRequest:
      return withInited(() => getCurrentPermission(origin));

    case TempleDAppMessageType.PermissionRequest:
      return withInited(() => dAppQueue.enqueue(() => requestPermission(origin, req)));

    case TempleDAppMessageType.OperationRequest:
      return withInited(() => dAppQueue.enqueue(() => requestOperation(origin, req)));

    case TempleDAppMessageType.SignRequest:
      return withInited(() => dAppQueue.enqueue(() => requestSign(origin, req)));

    case TempleDAppMessageType.BroadcastRequest:
      return withInited(() => requestBroadcast(origin, req));
  }
}

interface EvmRequestPayload {
  method: string;
  params: unknown;
}

export async function processEvmDApp(origin: string, payload: EvmRequestPayload, chainId: string, iconUrl?: string) {
  const { method, params } = payload;
  let methodHandler: () => Promise<any>;
  let requiresConfirm = true;

  switch (method) {
    case GET_DEFAULT_WEB3_PARAMS_METHOD_NAME:
      methodHandler = () => getDefaultWeb3Params(origin);
      requiresConfirm = false;
      break;
    case evmRpcMethodsNames.eth_requestAccounts:
      methodHandler = () => connectEvm(origin, chainId, iconUrl);
      break;
    case evmRpcMethodsNames.wallet_watchAsset:
      const validatedParams = addEthAssetPayloadValidationSchema.validateSync(params);
      methodHandler = () => addAsset(origin, chainId, validatedParams);
      break;
    case evmRpcMethodsNames.wallet_addEthereumChain:
      const [chainMetadata] = addEthChainPayloadValidationSchema.validateSync(params);
      methodHandler = () => addChain(origin, chainId, chainMetadata);
      break;
    case evmRpcMethodsNames.wallet_switchEthereumChain:
      const [{ chainId: destinationChainId }] = switchEthChainPayloadValidationSchema.validateSync(params);
      methodHandler = () => switchChain(origin, destinationChainId, false);
      requiresConfirm = false;
      break;
    case evmRpcMethodsNames.eth_signTypedData:
    case evmRpcMethodsNames.eth_signTypedData_v1:
      const [oldTypedData, oldTypedSignerPkh] = ethOldSignTypedDataValidationSchema.validateSync(params);
      methodHandler = () => requestEvmTypedSign(origin, oldTypedSignerPkh, chainId, oldTypedData, iconUrl);
      break;
    case evmRpcMethodsNames.eth_signTypedData_v3:
    case evmRpcMethodsNames.eth_signTypedData_v4:
      const [typedSignerPkh, typedData] = ethSignTypedDataValidationSchema.validateSync(params);
      methodHandler = () => requestEvmTypedSign(origin, typedSignerPkh, chainId, typedData, iconUrl);
      break;
    case evmRpcMethodsNames.personal_sign:
      const [personalSignData, personalSignerPkh] = ethPersonalSignPayloadValidationSchema.validateSync(params);
      methodHandler = () =>
        requestEvmPersonalSign(
          origin,
          personalSignerPkh,
          chainId,
          Buffer.from(personalSignData.slice(2), 'hex').toString('utf8'),
          iconUrl
        );
      break;
    case evmRpcMethodsNames.wallet_getPermissions:
      methodHandler = () => getEvmPermissions(origin);
      requiresConfirm = false;
      break;
    case evmRpcMethodsNames.wallet_requestPermissions:
      const [requestPermissionsPayload] = ethChangePermissionsPayloadValidationSchema.validateSync(params);
      methodHandler = () => requestEvmPermissions(origin, chainId, requestPermissionsPayload, iconUrl);
      break;
    case evmRpcMethodsNames.wallet_revokePermissions:
      const [revokePermissionsPayload] = ethChangePermissionsPayloadValidationSchema.validateSync(params);
      methodHandler = () => revokeEvmPermissions(origin, revokePermissionsPayload);
      break;
    case evmRpcMethodsNames.personal_ecRecover:
      const [message, signature] = personalSignRecoverPayloadValidationSchema.validateSync(params);
      methodHandler = () => recoverEvmMessageAddress(message, signature);
      requiresConfirm = false;
      break;
    default:
      methodHandler = () => handleEvmRpcRequest(origin, payload, chainId);
      requiresConfirm = false;
  }

  return requiresConfirm ? withInited(() => dAppQueue.enqueue(methodHandler)) : methodHandler();
}

export async function getBeaconMessage(origin: string, msg: string, encrypted = false) {
  let recipientPubKey: string | null = null;
  let payload = null;

  if (encrypted) {
    try {
      recipientPubKey = await Beacon.getDAppPublicKey(origin);
      if (!recipientPubKey) throw new Error('<stub>');

      try {
        msg = await Beacon.decryptMessage(msg, recipientPubKey);
      } catch (err: any) {
        await Beacon.removeDAppPublicKey(origin);
        throw err;
      }
    } catch {
      payload = {
        payload: Beacon.encodeMessage<Beacon.Response>({
          version: '2',
          senderId: await Beacon.getSenderId(),
          id: 'stub',
          type: Beacon.MessageType.Disconnect
        })
      };
    }
  }

  let req: Beacon.Request | null;
  try {
    req = Beacon.decodeMessage<Beacon.Request>(msg);
  } catch {
    req = null;
  }

  return {
    recipientPubKey,
    req,
    payload
  };
}

type ProcessedBeaconMessage = {
  payload: string;
  encrypted?: boolean;
};

export function resetExtension(password: string) {
  return withUnlocked(async () => Vault.reset(password));
}

export async function processBeacon(
  origin: string,
  msg: string,
  encrypted = false
): Promise<ProcessedBeaconMessage | undefined> {
  const { req, recipientPubKey, payload } = await getBeaconMessage(origin, msg, encrypted);
  if (payload) {
    return payload;
  }
  if (!req) {
    return;
  }

  // Process Disconnect
  if (req.type === Beacon.MessageType.Disconnect) {
    await removeTezDApps([origin]);
    return;
  }

  const resBase = {
    version: req.version,
    id: req.id,
    ...(req.beaconId ? { beaconId: BEACON_ID } : { senderId: await Beacon.getSenderId() })
  };

  // Process handshake
  if (req.type === Beacon.MessageType.HandshakeRequest) {
    await Beacon.saveDAppPublicKey(origin, req.publicKey);
    const keyPair = await Beacon.getOrCreateKeyPair();
    return {
      payload: await Beacon.sealCryptobox(
        JSON.stringify({
          ...resBase,
          ...Beacon.PAIRING_RESPONSE_BASE,
          publicKey: Beacon.toHex(keyPair.publicKey)
        }),
        Beacon.fromHex(req.publicKey)
      )
    };
  }

  const res = await getBeaconResponse(req, resBase, origin);
  // const res = null;

  const resMsg = Beacon.encodeMessage<Beacon.Response>(res);
  if (encrypted && recipientPubKey) {
    return {
      payload: await Beacon.encryptMessage(resMsg, recipientPubKey),
      encrypted: true
    };
  }
  return { payload: resMsg };
}

const getBeaconResponse = async (req: Beacon.Request, resBase: any, origin: string): Promise<Beacon.Response> => {
  try {
    try {
      return await formatTempleReq(getTempleReq(req), req, resBase, origin);
    } catch (err: any) {
      if (err instanceof TezosOperationError) {
        throw err;
      }

      // Map Temple DApp error to Beacon error
      const beaconErrorType = (() => {
        switch (err?.message) {
          case TempleDAppErrorType.InvalidParams:
            return Beacon.ErrorType.PARAMETERS_INVALID_ERROR;

          case TempleDAppErrorType.NotFound:
          case TempleDAppErrorType.NotGranted:
            return req.beaconId ? Beacon.ErrorType.NOT_GRANTED_ERROR : Beacon.ErrorType.ABORTED_ERROR;

          default:
            return err?.message;
        }
      })();

      throw new Error(beaconErrorType);
    }
  } catch (err: any) {
    return {
      ...resBase,
      type: Beacon.MessageType.Error,
      errorType: (() => {
        switch (true) {
          case err instanceof TezosOperationError:
            return Beacon.ErrorType.TRANSACTION_INVALID_ERROR;

          case err?.message in Beacon.ErrorType:
            return err.message;

          default:
            return Beacon.ErrorType.UNKNOWN_ERROR;
        }
      })(),
      errorData: getErrorData(err)
    };
  }
};

const getTempleReq = (req: Beacon.Request): TempleDAppRequest | void => {
  switch (req.type) {
    case Beacon.MessageType.PermissionRequest:
      const network =
        req.network.type === 'custom'
          ? {
              name: req.network.name!,
              rpc: req.network.rpcUrl!
            }
          : req.network.type;

      return {
        type: TempleDAppMessageType.PermissionRequest,
        network: network,
        appMeta: req.appMetadata,
        force: true
      };

    case Beacon.MessageType.OperationRequest:
      return {
        type: TempleDAppMessageType.OperationRequest,
        sourcePkh: req.sourceAddress,
        opParams: req.operationDetails.map(Beacon.formatOpParams)
      };

    case Beacon.MessageType.SignPayloadRequest:
      return {
        type: TempleDAppMessageType.SignRequest,
        sourcePkh: req.sourceAddress,
        payload: req.signingType === Beacon.SigningType.RAW ? generateRawPayloadBytes(req.payload) : req.payload
      };

    case Beacon.MessageType.BroadcastRequest:
      return {
        type: TempleDAppMessageType.BroadcastRequest,
        signedOpBytes: req.signedTransaction
      };
  }
};

const formatTempleReq = async (
  templeReq: TempleDAppRequest | void,
  req: Beacon.Request,
  resBase: any,
  origin: string
) => {
  if (templeReq) {
    const templeRes = await processDApp(origin, templeReq);

    if (templeRes) {
      // Map Temple DApp response to Beacon response
      switch (templeRes.type) {
        case TempleDAppMessageType.PermissionResponse:
          return {
            ...resBase,
            type: Beacon.MessageType.PermissionResponse,
            publicKey: templeRes.publicKey,
            network: (req as Beacon.PermissionRequest).network,
            scopes: [Beacon.PermissionScope.OPERATION_REQUEST, Beacon.PermissionScope.SIGN]
          };

        case TempleDAppMessageType.OperationResponse:
          return {
            ...resBase,
            type: Beacon.MessageType.OperationResponse,
            transactionHash: templeRes.opHash
          };

        case TempleDAppMessageType.SignResponse:
          return {
            ...resBase,
            type: Beacon.MessageType.SignPayloadResponse,
            signature: templeRes.signature
          };

        case TempleDAppMessageType.BroadcastResponse:
          return {
            ...resBase,
            type: Beacon.MessageType.BroadcastResponse,
            transactionHash: templeRes.opHash
          };
      }
    }
  }

  throw new Error(Beacon.ErrorType.UNKNOWN_ERROR);
};

function getErrorData(err: any) {
  return err instanceof TezosOperationError ? err.errors.map(({ contract_code, ...rest }: any) => rest) : undefined;
}

function generateRawPayloadBytes(payload: string) {
  const bytes = char2Bytes(Buffer.from(payload, 'utf8').toString('hex'));
  // https://tezostaquito.io/docs/signing/
  return `0501${char2Bytes(String(bytes.length))}${bytes}`;
}

const close = (
  closing: boolean,
  port: Runtime.Port,
  id: string,
  stopTimeout: any,
  stopRequestListening: any,
  stopDisconnectListening: any
) => {
  let innerClosing = closing;
  if (innerClosing) return innerClosing;
  innerClosing = true;

  try {
    stopTimeout();
    stopRequestListening();
    stopDisconnectListening();

    intercom.notify(port, {
      type: TempleMessageType.ConfirmationExpired,
      id
    });
  } catch (_err) {}
  return innerClosing;
};
