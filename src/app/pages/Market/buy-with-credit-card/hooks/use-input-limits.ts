import { useMemo } from 'react';

import { isDefined } from '@rnw-community/shared';

import { usePairLimitsSelector, useProviderPairLimitsSelector } from 'app/store/buy-with-credit-card/selectors';
import { TopUpProviderId } from 'lib/buy-with-credit-card/top-up-provider-id.enum';
import { TopUpProviderPairLimits } from 'lib/buy-with-credit-card/topup.interface';

export const useInputLimits = (
  topUpProvider: TopUpProviderId,
  fiatCurrencyCode: string,
  cryptoCurrencyCode: string
): Partial<TopUpProviderPairLimits> => {
  const pairLimits = useProviderPairLimitsSelector(fiatCurrencyCode, cryptoCurrencyCode, topUpProvider);

  return useMemo(() => pairLimits?.data ?? {}, [pairLimits]);
};

export const usePairLimitsAreLoading = (fiatCurrencyCode: string, cryptoCurrencyCode: string) => {
  const pairLimits = usePairLimitsSelector(fiatCurrencyCode, cryptoCurrencyCode);

  return useMemo(
    () => isDefined(pairLimits) && Object.values(pairLimits).some(({ isLoading }) => isLoading),
    [pairLimits]
  );
};
