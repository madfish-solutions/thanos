import { nanoid } from 'nanoid';
import { formatTransactionRequest, getAddress, Hash, recoverMessageAddress, toHex, TransactionRequest } from 'viem';

import { EVM_TOKEN_SLUG } from 'lib/assets/defaults';
import { BLOCKCHAIN_EXPLORERS_OVERRIDES_STORAGE_KEY, EVM_CHAINS_SPECS_STORAGE_KEY } from 'lib/constants';
import { EvmAssetStandard } from 'lib/evm/types';
import { fetchFromStorage, putToStorage } from 'lib/storage';
import { DEFAULT_EVM_CHAINS_SPECS, EvmChainSpecs } from 'lib/temple/chains-specs';
import { getRandomColor } from 'lib/ui/colors';
import { generateEntityNameFromUrl } from 'lib/utils';
import { serializeError } from 'lib/utils/serialize-error';
import { getReadOnlyEvm } from 'temple/evm';
import { EVMErrorCodes, evmRpcMethodsNames } from 'temple/evm/constants';
import { estimate } from 'temple/evm/estimate';
import { getActiveEvmChainsRpcUrls } from 'temple/evm/evm-chains-rpc-urls';
import { ChangePermissionsPayload, ErrorWithCode } from 'temple/evm/types';
import { parseTransactionRequest, serializeBigints } from 'temple/evm/utils';
import { DEFAULT_EVM_CURRENCY, EVM_DEFAULT_NETWORKS } from 'temple/networks';
import { TempleChainKind } from 'temple/types';

import {
  AddEthereumChainParameter,
  BlockExplorer,
  ETHEREUM_MAINNET_CHAIN_ID,
  EvmAssetToAddMetadata,
  EvmChainToAddMetadata,
  TempleEvmDAppPersonalSignPayload,
  TempleEvmDAppSignTypedPayload,
  TempleEvmDAppTransactionPayload,
  TempleMessageType,
  WatchAssetParameters
} from '../../types';
import { settingsUpdated, withUnlocked } from '../store';

import {
  assertDAppChainId,
  assertiveGetChainRpcURLs,
  checkDApp,
  getAppMeta,
  getDApp,
  getGasPrice,
  makeChainIdRequest,
  makeReadAccountPermission,
  makeRequestEvmSignFunction,
  networkSupportsEIP1559,
  removeDApps,
  requestConfirm,
  setDApp
} from './utils';

export async function getDefaultWeb3Params(origin: string) {
  const dApp = await getDApp(origin);
  const chainId = dApp?.chainId ?? ETHEREUM_MAINNET_CHAIN_ID;

  return { chainId: toHex(chainId), accounts: dApp?.pkh ? [dApp.pkh.toLowerCase()] : [] };
}

