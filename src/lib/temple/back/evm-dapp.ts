import memoizee from 'memoizee';
import { nanoid } from 'nanoid';
import { getAddress, recoverMessageAddress, toHex, WalletPermission } from 'viem';
import browser, { Storage } from 'webextension-polyfill';

import {
  EvmDAppSession,
  getAllDApps,
  getDApp as genericGetDApp,
  removeDApps as genericRemoveDApps,
  setDApp as genericSetDApp
} from 'app/storage/dapps';
import { EVM_TOKEN_SLUG } from 'lib/assets/defaults';
import { BLOCKCHAIN_EXPLORERS_OVERRIDES_STORAGE_KEY, EVM_CHAINS_SPECS_STORAGE_KEY } from 'lib/constants';
import { EvmAssetStandard } from 'lib/evm/types';
import { fetchFromStorage, putToStorage } from 'lib/storage';
import { COLORS } from 'lib/ui/colors';
import { generateEntityNameFromUrl, isTruthy } from 'lib/utils';
import { getReadOnlyEvm } from 'temple/evm';
import { EVMErrorCodes, evmRpcMethodsNames, RETURNED_ACCOUNTS_CAVEAT_NAME } from 'temple/evm/constants';
import { ChainsRpcUrls, EVM_CHAINS_RPC_URLS_STORAGE_KEY, getEvmChainsRpcUrls } from 'temple/evm/evm-chains-rpc-urls';
import { ChangePermissionsPayload, ErrorWithCode } from 'temple/evm/types';
import { BlockExplorer } from 'temple/front/use-block-explorers';
import { EVM_DEFAULT_NETWORKS } from 'temple/networks';
import { TempleChainKind } from 'temple/types';

import { DEFAULT_EVM_CHAINS_SPECS, EvmChainSpecs } from '../chains-specs';
import {
  AddEthereumChainParameter,
  EvmAssetToAddMetadata,
  ETHEREUM_MAINNET_CHAIN_ID,
  EvmChainToAddMetadata,
  TempleEvmDAppPersonalSignPayload,
  TempleEvmDAppSignPayload,
  TempleEvmDAppSignTypedPayload,
  TempleMessageType,
  WatchAssetParameters
} from '../types';

import { intercom } from './defaults';
import { requestConfirm as genericRequestConfirm, RequestConfirmParams } from './request-confirm';
import { settingsUpdated, withUnlocked } from './store';
import { Vault } from './vault';

export async function init() {
  browser.storage.local.onChanged.addListener(
    evmRpcUrlsListener as unknown as SyncFn<Storage.StorageAreaOnChangedChangesType>
  );

  Vault.subscribeToRemoveAccounts(async addresses => {
    const removedAccounts = new Set(addresses.map(({ evmAddress }) => evmAddress).filter(isTruthy));
    const evmDApps = await getAllDApps(TempleChainKind.EVM);
    const dAppsToRemoveOrigins: string[] = [];

    for (const [origin, dApp] of Object.entries(evmDApps)) {
      if (removedAccounts.has(dApp.pkh)) {
        dAppsToRemoveOrigins.push(origin);
      }
    }

    if (dAppsToRemoveOrigins.length) {
      await removeDApps(dAppsToRemoveOrigins);
    }
  });
}

