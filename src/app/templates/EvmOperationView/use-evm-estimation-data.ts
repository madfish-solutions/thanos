import { useCallback, useMemo } from 'react';

import BigNumber from 'bignumber.js';
import { TransactionRequest } from 'viem';

import { EVM_TOKEN_SLUG } from 'lib/assets/defaults';
import { useEvmTokenBalance } from 'lib/balances/hooks';
import { useTypedSWR } from 'lib/swr';
import { checkZeroBalance } from 'lib/utils/check-zero-balance';
import { estimate as genericEstimate } from 'temple/evm/estimate';
import { useAllEvmChains } from 'temple/front';

type TransactionRequestWithSender = TransactionRequest & { from: string };

export const useEvmEstimationData = (chainId: number, req: TransactionRequestWithSender) => {
  const chains = useAllEvmChains();
  const chain = useMemo(() => Object.values(chains).find(c => c.chainId === chainId)!, [chains, chainId]);

  const { value: ethBalance } = useEvmTokenBalance(EVM_TOKEN_SLUG, req.from, chain);

  const estimationSWRKey = useMemo(() => {
    const { from, to, value, data, type } = req;

    return [chainId, JSON.stringify({ from, to, value: value?.toString(), data, type })];
  }, [chainId, req]);

  const estimate = useCallback(async () => {
    try {
      if (ethBalance) {
        checkZeroBalance(new BigNumber(Infinity), ethBalance, false);
      }

      return await genericEstimate(chain, req);
    } catch (err: any) {
      console.warn(err);

      throw err;
    }
  }, [chain, ethBalance, req]);

  return useTypedSWR(estimationSWRKey, estimate, {
    shouldRetryOnError: false,
    dedupingInterval: 10_000
  });
};
