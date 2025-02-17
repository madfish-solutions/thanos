import { useCallback, useMemo } from 'react';

import { getPaymentProvidersToDisplay } from 'lib/buy-with-credit-card/get-payment-providers-to-display';
import { TopUpProviderId } from 'lib/buy-with-credit-card/top-up-provider-id.enum';
import { TopUpInputInterface, TopUpOutputInterface } from 'lib/buy-with-credit-card/topup.interface';

import { usePaymentProvider } from './use-one-payment-provider';

export const usePaymentProviders = (
  inputAmount: number | undefined,
  inputAsset: TopUpInputInterface,
  outputAsset: TopUpOutputInterface
) => {
  const {
    errors: moonPayErrors,
    provider: moonPayProvider,
    updateOutputAmount: updateMoonPayOutputAmount,
    outputAmountLoading: moonPayOutputLoading
  } = usePaymentProvider(TopUpProviderId.MoonPay, inputAmount, inputAsset, outputAsset);
  const {
    errors: utorgErrors,
    provider: utorgProvider,
    updateOutputAmount: updateUtorgOutputAmount,
    outputAmountLoading: utorgOutputLoading
  } = usePaymentProvider(TopUpProviderId.Utorg, inputAmount, inputAsset, outputAsset);
  const {
    errors: aliceBobErrors,
    provider: aliceBobProvider,
    updateOutputAmount: updateAliceBobOutputAmount,
    outputAmountLoading: aliceBobOutputLoading
  } = usePaymentProvider(TopUpProviderId.AliceBob, inputAmount, inputAsset, outputAsset);

  const allPaymentProviders = useMemo(
    () => [moonPayProvider, utorgProvider, aliceBobProvider],
    [moonPayProvider, utorgProvider, aliceBobProvider]
  );

  const providersErrors = useMemo(
    () => ({
      [TopUpProviderId.MoonPay]: moonPayErrors,
      [TopUpProviderId.Utorg]: utorgErrors,
      [TopUpProviderId.AliceBob]: aliceBobErrors
    }),
    [moonPayErrors, utorgErrors, aliceBobErrors]
  );

  const paymentProvidersToDisplay = useMemo(
    () =>
      getPaymentProvidersToDisplay(
        allPaymentProviders,
        providersErrors,
        {
          [TopUpProviderId.MoonPay]: moonPayOutputLoading,
          [TopUpProviderId.Utorg]: utorgOutputLoading,
          [TopUpProviderId.AliceBob]: aliceBobOutputLoading
        },
        inputAmount
      ),
    [allPaymentProviders, providersErrors, inputAmount, moonPayOutputLoading, utorgOutputLoading, aliceBobOutputLoading]
  );

  const updateOutputAmounts = useCallback(
    async (newInputAmount?: number, newInputAsset = inputAsset, newOutputAsset = outputAsset) => {
      const [moonPayOutputAmount, utorgOutputAmount, aliceBobOutputAmount] = await Promise.all([
        updateMoonPayOutputAmount(newInputAmount, newInputAsset, newOutputAsset),
        updateUtorgOutputAmount(newInputAmount, newInputAsset, newOutputAsset),
        updateAliceBobOutputAmount(newInputAmount, newInputAsset, newOutputAsset)
      ]);

      return {
        [TopUpProviderId.MoonPay]: moonPayOutputAmount,
        [TopUpProviderId.Utorg]: utorgOutputAmount,
        [TopUpProviderId.AliceBob]: aliceBobOutputAmount
      };
    },
    [inputAsset, outputAsset, updateMoonPayOutputAmount, updateUtorgOutputAmount, updateAliceBobOutputAmount]
  );

  const loading = moonPayOutputLoading || utorgOutputLoading || aliceBobOutputLoading;

  return {
    allPaymentProviders,
    paymentProvidersToDisplay,
    providersErrors,
    loading,
    updateOutputAmounts
  };
};
