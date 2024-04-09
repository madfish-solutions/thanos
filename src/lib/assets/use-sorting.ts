import { useCallback } from 'react';

import { BigNumber } from 'bignumber.js';

import { useAllAccountBalancesSelector } from 'app/store/tezos/balances/selectors';
import { useGetCurrentAccountTokenOrGasBalanceWithDecimals } from 'lib/balances/hooks';
import { useUsdToTokenRates } from 'lib/fiat-currency/core';
import { ZERO } from 'lib/utils/numbers';
import { useTezosNetwork } from 'temple/front';

export const useTokensSortPredicate = (publicKeyHash: string) => {
  const getBalance = useGetCurrentAccountTokenOrGasBalanceWithDecimals(publicKeyHash);
  const usdToTokenRates = useUsdToTokenRates();

  return useCallback(
    (aSlug: string, bSlug: string) => {
      const aBalance = getBalance(aSlug) ?? ZERO;
      const bBalance = getBalance(bSlug) ?? ZERO;
      const aEquity = aBalance.multipliedBy(usdToTokenRates[aSlug] ?? ZERO);
      const bEquity = bBalance.multipliedBy(usdToTokenRates[bSlug] ?? ZERO);

      if (aEquity.isEqualTo(bEquity)) {
        return bBalance.comparedTo(aBalance);
      }

      return bEquity.comparedTo(aEquity);
    },
    [getBalance, usdToTokenRates]
  );
};

export const useCollectiblesSortPredicate = (publicKeyHash: string) => {
  const { chainId } = useTezosNetwork();

  const balancesRaw = useAllAccountBalancesSelector(publicKeyHash, chainId);

  return useCallback(
    (aSlug: string, bSlug: string) => {
      const aBalance = new BigNumber(balancesRaw[aSlug] ?? ZERO);
      const bBalance = new BigNumber(balancesRaw[bSlug] ?? ZERO);

      return bBalance.comparedTo(aBalance);
    },
    [balancesRaw]
  );
};
