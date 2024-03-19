import { useCallback, useMemo } from 'react';

import { useRetryableSWR } from 'lib/swr';
import { useNetwork, useStoredAccount, useAccountAddress, useAllAccounts, useTezos } from 'lib/temple/front/ready';
import { TempleAccountType, TempleTezosChainId } from 'lib/temple/types';
import { TempleChainName } from 'temple/types';

import { getAccountAddressOfChain } from '../accounts';
import { loadTezosChainId } from '../tezos';

export { useTezos };
export { useOnTezosBlock } from './use-block';

// @ts-expect-error
// ts-prune-ignore-next
interface TezosNetwork {
  rpcUrl: string;
  chainId: string;
  isMainnet: boolean;
}

/** (!) Relies on suspense - use only in PageLayout descendant components. */
export const useTezosNetwork = () => {
  const { rpcBaseURL: rpcUrl } = useNetwork();
  const chainId = useTezosChainIdLoadingValue(rpcUrl, true)!;

  return useMemo(
    () => ({
      rpcUrl,
      chainId: chainId,
      isMainnet: chainId === TempleTezosChainId.Mainnet,
      isDcp: chainId === TempleTezosChainId.Dcp || chainId === TempleTezosChainId.DcpTest
    }),
    [rpcUrl, chainId]
  );
};

// ts-prune-ignore-next
export const useEvmNetwork = () => {
  return useMemo(
    () => ({
      //
    }),
    []
  );
};

export const useTezosNetworkRpcUrl = () => useNetwork().rpcBaseURL;

/** (!) Relies on suspense - use only in PageLayout descendant components. */
// @ts-expect-error
const useTezosNetworkChainId = () => {
  const rpcURL = useTezosNetworkRpcUrl();

  return useTezosChainIdLoadingValue(rpcURL, true)!;
};

// export { useStoredAccount as useAccount };
export const useAccount = useStoredAccount;

// ts-prune-ignore-next
export const useAccountForTezos = () => useAccountForChain(TempleChainName.Tezos);
// ts-prune-ignore-next
export const useAccountForEvm = () => useAccountForChain(TempleChainName.EVM);

function useAccountForChain(chain: TempleChainName) {
  const storedAccount = useStoredAccount();

  if (storedAccount.type === TempleAccountType.WatchOnly) {
    if (storedAccount.chain !== chain) return undefined;
    // TODO: if (storedAccount.chainId && chainId !== storedAccount.chainId) return undefined; ?

    return storedAccount;
  }

  if (storedAccount.type === TempleAccountType.Imported) {
    if (storedAccount.chain !== chain) return undefined;

    return storedAccount;
  }

  if (chain === 'evm') return storedAccount.evmAddress ? storedAccount : undefined;

  return storedAccount;
}

// ts-prune-ignore-next
export { useAccountAddress };

export const useAccountAddressForTezos = () => useAccountAddressForChain(TempleChainName.Tezos);
export const useAccountAddressForEvm = () => useAccountAddressForChain(TempleChainName.EVM);

function useAccountAddressForChain(chain: TempleChainName): string | undefined {
  const storedAccount = useStoredAccount();

  return useMemo(() => getAccountAddressOfChain(storedAccount, chain), [storedAccount, chain]);
}

export function useTezosRelevantAccounts(tezosChainId: string) {
  const allAccounts = useAllAccounts();

  return useMemo(
    () =>
      allAccounts.filter(acc => {
        switch (acc.type) {
          case TempleAccountType.ManagedKT:
            return acc.chainId === tezosChainId;

          case TempleAccountType.WatchOnly:
            return !acc.chainId || acc.chainId === tezosChainId;

          default:
            return true;
        }
      }),
    [tezosChainId, allAccounts]
  );
}

// export function useTezosChainIdLoadingValue(rpcUrl: string): string | undefined;
// export function useTezosChainIdLoadingValue(rpcUrl: string, suspense: boolean): string | undefined;
// export function useTezosChainIdLoadingValue(rpcUrl: string, suspense: false): string | undefined;
// export function useTezosChainIdLoadingValue(rpcUrl: string, suspense: true): string;
export function useTezosChainIdLoadingValue(rpcUrl: string, suspense?: boolean): string | undefined {
  const { data: chainId } = useTezosChainIdLoading(rpcUrl, suspense);

  return chainId;
}

export function useTezosChainIdLoading(rpcUrl: string, suspense?: boolean) {
  const fetchChainId = useCallback(() => loadTezosChainId(rpcUrl), [rpcUrl]);

  return useRetryableSWR(['chain-id', rpcUrl], fetchChainId, { suspense, revalidateOnFocus: false });
}
