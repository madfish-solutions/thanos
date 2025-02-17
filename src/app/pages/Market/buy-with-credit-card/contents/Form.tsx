import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';

import { isDefined } from '@rnw-community/shared';
import BigNumber from 'bignumber.js';
import { isEmpty } from 'lodash';
import { Controller, useFormContext } from 'react-hook-form-v7';

import { FadeTransition } from 'app/a11y/FadeTransition';
import AssetField from 'app/atoms/AssetField';
import { ActionsButtonsBox } from 'app/atoms/PageModal';
import { StyledButton } from 'app/atoms/StyledButton';
import { dispatch } from 'app/store';
import { updatePairLimitsActions } from 'app/store/buy-with-credit-card/actions';
import { useCurrenciesLoadingSelector } from 'app/store/buy-with-credit-card/selectors';
import { getAssetSymbolToDisplay } from 'lib/buy-with-credit-card/get-asset-symbol-to-display';
import { T, t, toLocalFormat } from 'lib/i18n';
import { useInterval } from 'lib/ui/hooks';

import { InfoContainer, InfoRaw } from '../../components/InfoBlock';
import { ErrorType, MinMaxDisplay } from '../../components/MinMaxDisplay';
import { NewQuoteLabel } from '../components/NewQuoteLabel';
import { SelectAssetButton } from '../components/SelectAssetButton';
import { SelectProviderButton } from '../components/SelectProviderButton';
import { VALUE_PLACEHOLDER } from '../config';
import { BuyWithCreditCardFormData } from '../form-data.interface';
import { useBuyWithCreditCardFormSubmit } from '../hooks/use-buy-with-credit-card-form-submit';
import { useFormInputsCallbacks } from '../hooks/use-form-inputs-callbacks';
import { usePairLimitsAreLoading } from '../hooks/use-input-limits';
import { usePaymentProviders } from '../hooks/use-payment-providers';
import { useUpdateCurrentProvider } from '../hooks/use-update-current-provider';
import { BuyWithCreditCardSelectors } from '../selectors';

const FORM_REFRESH_INTERVAL = 20000;

interface Props {
  setModalContent: SyncFn<'send' | 'get' | 'provider'>;
}