export const connectEvm = async (origin: string, chainId: string, icon?: string) => {
  return new Promise<HexString[]>(async (resolve, reject) => {
    await assertiveGetChainRpcURLs(Number(chainId));
    const id = nanoid();
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

export const requestEvmTypedSign = makeRequestEvmSignFunction<TempleEvmDAppSignTypedPayload>(
  'sign_typed',
  (vault, typedData, signerPkh, connectedChainId) => {
    if (
      !Array.isArray(typedData) &&
      typedData.domain?.chainId !== undefined &&
      typedData.domain.chainId !== Number(connectedChainId)
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

export const handleEvmRpcRequest = async (origin: string, payload: any, chainId: string) => {
  await assertDAppChainId(origin, chainId);

  try {
    const requestChainId = Number(chainId);
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

export const sendEvmTransactionAfterConfirm = async (
  origin: string,
  chainId: string,
  req: TransactionRequest,
  iconUrl?: string
) => {
  const sourcePkh = getAddress(req.from!);
  await checkDApp(origin, sourcePkh);
  await assertDAppChainId(origin, chainId);
  const id = nanoid();
  const parsedChainId = Number(chainId);
  const rpcUrls = await assertiveGetChainRpcURLs(parsedChainId);
  const rpcBaseURL = (await getActiveEvmChainsRpcUrls())[parsedChainId] ?? rpcUrls[0];
  let modifiedReq = req;
  const eip1559Supported = await networkSupportsEIP1559(rpcBaseURL);
  try {
    if (eip1559Supported && (req.type === 'legacy' || (req.gasPrice && !req.authorizationList && !req.accessList))) {
      const { gasPrice, ...restProps } = req;
      modifiedReq = {
        ...restProps,
        type: 'eip1559',
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: gasPrice
      };
    } else if (
      eip1559Supported &&
      (req.type === 'eip2930' || (req.gasPrice && (req.authorizationList || req.accessList)))
    ) {
      const { gasPrice, ...restProps } = req;
      modifiedReq = {
        ...restProps,
        type: 'eip7702',
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: gasPrice
      };
    } else if (
      !eip1559Supported &&
      !req.accessList &&
      (req.type === 'eip1559' || req.maxFeePerGas || req.maxPriorityFeePerGas)
    ) {
      const {
        maxFeePerBlobGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        authorizationList,
        accessList,
        blobs,
        blobVersionedHashes,
        kzg,
        sidecars,
        ...restProps
      } = req;
      modifiedReq = {
        ...restProps,
        type: 'legacy',
        gasPrice: maxFeePerGas ?? maxPriorityFeePerGas
      };
    } else if (!eip1559Supported && (req.accessList || req.type === 'eip7702')) {
      const {
        maxFeePerBlobGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        blobs,
        blobVersionedHashes,
        kzg,
        sidecars,
        authorizationList,
        ...restProps
      } = req;
      modifiedReq = {
        ...restProps,
        type: 'eip2930',
        gasPrice: maxFeePerGas ?? maxPriorityFeePerGas
      };
    } else if (
      req.type === undefined &&
      !req.gasPrice &&
      !req.maxFeePerGas &&
      !req.maxPriorityFeePerGas &&
      req.authorizationList &&
      eip1559Supported
    ) {
      modifiedReq.type = 'eip7702';
    } else if (req.type === undefined && !req.gasPrice && !req.maxFeePerGas && !req.maxPriorityFeePerGas) {
      modifiedReq.type = eip1559Supported ? 'eip1559' : req.accessList ? 'eip2930' : 'legacy';
    }
  } catch (e) {
    console.error(e);
  }
  let estimationData: TempleEvmDAppTransactionPayload['estimationData'];
  let error: string | null | undefined;

  try {
    estimationData = serializeBigints(
      await estimate(
        {
          rpcUrl: rpcBaseURL,
          chain: {
            id: parsedChainId,
            rpcUrls: { default: { http: [rpcBaseURL] } },
            // The two fields below are just for type compatibility
            name: '',
            nativeCurrency: DEFAULT_EVM_CURRENCY
          }
        },
        modifiedReq
      )
    );
  } catch (e) {
    console.error(e);
    try {
      estimationData = { gasPrice: await getGasPrice(rpcBaseURL), type: eip1559Supported ? 'eip1559' : 'legacy' };
    } catch (e) {
      console.error(e);
    }
    error = serializeError(e);
  }

  return new Promise<Hash>(async (resolve, reject) => {
    await requestConfirm({
      id,
      payload: {
        type: 'confirm_operations',
        req: { ...formatTransactionRequest(modifiedReq), from: sourcePkh },
        chainId,
        chainType: TempleChainKind.EVM,
        origin,
        appMeta: getAppMeta(origin, iconUrl),
        estimationData,
        error
      },
      onDecline: () => {
        reject(new ErrorWithCode(EVMErrorCodes.USER_REJECTED_REQUEST, 'Transaction declined'));
      },
      handleIntercomRequest: async (confirmReq, decline) => {
        if (confirmReq?.type === TempleMessageType.DAppEvmOpsConfirmationRequest && confirmReq.id === id) {
          const { confirmed, modifiedReq } = confirmReq;
          if (confirmed) {
            const result = await withUnlocked(({ vault }) =>
              vault.sendEvmTransaction(
                sourcePkh,
                {
                  chainId: parsedChainId,
                  name: '',
                  currency: DEFAULT_EVM_CURRENCY,
                  rpcBaseURL
                },
                parseTransactionRequest(modifiedReq)
              )
            );
            resolve(result);
          } else {
            decline();
          }

          return {
            type: TempleMessageType.DAppOpsConfirmationResponse
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
                const updatedSettings = await vault.updateSettings({
                  customEvmNetworks: [
                    ...customEvmNetworks,
                    {
                      id,
                      name: chainMetadata.name,
                      chain: TempleChainKind.EVM,
                      chainId: chainIdNum,
                      color: getRandomColor(),
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
