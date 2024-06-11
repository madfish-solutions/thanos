import { useMemo } from 'react';

import { isDefined } from '@rnw-community/shared';
import axios from 'axios';
import { BigNumber } from 'bignumber.js';

import { useEvmUsdToTokenRatesSelector } from 'app/store/evm/tokens-exchange-rates/selectors';
import { useSelector } from 'app/store/root-state.selector';
import { useTezosUsdToTokenRatesSelector } from 'app/store/tezos/currency/selectors';
import { useStorage } from 'lib/temple/front';
import { isTruthy } from 'lib/utils';

import { FIAT_CURRENCIES } from './consts';
import type { FiatCurrencyOption, CoingeckoFiatInterface } from './types';

const FIAT_CURRENCY_STORAGE_KEY = 'fiat_currency';

function useAssetUSDPrice(slug: string, chainId: number | string, evm = false) {
  const tezosUsdToTokenRates = useTezosUsdToTokenRatesSelector();
  const evmUsdToTokenRates = useEvmUsdToTokenRatesSelector();

  return useMemo(() => {
    const rateStr =
      evm && typeof chainId === 'number' ? evmUsdToTokenRates[chainId]?.[slug] ?? 0 : tezosUsdToTokenRates[slug];
    return rateStr ? Number(rateStr) : undefined;
  }, [evm, chainId, evmUsdToTokenRates, slug, tezosUsdToTokenRates]);
}

export const useFiatToUsdRate = () => {
  const {
    fiatRates,
    selectedFiatCurrency: { name: selectedFiatCurrencyName }
  } = useFiatCurrency();

  return useMemo(() => {
    if (!isDefined(fiatRates)) return;

    const fiatRate = fiatRates[selectedFiatCurrencyName.toLowerCase()] ?? 1;
    const usdRate = fiatRates['usd'] ?? 1;

    return fiatRate / usdRate;
  }, [fiatRates, selectedFiatCurrencyName]);
};

export function useAssetFiatCurrencyPrice(slug: string, chainId: number | string, evm = false): BigNumber {
  const fiatToUsdRate = useFiatToUsdRate();
  const usdToTokenRate = useAssetUSDPrice(slug, chainId, evm);

  return useMemo(() => {
    if (!isTruthy(usdToTokenRate) || !isTruthy(fiatToUsdRate)) return new BigNumber(0);

    return BigNumber(fiatToUsdRate).times(usdToTokenRate);
  }, [fiatToUsdRate, usdToTokenRate]);
}

export const useFiatCurrency = () => {
  const { data } = useSelector(state => state.currency.fiatToTezosRates);

  const [selectedFiatCurrency, setSelectedFiatCurrency] = useStorage<FiatCurrencyOption>(
    FIAT_CURRENCY_STORAGE_KEY,
    FIAT_CURRENCIES[0]!
  );

  return {
    selectedFiatCurrency,
    setSelectedFiatCurrency,
    fiatRates: data
  };
};

const coingeckoApi = axios.create({ baseURL: 'https://api.coingecko.com/api/v3/' });

export const fetchFiatToTezosRates = () =>
  coingeckoApi
    .get<CoingeckoFiatInterface>(
      `/simple/price?ids=tezos&vs_currencies=${FIAT_CURRENCIES.map(({ apiLabel }) => apiLabel).join(',')}`
    )
    .then(({ data }) => {
      const mappedRates: Record<string, number> = {};
      const tezosData = Object.keys(data.tezos);

      for (const quote of tezosData) {
        mappedRates[quote] = data.tezos[quote];
      }

      return mappedRates;
    });