/** Implements a reaction on disabling a chain or removing it, or wallet reset */
async function evmRpcUrlsListener(changes: StringRecord<Storage.StorageChange>) {
  if (!(EVM_CHAINS_RPC_URLS_STORAGE_KEY in changes)) {
    return;
  }

  const { oldValue, newValue } = changes[EVM_CHAINS_RPC_URLS_STORAGE_KEY];

  const oldEvmRpcUrls: ChainsRpcUrls = oldValue ?? {};
  const newEvmRpcUrls: ChainsRpcUrls = newValue ?? {};
  const removedChainsIds = new Set<number>();
  for (const chainId in oldEvmRpcUrls) {
    const newChainRpcUrls = newEvmRpcUrls[chainId];
    if (!newChainRpcUrls || newChainRpcUrls.length === 0) {
      removedChainsIds.add(Number(chainId));
    }
  }

  if (removedChainsIds.size === 0) {
    return;
  }

  const evmDApps = await getAllDApps(TempleChainKind.EVM);
  const dAppsToRemoveOrigins: string[] = [];
  for (const [origin, dApp] of Object.entries(evmDApps)) {
    if (removedChainsIds.has(dApp.chainId)) {
      dAppsToRemoveOrigins.push(origin);
    }
  }

  if (dAppsToRemoveOrigins.length) {
    await removeDApps(dAppsToRemoveOrigins);
    await Promise.all(dAppsToRemoveOrigins.map(origin => switchChain(origin, ETHEREUM_MAINNET_CHAIN_ID, true)));
  }
}

async function requestConfirm(params: Omit<RequestConfirmParams, 'transformPayload'>) {
  return genericRequestConfirm(params);
}

async function getDApp(origin: string) {
  return genericGetDApp(TempleChainKind.EVM, origin);
}

async function setDApp(origin: string, permissions: EvmDAppSession) {
  return genericSetDApp(TempleChainKind.EVM, origin, permissions);
}

export async function removeDApps(origins: string[]) {
  const result = await genericRemoveDApps(TempleChainKind.EVM, origins);
  intercom.broadcast({
    type: TempleMessageType.TempleEvmDAppsDisconnected,
    origins
  });

  return result;
}

function getAppMeta(origin: string, icon?: string) {
  return { name: new URL(origin).hostname, icon };
}

function makeReadAccountPermission(pkh: string, origin: string): WalletPermission {
  return {
    caveats: [
      {
        type: RETURNED_ACCOUNTS_CAVEAT_NAME,
        value: [pkh]
      }
    ],
    date: Date.now(),
    id: nanoid(),
    invoker: origin as WalletPermission['invoker'],
    parentCapability: evmRpcMethodsNames.eth_accounts
  };
}

export const getDefaultWeb3Params = async (origin: string) => {
  const dApp = await getDApp(origin);
  const chainId = dApp?.chainId ?? ETHEREUM_MAINNET_CHAIN_ID;

  return { chainId: toHex(chainId), accounts: dApp?.pkh ? [dApp.pkh.toLowerCase()] : [] };
};

