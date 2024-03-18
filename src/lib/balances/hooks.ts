import { useCallback, useMemo } from 'react';

import { emptyFn } from '@rnw-community/shared';
import BigNumber from 'bignumber.js';

import { useAllAccountBalancesSelector, useAllBalancesSelector } from 'app/store/balances/selectors';
import { getKeyForBalancesRecord } from 'app/store/balances/utils';
import { isKnownChainId } from 'lib/apis/tzkt';
import { useAssetMetadata, useGetTokenOrGasMetadata } from 'lib/metadata';
import { useTypedSWR } from 'lib/swr';
import { atomsToTokens } from 'lib/temple/helpers';
import {
  useTezos,
  useTezosNetwork,
  useAccountAddressForTezos,
  useTezosChainIdLoading,
  useOnTezosBlock
} from 'temple/front';
import { buildFastRpcTezosToolkit } from 'temple/tezos';

import { fetchRawBalance as fetchRawBalanceFromBlockchain } from './fetch';

export const useCurrentAccountBalances = (publicKeyHash: string) => {
  const { chainId } = useTezosNetwork();

  return useAllAccountBalancesSelector(publicKeyHash, chainId);
};

export const useGetCurrentAccountTokenOrGasBalanceWithDecimals = (publicKeyHash: string) => {
  const rawBalances = useCurrentAccountBalances(publicKeyHash);
  const getMetadata = useGetTokenOrGasMetadata();

  return useCallback(
    (slug: string) => {
      const rawBalance = rawBalances[slug] as string | undefined;
      const metadata = getMetadata(slug);

      return rawBalance && metadata ? atomsToTokens(new BigNumber(rawBalance), metadata.decimals) : undefined;
    },
    [rawBalances, getMetadata]
  );
};

export function useRawBalance(
  assetSlug: string,
  address: string,
  networkRpc?: string
): {
  value: string | undefined;
  isSyncing: boolean;
  error?: unknown;
  refresh: EmptyFn;
} {
  const currentAccountAddress = useAccountAddressForTezos();
  const nativeTezos = useTezos();
  const nativeRpcUrl = useMemo(() => nativeTezos.rpc.getRpcUrl(), [nativeTezos]);

  const rpcUrl = networkRpc ?? nativeRpcUrl;

  const chainIdSwrRes = useTezosChainIdLoading(rpcUrl);
  const chainId = chainIdSwrRes.data;

  const allBalances = useAllBalancesSelector();
  const balances = useMemo(() => {
    if (!chainId) return null;

    const key = getKeyForBalancesRecord(address, chainId);

    return allBalances[key];
  }, [allBalances, chainId, address]);

  /** Only using store for currently selected account - most used case
   * and with a refresh mechanism in useBalancesLoading hook.
   * Other addresses' balances (e.g. of other user's accounts or contacts)
   * are loaded via SWR from chain.
   */
  const usingStore = address === currentAccountAddress && isKnownChainId(chainId);

  const tezos = useMemo(
    () => (networkRpc ? buildFastRpcTezosToolkit(networkRpc) : nativeTezos),
    [networkRpc, nativeTezos]
  );

  const onChainBalanceSwrRes = useTypedSWR(
    ['balance', tezos.rpc.getRpcUrl(), assetSlug, address],
    () => {
      if (!chainId || usingStore) return;

      return fetchRawBalanceFromBlockchain(tezos, assetSlug, address).then(res => res.toString());
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 20_000
    }
  );

  const refreshChainId = useCallback(() => chainIdSwrRes.mutate(), [chainIdSwrRes.mutate]);
  const refreshBalanceOnChain = useCallback(() => void onChainBalanceSwrRes.mutate(), [onChainBalanceSwrRes.mutate]);

  useOnTezosBlock(refreshBalanceOnChain, tezos, !chainId || usingStore);

  if (!chainId)
    return {
      value: undefined,
      isSyncing: chainIdSwrRes.isValidating,
      error: chainIdSwrRes.error,
      refresh: refreshChainId
    };

  if (usingStore)
    return {
      value: balances?.data[assetSlug],
      isSyncing: balances?.isLoading ?? false,
      error: balances?.error,
      /**
       * Stored balances are already being refreshed as frequently as possible
       * in `useBalancesLoading` hook.
       */
      refresh: emptyFn
    };

  return {
    value: onChainBalanceSwrRes.data,
    isSyncing: onChainBalanceSwrRes.isValidating,
    error: onChainBalanceSwrRes.error,
    refresh: refreshBalanceOnChain
  };
}

/** useTezosBalance */
export function useBalance(assetSlug: string, address: string, networkRpc?: string) {
  const { value: rawValue, isSyncing, error, refresh } = useRawBalance(assetSlug, address, networkRpc);
  const assetMetadata = useAssetMetadata(assetSlug);

  const value = useMemo(
    () => (rawValue && assetMetadata ? atomsToTokens(new BigNumber(rawValue), assetMetadata.decimals) : undefined),
    [rawValue, assetMetadata]
  );

  return { rawValue, value, isSyncing, error, refresh, assetMetadata };
}
