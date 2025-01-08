import memoizee from 'memoizee';
import { nanoid } from 'nanoid';
import { getAddress, toHex, WalletPermission } from 'viem';

import {
  EvmDAppSession,
  getDApp as genericGetDApp,
  setDApp as genericSetDApp,
  removeDApps as genericRemoveDApps,
  getAllDApps as genericGetAllDApps
} from 'app/storage/dapps';
import { getReadOnlyEvm } from 'temple/evm';
import { EVMErrorCodes, evmRpcMethodsNames, RETURNED_ACCOUNTS_CAVEAT_NAME } from 'temple/evm/constants';
import { getEvmChainsRpcUrls } from 'temple/evm/evm-chains-rpc-urls';
import { ErrorWithCode } from 'temple/evm/types';
import { TempleChainKind } from 'temple/types';

import { TempleEvmDAppPayload, TempleEvmDAppSignPayload, TempleMessageType } from '../../types';
import { intercom } from '../defaults';
import { requestConfirm as genericRequestConfirm, RequestConfirmParams } from '../request-confirm';
import { withUnlocked } from '../store';
import { Vault } from '../vault';

export function getAllDApps() {
  return genericGetAllDApps(TempleChainKind.EVM);
}

export async function removeDApps(origins: string[]) {
  const result = await genericRemoveDApps(TempleChainKind.EVM, origins);
  intercom.broadcast({
    type: TempleMessageType.TempleEvmDAppsDisconnected,
    origins
  });

  return result;
}

export async function getDApp(origin: string) {
  return genericGetDApp(TempleChainKind.EVM, origin);
}

export async function setDApp(origin: string, permissions: EvmDAppSession) {
  return genericSetDApp(TempleChainKind.EVM, origin, permissions);
}

/** Throws an error if the chain is unknown; otherwise, returns a list of known RPC URLs for the chain */
export async function assertiveGetChainRpcURLs(chainId: number) {
  const rpcUrls = (await getEvmChainsRpcUrls())[chainId];

  if (!rpcUrls) {
    throw new ErrorWithCode(EVMErrorCodes.CHAIN_NOT_RECOGNIZED, 'Network not found');
  }

  return rpcUrls;
}

export async function switchChain(origin: string, destinationChainId: number, isInternal: boolean) {
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
}

export async function requestConfirm(params: Omit<RequestConfirmParams<TempleEvmDAppPayload>, 'transformPayload'>) {
  return genericRequestConfirm(params);
}

export function getAppMeta(origin: string, icon?: string) {
  return { name: new URL(origin).hostname, icon };
}

export function makeReadAccountPermission(pkh: string, origin: string): WalletPermission {
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

export function makeRequestEvmSignFunction<T extends TempleEvmDAppSignPayload>(
  payloadType: T['type'],
  signDataWithValue: (
    vault: Vault,
    payload: T['payload'],
    signerPkh: HexString,
    connectedChainId: string
  ) => Promise<HexString>
) {
  return async (origin: string, rawSourcePkh: HexString, chainId: string, payload: T['payload'], icon?: string) => {
    await checkDApp(origin, rawSourcePkh);
    const id = nanoid();
    const sourcePkh = getAddress(rawSourcePkh);

    return new Promise<HexString>(async (resolve, reject) => {
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
  };
}

/** Throws an error if the dApp is not connected or the connected account does not match the specified one; otherwise,
 *  returns the dApp object
 */
export async function checkDApp(origin: string, account: string) {
  const dApp = await getDApp(origin);

  if (!dApp) {
    throw new ErrorWithCode(EVMErrorCodes.NOT_AUTHORIZED, 'DApp not found');
  }

  if (getAddress(account) !== getAddress(dApp.pkh)) {
    throw new ErrorWithCode(EVMErrorCodes.NOT_AUTHORIZED, 'Account is not connected');
  }

  return dApp;
}

/** Throws an error if a dApp is connected but to another chain than `chainId` */
export async function assertDAppChainId(origin: string, chainId: string) {
  const requestChainId = Number(chainId);

  const dApp = await getDApp(origin);
  if (dApp && dApp.chainId !== requestChainId) {
    throw new ErrorWithCode(EVMErrorCodes.CHAIN_DISCONNECTED, 'DApp chain ID does not match the connected chain ID');
  }
}

export const makeChainIdRequest = memoizee(
  async (chainId: number) => {
    const rpcUrls = await assertiveGetChainRpcURLs(chainId);
    const evmToolkit = getReadOnlyEvm(rpcUrls);

    return evmToolkit.request({ method: evmRpcMethodsNames.eth_chainId });
  },
  { promise: true, maxAge: 200 }
);

export const networkSupportsEIP1559 = memoizee(
  async (rpcBaseURL: string) => {
    const evmToolkit = getReadOnlyEvm(rpcBaseURL);
    const block = await evmToolkit.getBlock({ includeTransactions: false, blockTag: 'latest' });

    return Boolean(block.baseFeePerGas);
  },
  { promise: true, maxAge: 60 * 1000 }
);