export const connectEvm = async (origin: string, chainId: string, icon?: string) => {
  return new Promise<HexString[]>(async (resolve, reject) => {
    const id = nanoid();
    await assertiveGetChainRpcURLs(Number(chainId));
    const appMeta = getAppMeta(origin, icon);

    await requestConfirm({
      id,
      payload: {
        type: 'connect',
        chainType: TempleChainKind.EVM,
        origin,
        chainId,
        appMeta
      },
      onDecline: () => {
        reject(new ErrorWithCode(EVMErrorCodes.USER_REJECTED_REQUEST, 'Connection declined'));
      },
      handleIntercomRequest: async (confirmReq, decline) => {
        if (confirmReq?.type === TempleMessageType.DAppPermConfirmationRequest && confirmReq?.id === id) {
          const { confirmed, accountPublicKeyHash } = confirmReq;
          if (confirmed && accountPublicKeyHash) {
            const lowercasePkh = accountPublicKeyHash.toLowerCase() as HexString;
            await setDApp(origin, {
              chainId: Number(chainId),
              appMeta,
              pkh: accountPublicKeyHash,
              permissions: [makeReadAccountPermission(lowercasePkh, origin)]
            });
            resolve([lowercasePkh]);
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
};

export const addAsset = async (origin: string, currentChainId: string, params: WatchAssetParameters) =>
  new Promise(async (resolve, reject) => {
    const id = nanoid();

    const dApp = await getDApp(origin);

    if (!dApp) {
      reject(new ErrorWithCode(EVMErrorCodes.NOT_AUTHORIZED, 'DApp not found'));

      return;
    }

    if (params.type !== 'ERC20') {
      reject(new ErrorWithCode(EVMErrorCodes.INVALID_PARAMS, `Asset type not supported. Received: ${params.type}`));

      return;
    }

    const assetMetadata: EvmAssetToAddMetadata = {
      ...params.options,
      chainId: params.options.chainId ?? Number(currentChainId)
    };

    await requestConfirm({
      id,
      payload: {
        chainType: TempleChainKind.EVM,
        type: 'add_asset',
        metadata: assetMetadata,
        chainId: currentChainId,
        origin,
        appMeta: dApp.appMeta
      },
      onDecline: () => {
        reject(new ErrorWithCode(EVMErrorCodes.USER_REJECTED_REQUEST, 'Asset adding declined'));
      },
      handleIntercomRequest: async (confirmReq, decline) => {
        if (confirmReq?.type === TempleMessageType.DAppAddEvmAssetRequest && confirmReq.id === id) {
          if (confirmReq.confirmed) {
            resolve(null);
          } else {
            decline();
          }

          return {
            type: TempleMessageType.DAppAddEvmAssetResponse
          };
        }

        return undefined;
      }
    });
  });

export const addChain = async (origin: string, currentChainId: string, params: AddEthereumChainParameter) =>
  new Promise(async (resolve, reject) => {
    const id = nanoid();

    const dApp = await getDApp(origin);

    if (!dApp) {
      reject(new ErrorWithCode(EVMErrorCodes.NOT_AUTHORIZED, 'DApp not found'));

      return;
    }

    const rpcUrl = params.rpcUrls.find(url => url.startsWith('https'));

    if (!rpcUrl) {
      reject(
        new ErrorWithCode(
          EVMErrorCodes.INVALID_PARAMS,
          `Expected array with at least one valid string HTTPS URL 'rpcUrls'. Received: ${params.rpcUrls}`
        )
      );

      return;
    }

    const chainMetadata: EvmChainToAddMetadata = {
      chainId: params.chainId,
      name: params.chainName,
      nativeCurrency: params.nativeCurrency,
      rpcUrl,
      blockExplorerUrl: params.blockExplorerUrls?.at(0)
    };

    await requestConfirm({
      id,
      payload: {
        chainType: TempleChainKind.EVM,
        type: 'add_chain',
        metadata: chainMetadata,
        chainId: currentChainId,
        origin,
        appMeta: dApp.appMeta
      },
      onDecline: () => {
        reject(new ErrorWithCode(EVMErrorCodes.USER_REJECTED_REQUEST, 'Chain adding declined'));
      },
      handleIntercomRequest: async (confirmReq, decline) => {
        if (confirmReq?.type === TempleMessageType.DAppAddEvmChainRequest && confirmReq.id === id) {
          if (confirmReq.confirmed) {
            await withUnlocked(async ({ vault }) => {
              const chainIdNum = Number(chainMetadata.chainId);

              const prevStoredSpecs = await fetchFromStorage(EVM_CHAINS_SPECS_STORAGE_KEY);
              const prevSpecsWithFallback = prevStoredSpecs ?? {};

              if (!prevSpecsWithFallback[chainIdNum] && !DEFAULT_EVM_CHAINS_SPECS[chainIdNum]) {
                const newChainSpec: EvmChainSpecs = {
                  name: chainMetadata.name,
                  currency: {
                    address: EVM_TOKEN_SLUG,
                    standard: EvmAssetStandard.NATIVE,
                    ...chainMetadata.nativeCurrency
                  },
                  testnet: confirmReq.testnet
                };

                await putToStorage(EVM_CHAINS_SPECS_STORAGE_KEY, {
                  ...prevSpecsWithFallback,
                  [chainIdNum]: newChainSpec
                });
              }

              const settings = await vault.fetchSettings();
              const customEvmNetworks = settings.customEvmNetworks ?? [];

              if (
                !customEvmNetworks.some(n => n.rpcBaseURL === rpcUrl) &&
                !EVM_DEFAULT_NETWORKS.some(n => n.rpcBaseURL === rpcUrl)
              ) {
                console.log(2);
                const updatedSettings = await vault.updateSettings({
                  customEvmNetworks: [
                    ...customEvmNetworks,
                    {
                      id,
                      name: chainMetadata.name,
                      chain: TempleChainKind.EVM,
                      chainId: chainIdNum,
                      color: COLORS[Math.floor(Math.random() * COLORS.length)],
                      rpcBaseURL: rpcUrl,
                      default: false
                    }
                  ]
                });

                settingsUpdated(updatedSettings);
              }

              if (chainMetadata.blockExplorerUrl) {
                const prevBlockExplorersOverrides = await fetchFromStorage(BLOCKCHAIN_EXPLORERS_OVERRIDES_STORAGE_KEY);
                const evmExplorers = prevBlockExplorersOverrides?.[TempleChainKind.EVM] ?? {};
                const chainExplorers = evmExplorers?.[chainIdNum] ?? [];

                if (!chainExplorers.some(({ url }: BlockExplorer) => url === chainMetadata.blockExplorerUrl)) {
                  const newBlockExplorer: BlockExplorer = {
                    id,
                    name: generateEntityNameFromUrl(chainMetadata.blockExplorerUrl),
                    url: chainMetadata.blockExplorerUrl,
                    default: false
                  };

                  await putToStorage(BLOCKCHAIN_EXPLORERS_OVERRIDES_STORAGE_KEY, {
                    ...prevBlockExplorersOverrides,
                    [TempleChainKind.EVM]: {
                      ...evmExplorers,
                      [chainIdNum]: [...chainExplorers, newBlockExplorer]
                    }
                  });
                }
              }
            });

            resolve(null);
          } else {
            decline();
          }

          return {
            type: TempleMessageType.DAppAddEvmChainResponse
          };
        }

        return undefined;
      }
    });
  });

export const switchChain = async (origin: string, destinationChainId: number, isInternal: boolean) => {
  await assertiveGetChainRpcURLs(destinationChainId);

  const dApp = await getDApp(origin);

  if (dApp) {
    await setDApp(origin, { ...dApp, chainId: destinationChainId });
  }

  if (isInternal) {
    intercom.broadcast({
      type: TempleMessageType.TempleEvmChainSwitched,
      origin,
      chainId: destinationChainId
    });
  }

  return toHex(destinationChainId);
};

const makeRequestEvmSignFunction =
  <T extends TempleEvmDAppSignPayload>(
    payloadType: T['type'],
    signDataWithValue: (
      vault: Vault,
      payload: T['payload'],
      signerPkh: HexString,
      connectedChainId: string
    ) => Promise<HexString>
  ) =>
  (origin: string, rawSourcePkh: HexString, chainId: string, payload: T['payload'], icon?: string) =>
    new Promise<HexString>(async (resolve, reject) => {
      const id = nanoid();
      const sourcePkh = getAddress(rawSourcePkh);

      const dApp = await getDApp(origin);

      if (!dApp) {
        reject(new ErrorWithCode(EVMErrorCodes.NOT_AUTHORIZED, 'DApp not found'));

        return;
      }

      await requestConfirm({
        id,
        payload: {
          chainType: TempleChainKind.EVM,
          type: payloadType,
          sourcePkh,
          payload,
          chainId,
          origin,
          appMeta: { name: new URL(origin).hostname, icon }
        } as T,
        onDecline: () => {
          reject(new ErrorWithCode(EVMErrorCodes.USER_REJECTED_REQUEST, 'Signature declined'));
        },
        handleIntercomRequest: async (confirmReq, decline) => {
          if (confirmReq?.type === TempleMessageType.DAppSignConfirmationRequest && confirmReq.id === id) {
            if (confirmReq.confirmed) {
              const result = await withUnlocked(({ vault }) => signDataWithValue(vault, payload, sourcePkh, chainId));
              resolve(result);
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
    });

export const requestEvmTypedSign = makeRequestEvmSignFunction<TempleEvmDAppSignTypedPayload>(
  'sign_typed',
  (vault, typedData, signerPkh, connectedChainId) => {
    if (
      !Array.isArray(typedData) &&
      typedData.domain?.chainId !== undefined &&
      typedData.domain?.chainId !== Number(connectedChainId)
    ) {
      throw new ErrorWithCode(
        EVMErrorCodes.CHAIN_DISCONNECTED,
        'Cannot sign payload with other chain ID than the current one'
      );
    }

    return vault.signEvmTypedData(signerPkh, typedData);
  }
);

export const requestEvmPersonalSign = makeRequestEvmSignFunction<TempleEvmDAppPersonalSignPayload>(
  'personal_sign',
  (vault, message, signerPkh) => vault.signEvmMessage(signerPkh, message)
);

export const getEvmPermissions = async (origin: string) => {
  const dApp = await getDApp(origin);

  return dApp?.permissions ?? [];
};

export const revokeEvmPermissions = async (origin: string, _payload: ChangePermissionsPayload) => {
  // TODO: add handling other permissions than for reading accounts
  await removeDApps([origin]);

  return {};
};

export const requestEvmPermissions = async (
  origin: string,
  chainId: string,
  _payload: ChangePermissionsPayload,
  icon?: string
) => {
  // TODO: add handling other permissions than for reading accounts
  const accounts = await connectEvm(origin, chainId, icon);

  return [makeReadAccountPermission(accounts[0], origin)];
};

export const recoverEvmMessageAddress = async (message: HexString, signature: HexString) =>
  (
    await recoverMessageAddress({ message: Buffer.from(message.slice(2), 'hex').toString('utf8'), signature })
  ).toLowerCase();

const makeChainIdRequest = memoizee(
  async (chainId: number) => {
    const rpcUrls = await assertiveGetChainRpcURLs(chainId);
    const evmToolkit = getReadOnlyEvm(rpcUrls);

    return evmToolkit.request({ method: evmRpcMethodsNames.eth_chainId });
  },
  { promise: true, maxAge: 200 }
);

export const handleEvmRpcRequest = async (origin: string, payload: any, chainId: string) => {
  const requestChainId = Number(chainId);
  const dApp = await getDApp(origin);

  if (dApp && dApp.chainId !== requestChainId) {
    throw new ErrorWithCode(EVMErrorCodes.CHAIN_DISCONNECTED, 'DApp chain ID does not match the connected chain ID');
  }

  try {
    if (payload.method === evmRpcMethodsNames.eth_chainId) {
      return await makeChainIdRequest(requestChainId);
    }

    const rpcUrls = await assertiveGetChainRpcURLs(requestChainId);
    const evmToolkit = getReadOnlyEvm(rpcUrls);

    return await evmToolkit.request(payload);
  } catch (err) {
    if (typeof err === 'object' && err && 'code' in err) {
      throw new ErrorWithCode(
        Number(err.code),
        'message' in err && typeof err.message === 'string' ? err.message : 'Unexpected error'
      );
    }

    throw err;
  }
};

/** Throws an error if the chain is unknown; otherwise, returns a list of known RPC URLs for the chain */
const assertiveGetChainRpcURLs = async (chainId: number) => {
  const rpcUrls = (await getEvmChainsRpcUrls())[chainId];

  if (!rpcUrls) {
    throw new ErrorWithCode(EVMErrorCodes.CHAIN_NOT_RECOGNIZED, 'Network not found');
  }

  return rpcUrls;
};