export const Form: FC<Props> = ({ setModalContent }) => {
  const [formIsLoading, setFormIsLoading] = useState(false);

  const { control, watch, handleSubmit, formState, setValue } = useFormContext<BuyWithCreditCardFormData>();
  const { isSubmitting, submitCount, errors } = formState;

  const formSubmitted = submitCount > 0;

  const inputAmount = watch('inputAmount');
  const outputAmount = watch('outputAmount');
  const inputCurrency = watch('inputCurrency');
  const outputToken = watch('outputToken');
  const provider = watch('provider');

  const currenciesLoading = useCurrenciesLoadingSelector();
  const pairLimitsLoading = usePairLimitsAreLoading(inputCurrency.code, outputToken.code);

  const { onSubmit, purchaseLinkLoading, purchaseLinkError } = useBuyWithCreditCardFormSubmit();

  const { allPaymentProviders, paymentProvidersToDisplay, providersErrors, updateOutputAmounts } = usePaymentProviders(
    inputAmount,
    inputCurrency,
    outputToken
  );

  const {
    handleInputAssetChange,
    handleInputAmountChange,
    handleOutputTokenChange,
    handlePaymentProviderChange,
    setPaymentProvider,
    manuallySelectedProviderIdRef,
    refreshForm
  } = useFormInputsCallbacks(updateOutputAmounts, formIsLoading, setFormIsLoading);

  useEffect(() => {
    dispatch(updatePairLimitsActions.submit({ fiatSymbol: inputCurrency.code, cryptoSymbol: outputToken.code }));
  }, [inputCurrency.code, outputToken.code]);

  const exchangeRate = useMemo(() => {
    if (isDefined(inputAmount) && inputAmount > 0 && isDefined(outputAmount) && outputAmount > 0) {
      return new BigNumber(outputAmount).div(inputAmount).decimalPlaces(6);
    }

    return undefined;
  }, [inputAmount, outputAmount]);

  const exchangeRateStr = useMemo(() => {
    if (isDefined(exchangeRate))
      return `1 ${getAssetSymbolToDisplay(inputCurrency)} = ${toLocalFormat(
        exchangeRate,
        {}
      )} ${getAssetSymbolToDisplay(outputToken)}`;

    return VALUE_PLACEHOLDER;
  }, [exchangeRate, inputCurrency, outputToken]);

  const isLoading = isSubmitting || formIsLoading || currenciesLoading || pairLimitsLoading || purchaseLinkLoading;

  useUpdateCurrentProvider(
    paymentProvidersToDisplay,
    provider,
    manuallySelectedProviderIdRef,
    setPaymentProvider,
    isLoading
  );

  useInterval(refreshForm, [refreshForm], FORM_REFRESH_INTERVAL, false);

  const handleSelectCurrency = useCallback(() => void setModalContent('send'), []);
  const handleSelectToken = useCallback(() => void setModalContent('get'), []);
  const handleSelectProvider = useCallback(() => void setModalContent('provider'), []);

  const handleMinClick = useCallback(
    () => inputCurrency.minAmount && setValue('inputAmount', inputCurrency.minAmount, { shouldValidate: true }),
    [inputCurrency.minAmount, setValue]
  );
  const handleMaxClick = useCallback(
    () => inputCurrency.maxAmount && setValue('inputAmount', inputCurrency.maxAmount, { shouldValidate: true }),
    [inputCurrency.maxAmount, setValue]
  );

  const validateInputValue = useCallback(
    (value?: number) => {
      const { minAmount, maxAmount } = inputCurrency;

      if (!value || !minAmount || !maxAmount) return ErrorType.min;

      if (value < minAmount) return ErrorType.min;
      if (value > maxAmount) return ErrorType.max;

      return true;
    },
    [inputCurrency]
  );

  return (
    <FadeTransition>
      <form id="main-form" className="flex-1 pt-4 px-4 flex flex-col overflow-y-auto" onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="inputAmount"
          control={control}
          rules={{ validate: validateInputValue }}
          render={({ field: { value, onChange, onBlur }, formState: { errors } }) => (
            <AssetField
              value={value}
              onBlur={onBlur}
              onChange={v => onChange(v ?? '')}
              assetDecimals={inputCurrency.precision}
              rightSideComponent={
                <SelectAssetButton useFlagIcon currency={inputCurrency} onClick={handleSelectCurrency} />
              }
              rightSideContainerStyle={{ right: 2 }}
              style={{ paddingRight: 158 }}
              underneathComponent={
                <MinMaxDisplay
                  currencyCode={getAssetSymbolToDisplay(inputCurrency)}
                  min={inputCurrency?.minAmount}
                  max={inputCurrency?.maxAmount}
                  error={errors.inputAmount}
                  onMinClick={handleMinClick}
                  onMaxClick={handleMaxClick}
                />
              }
              label={t('send')}
              placeholder="0.00"
              containerClassName="pb-6"
              testID={BuyWithCreditCardSelectors.sendInput}
            />
          )}
        />

        <AssetField
          readOnly
          value={outputAmount}
          assetDecimals={outputToken.precision}
          rightSideComponent={<SelectAssetButton currency={outputToken} onClick={handleSelectToken} />}
          rightSideContainerStyle={{ right: 2 }}
          style={{ paddingRight: 158 }}
          label={t('get')}
          placeholder="0.00"
          shouldShowErrorCaption={false}
          containerClassName="pb-8"
          testID={BuyWithCreditCardSelectors.getInput}
        />

        <NewQuoteLabel title="provider" className="mb-1" />

        <SelectProviderButton provider={provider} onClick={handleSelectProvider} />

        <InfoContainer className="mt-6 mb-8">
          <InfoRaw bottomSeparator title="exchangeRate">
            <span className="p-1 text-font-description">{exchangeRateStr}</span>
          </InfoRaw>

          <p className="py-2 px-1 text-font-small text-grey-1">
            <T id="warningTopUpServiceMessage" />
          </p>
        </InfoContainer>
      </form>

      <ActionsButtonsBox>
        <StyledButton
          type="submit"
          form="main-form"
          size="L"
          color="primary"
          loading={isLoading}
          disabled={formSubmitted && (!outputAmount || !isEmpty(errors))}
          testID={BuyWithCreditCardSelectors.topUpButton}
        >
          <T id="topUp" />
        </StyledButton>
      </ActionsButtonsBox>
    </FadeTransition>
  );
};
