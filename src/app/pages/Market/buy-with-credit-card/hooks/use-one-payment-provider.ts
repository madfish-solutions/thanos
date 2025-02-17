import { useCallback, useMemo, useState } from 'react';

import { isDefined } from '@rnw-community/shared';
import { BigNumber } from 'bignumber.js';

import {
  useFiatCurrenciesSelector,
  useCryptoCurrenciesSelector,
  useProviderCurrenciesErrorSelector,
  usePairLimitsErrorsSelector
} from 'app/store/buy-with-credit-card/selectors';
import { getMoonPayBuyQuote } from 'lib/apis/moonpay';
import { estimateAliceBobOutput } from 'lib/apis/temple';
import { convertFiatAmountToCrypto } from 'lib/apis/utorg';
import { getAssetSymbolToDisplay } from 'lib/buy-with-credit-card/get-asset-symbol-to-display';
import { getUpdatedFiatLimits } from 'lib/buy-with-credit-card/get-updated-fiat-limits';
import { TopUpProviderId } from 'lib/buy-with-credit-card/top-up-provider-id.enum';
import {
  PaymentProviderInterface,
  TopUpInputInterface,
  TopUpOutputInterface
} from 'lib/buy-with-credit-card/topup.interface';
import { ProviderErrors } from 'lib/buy-with-credit-card/types';
import { isTruthy } from 'lib/utils';
import { percentageToFraction } from 'lib/utils/percentage';

import { useInputLimits } from './use-input-limits';
type getOutputAmountFunction = (
  inputAmount: number,
  inputAsset: TopUpInputInterface,
  outputAsset: TopUpOutputInterface
) => Promise<number>;

type PaymentProviderInitialData = Pick<PaymentProviderInterface, 'name' | 'id' | 'kycRequired'>;

const getOutputAmountFunctions: Record<TopUpProviderId, getOutputAmountFunction> = {
  [TopUpProviderId.MoonPay]: async (inputAmount, inputAsset, outputAsset) => {
    const { baseCurrencyAmount, quoteCurrencyAmount, extraFeePercentage, feeAmount, networkFeeAmount, totalAmount } =
      await getMoonPayBuyQuote(outputAsset.code.toLowerCase(), inputAsset.code.toLowerCase(), inputAmount);

    if (inputAmount < totalAmount) {
      const expectedBaseCurrencyAmount = BigNumber.max(
        new BigNumber(inputAmount)
          .minus(feeAmount)
          .minus(networkFeeAmount)
          .div(new BigNumber(1).plus(percentageToFraction(extraFeePercentage)))
          .decimalPlaces(inputAsset.precision ?? 0, BigNumber.ROUND_DOWN),
        0
      );

      return expectedBaseCurrencyAmount
        .times(quoteCurrencyAmount)
        .div(baseCurrencyAmount)
        .decimalPlaces(outputAsset.precision ?? 0, BigNumber.ROUND_DOWN)
        .toNumber();
    }

    return quoteCurrencyAmount;
  },
  [TopUpProviderId.Utorg]: async (inputAmount, inputAsset, outputAsset) =>
    convertFiatAmountToCrypto(inputAsset.code, outputAsset.code, inputAmount),
  [TopUpProviderId.AliceBob]: async (inputAmount, inputAsset, outputAsset) => {
    const response = await estimateAliceBobOutput(inputAmount.toString(), inputAsset.code, outputAsset.code);

    return response.data.outputAmount;
  }
};

const initialPaymentProvidersData: Record<TopUpProviderId, PaymentProviderInitialData> = {
  [TopUpProviderId.MoonPay]: {
    name: 'MoonPay',
    id: TopUpProviderId.MoonPay,
    kycRequired: true
  },
  [TopUpProviderId.Utorg]: {
    name: 'Utorg',
    id: TopUpProviderId.Utorg,
    kycRequired: true
  },
  [TopUpProviderId.AliceBob]: {
    name: 'Alice&Bob',
    id: TopUpProviderId.AliceBob,
    kycRequired: false
  }
};

export const usePaymentProvider = (
  providerId: TopUpProviderId,
  inputAmount: number | undefined,
  inputAsset: TopUpInputInterface,
  outputAsset: TopUpOutputInterface
) => {
  const [outputAmount, setOutputAmount] = useState<number>();
  const [outputError, setOutputError] = useState<Error>();
  const [outputAmountLoading, setOutputAmountLoading] = useState<boolean>(false);
  const fiatCurrencies = useFiatCurrenciesSelector(providerId);
  const cryptoCurrencies = useCryptoCurrenciesSelector(providerId);
  const currenciesError = useProviderCurrenciesErrorSelector(providerId);
  const limitsErrors = usePairLimitsErrorsSelector(inputAsset.code, outputAsset.code);
  const { min: minInputAmount, max: maxInputAmount } = useInputLimits(providerId, inputAsset.code, outputAsset.code);
  const initialData = initialPaymentProvidersData[providerId];
  const getOutputAmount = getOutputAmountFunctions[providerId];

  const updateOutputAmount = useCallback(
    async (newInputAmount?: number, newInputAsset = inputAsset, newOutputAsset = outputAsset) => {
      setOutputError(undefined);
      const currentProviderFiatCurrency = fiatCurrencies.find(({ code }) => code === newInputAsset.code);
      const currentProviderCryptoCurrency = cryptoCurrencies.find(({ code }) => code === newOutputAsset.code);
      const updatedPairLimits =
        isDefined(currentProviderFiatCurrency) && isDefined(currentProviderCryptoCurrency)
          ? (await getUpdatedFiatLimits(currentProviderFiatCurrency, currentProviderCryptoCurrency, providerId)).data
          : undefined;

      if (
        !isTruthy(newInputAmount) ||
        !isDefined(updatedPairLimits) ||
        newInputAmount < updatedPairLimits.min ||
        newInputAmount > updatedPairLimits.max
      ) {
        const newOutputAmount = newInputAmount === 0 ? 0 : undefined;
        setOutputAmount(newOutputAmount);

        return newOutputAmount;
      }

      let newOutputAmount: number | undefined;
      try {
        setOutputAmountLoading(true);
        newOutputAmount = await getOutputAmount(newInputAmount, newInputAsset, newOutputAsset);
      } catch (error) {
        setOutputError(error as Error);
        newOutputAmount = undefined;
      } finally {
        setOutputAmount(newOutputAmount);
        setOutputAmountLoading(false);
      }

      return newOutputAmount;
    },
    [inputAsset, outputAsset, getOutputAmount, providerId, fiatCurrencies, cryptoCurrencies]
  );

  const provider = useMemo<PaymentProviderInterface>(
    () => ({
      ...initialData,
      isBestPrice: false,
      minInputAmount,
      maxInputAmount,
      inputAmount,
      inputDecimals: inputAsset.precision,
      inputSymbol: getAssetSymbolToDisplay(inputAsset),
      outputAmount,
      outputSymbol: getAssetSymbolToDisplay(outputAsset)
    }),
    [initialData, inputAmount, inputAsset, outputAmount, outputAsset, minInputAmount, maxInputAmount]
  );

  const errors: ProviderErrors = useMemo(
    () => ({
      currencies: currenciesError,
      limits: limitsErrors?.[providerId],
      output: outputError
    }),
    [currenciesError, limitsErrors, outputError]
  );

  return {
    provider,
    errors,
    updateOutputAmount,
    outputAmountLoading
  };
};
