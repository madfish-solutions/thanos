import { isDefined } from '@rnw-community/shared';
import { AxiosResponse } from 'axios';

import {
  Currency,
  CurrencyType as MoonPayCurrencyType,
  CryptoCurrency as MoonPayCryptoCurrency,
  FiatCurrency as MoonPayFiatCurrency
} from 'lib/apis/moonpay';
import { AliceBobPairInfo } from 'lib/apis/temple';
import { CurrencyInfoType as UtorgCurrencyInfoType, UtorgCurrencyInfo } from 'lib/apis/utorg';
import { toTokenSlug } from 'lib/assets';

const UTORG_FIAT_ICONS_BASE_URL = 'https://utorg.pro/img/flags2/icon-';
const UTORG_CRYPTO_ICONS_BASE_URL = 'https://utorg.pro/img/cryptoIcons';

const knownUtorgFiatCurrenciesNames: StringRecord = {
  PHP: 'Philippine Peso',
  INR: 'Indian Rupee'
};

const aliceBobHryvnia = {
  name: 'Ukrainian Hryvnia',
  code: 'UAH',
  icon: '',
  precision: 2
};

const aliceBobTezos = {
  name: 'Tezos',
  code: 'XTZ',
  icon: 'https://static.moonpay.com/widget/currencies/xtz.svg',
  precision: 6,
  slug: 'tez'
};

export const mapMoonPayProviderCurrencies = (currencies: Currency[]) => ({
  fiat: currencies
    .filter((currency): currency is MoonPayFiatCurrency => currency.type === MoonPayCurrencyType.Fiat)
    .map(({ name, code, minBuyAmount, maxBuyAmount, precision }) => ({
      name,
      code: code.toUpperCase(),
      codeToDisplay: code.toUpperCase().split('_')[0],
      icon: `https://static.moonpay.com/widget/currencies/${code}.svg`,
      minAmount: minBuyAmount,
      maxAmount: maxBuyAmount,
      precision: Math.min(precision, 2) // Currencies like JOD have 3 decimals but Moonpay fails to process input with 3 decimals
    })),
  crypto: currencies
    .filter(
      (currency): currency is MoonPayCryptoCurrency =>
        currency.type === MoonPayCurrencyType.Crypto && currency.metadata.networkCode.toLowerCase() === 'tezos'
    )
    .map(({ name, code, precision, minBuyAmount, maxBuyAmount, metadata }) => ({
      name,
      code: code.toUpperCase(),
      codeToDisplay: code.toUpperCase().split('_')[0],
      icon: `https://static.moonpay.com/widget/currencies/${code}.svg`,
      minAmount: minBuyAmount ?? undefined,
      maxAmount: maxBuyAmount ?? undefined,
      precision,
      slug: isDefined(metadata.contractAddress)
        ? toTokenSlug(metadata.contractAddress, metadata.coinType ?? undefined)
        : ''
    }))
});

export const mapUtorgProviderCurrencies = (currencies: UtorgCurrencyInfo[]) => ({
  fiat: currencies
    .filter(({ type, depositMax }) => type === UtorgCurrencyInfoType.FIAT && depositMax > 0)
    .map(({ display, symbol, depositMin, depositMax, precision }) => ({
      name: knownUtorgFiatCurrenciesNames[symbol] ?? '',
      code: symbol,
      codeToDisplay: display,
      icon: `${UTORG_FIAT_ICONS_BASE_URL}${symbol.slice(0, -1)}.svg`,
      precision,
      minAmount: depositMin,
      maxAmount: depositMax
    })),
  crypto: currencies
    .filter(
      ({ chain, type, depositMax }) => type === UtorgCurrencyInfoType.CRYPTO && depositMax > 0 && chain === 'TEZOS'
    )
    .map(({ currency, display, precision }) => ({
      name: display,
      code: currency,
      codeToDisplay: display,
      icon: `${UTORG_CRYPTO_ICONS_BASE_URL}/${currency}.svg`,
      precision,
      slug: '' // TODO: implement making correct slug as soon as any Tezos token is supported by Utorg
    }))
});

export const mapAliceBobProviderCurrencies = (response: AxiosResponse<{ pairInfo: AliceBobPairInfo }>) => ({
  fiat: [
    {
      ...aliceBobHryvnia,
      minAmount: response.data.pairInfo.minAmount,
      maxAmount: response.data.pairInfo.maxAmount
    }
  ],
  crypto: [aliceBobTezos]
});
