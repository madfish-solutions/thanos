import { useCallback, useMemo } from 'react';

import { TransactionRequest } from 'viem';

import { toastError } from 'app/toaster';
import { useTypedSWR } from 'lib/swr';
import { estimate as genericEstimate } from 'temple/evm/estimate';
import { useEnabledEvmChains } from 'temple/front';

export type TransactionRequestWithSender = TransactionRequest & { from: string };

export const useEvmEstimationData = (chainId: number, req: TransactionRequestWithSender) => {
  const chains = useEnabledEvmChains();
  const chain = useMemo(() => chains.find(c => c.chainId === chainId)!, [chains, chainId]);

  const estimationSWRKey = useMemo(() => {
    const { from, to, value, data, type } = req;

    return [chainId, JSON.stringify({ from, to, value: value?.toString(), data, type })];
  }, [chainId, req]);

  const estimate = useCallback(async () => {
    try {
      return await genericEstimate(chain, req);
    } catch (err: any) {
      console.warn(err);
      toastError(err.details || err.message);

      return undefined;
    }
  }, [chain, req]);

  return useTypedSWR(estimationSWRKey, estimate, {
    shouldRetryOnError: false,
    dedupingInterval: 10_000
  });
};
