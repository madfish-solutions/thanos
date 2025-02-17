import { useCallback, useState } from 'react';

import { isDefined } from '@rnw-community/shared';
import { SubmitHandler } from 'react-hook-form-v7';
import browser from 'webextension-polyfill';

import { useUserIdSelector } from 'app/store/settings/selectors';
import { AnalyticsEventCategory, useAnalytics, useFormAnalytics } from 'lib/analytics';
import { createAliceBobOrder, getMoonpaySign } from 'lib/apis/temple';
import { createOrder as createUtorgOrder } from 'lib/apis/utorg';
import { TopUpProviderId } from 'lib/buy-with-credit-card/top-up-provider-id.enum';
import { assertUnreachable } from 'lib/utils/switch-cases';
import { useAccountAddressForEvm, useAccountAddressForTezos } from 'temple/front';

import { FormData } from '../form-data.interface';

export const useBuyWithCreditCardFormSubmit = () => {
  const { trackEvent } = useAnalytics();

  const formAnalytics = useFormAnalytics('BuyWithCreditCardForm');
  const userId = useUserIdSelector();

  const tezosAddress = useAccountAddressForTezos();
  const evmAddress = useAccountAddressForEvm();

  const [purchaseLinkLoading, setPurchaseLinkLoading] = useState(false);
  const [purchaseLinkError, setPurchaseLinkError] = useState<Error>();

  const onSubmit = useCallback<SubmitHandler<FormData>>(
    async formValues => {
      const { inputAmount, inputCurrency, outputAmount, outputToken, provider } = formValues;

      // TODO: Add "network" field and check it here
      const publicKeyHash = outputToken.slug === 'tez' ? tezosAddress : evmAddress;

      trackEvent('BUY_WITH_CREDIT_CARD_FORM_SUBMIT', AnalyticsEventCategory.FormSubmit, {
        inputAmount: inputAmount?.toString(),
        inputAsset: inputCurrency.code,
        outputAmount: outputAmount?.toString(),
        outputAsset: outputToken.code,
        provider: provider?.name
      });

      if (
        !isDefined(provider?.outputAmount) ||
        !isDefined(inputAmount) ||
        !isDefined(outputAmount) ||
        !isDefined(provider)
      ) {
        setPurchaseLinkLoading(false);
        return;
      }

      setPurchaseLinkLoading(true);

      try {
        let url: string;
        switch (provider.id) {
          case TopUpProviderId.MoonPay:
            url = await getMoonpaySign(outputToken.code, '#ed8936', publicKeyHash, inputAmount, inputCurrency.code);
            break;
          case TopUpProviderId.Utorg:
            url = await createUtorgOrder(outputAmount, inputCurrency.code, publicKeyHash!, outputToken.code);
            break;
          case TopUpProviderId.AliceBob:
            const { data } = await createAliceBobOrder(
              inputAmount.toFixed(),
              inputCurrency.code,
              outputToken.code,
              userId,
              publicKeyHash
            );
            url = data.orderInfo.payUrl;
            break;
          default:
            return assertUnreachable(provider.id);
        }

        await browser.tabs.create({ url });
      } catch (error: any) {
        setPurchaseLinkError(error);

        const analyticsProperties = {
          inputAmount,
          inputAsset: inputCurrency.code,
          outputAmount,
          outputAsset: outputToken.code,
          provider: provider.id
        };
        formAnalytics.trackSubmitFail(analyticsProperties);
      } finally {
        setPurchaseLinkLoading(false);
      }
    },
    [evmAddress, formAnalytics, tezosAddress, trackEvent, userId]
  );

  return {
    onSubmit,
    purchaseLinkError,
    purchaseLinkLoading
  };
};
