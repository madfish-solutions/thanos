import { useMemo } from 'react';

import { isDefined } from '@rnw-community/shared';

import { useCryptoCurrenciesSelector } from 'app/store/buy-with-credit-card/selectors';
import { TopUpProviderId } from 'lib/buy-with-credit-card/top-up-provider-id.enum';
import { TopUpOutputInterface } from 'lib/buy-with-credit-card/topup.interface';

export const useAllCryptoCurrencies = () => {
  const moonpayCryptoCurrencies = useCryptoCurrenciesSelector(TopUpProviderId.MoonPay);
  const utorgCryptoCurrencies = useCryptoCurrenciesSelector(TopUpProviderId.Utorg);
  const aliceBobCryptoCurrencies = useCryptoCurrenciesSelector(TopUpProviderId.AliceBob);

  return useMemo(
    () =>
      Object.values(
        [...moonpayCryptoCurrencies, ...utorgCryptoCurrencies, ...aliceBobCryptoCurrencies].reduce<
          Record<string, TopUpOutputInterface>
        >((acc, currency) => {
          if (!isDefined(acc[currency.code])) {
            acc[currency.code] = currency;
          }

          return acc;
        }, {})
      ).sort(({ code: aCode }, { code: bCode }) => aCode.localeCompare(bCode)),
    [moonpayCryptoCurrencies, utorgCryptoCurrencies, aliceBobCryptoCurrencies]
  );
};
