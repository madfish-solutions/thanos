import { useCallback, useMemo } from 'react';

import BigNumber from 'bignumber.js';

import { fetchBalance } from 'lib/balances';
import { TOKENS_SYNC_INTERVAL } from 'lib/fixed-times';
import { useAssetMetadata } from 'lib/metadata';
import { useRetryableSWR } from 'lib/swr';
import { michelEncoder, loadFastRpcClient } from 'lib/temple/helpers';
import { useInterval } from 'lib/ui/hooks';

import { useTezos, ReactiveTezosToolkit } from './ready';

type UseBalanceOptions = {
  suspense?: boolean;
  networkRpc?: string;
  displayed?: boolean;
  initial?: BigNumber;
};

export function useBalance(assetSlug: string, address: string, opts: UseBalanceOptions = {}) {
  const nativeTezos = useTezos();
  const assetMetadata = useAssetMetadata(assetSlug);

  const tezos = useMemo(() => {
    if (opts.networkRpc) {
      const rpc = opts.networkRpc;
      const t = new ReactiveTezosToolkit(loadFastRpcClient(rpc), rpc);
      t.setPackerProvider(michelEncoder);
      return t;
    }
    return nativeTezos;
  }, [opts.networkRpc, nativeTezos]);

  const fetchBalanceLocal = useCallback(async () => {
    if (assetMetadata) return fetchBalance(tezos, assetSlug, address, assetMetadata);
    throw new Error('Metadata missing, when fetching balance');
  }, [tezos, address, assetSlug, assetMetadata]);

  const displayed = opts.displayed ?? true;

  const result = useRetryableSWR(displayed ? getBalanceSWRKey(tezos, assetSlug, address) : null, fetchBalanceLocal, {
    suspense: opts.suspense ?? true,
    revalidateOnFocus: false,
    dedupingInterval: 20_000,
    fallbackData: opts.initial
  });

  useInterval(() => displayed && result.mutate(), TOKENS_SYNC_INTERVAL, [displayed], false);

  return result;
}

export function getBalanceSWRKey(tezos: ReactiveTezosToolkit, assetSlug: string, address: string) {
  return ['balance', tezos.checksum, assetSlug, address];
}
