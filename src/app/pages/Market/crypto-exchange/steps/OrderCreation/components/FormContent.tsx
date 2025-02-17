import React, { FC, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import axios from 'axios';
import { isEmpty } from 'lodash';
import { Controller, useFormContext, SubmitHandler } from 'react-hook-form-v7';
import { useDebounce } from 'use-debounce';

import { FadeTransition } from 'app/a11y/FadeTransition';
import AssetField from 'app/atoms/AssetField';
import { ActionsButtonsBox } from 'app/atoms/PageModal/actions-buttons-box';
import { StyledButton } from 'app/atoms/StyledButton';
import { toastError } from 'app/toaster';
import { useFormAnalytics } from 'lib/analytics';
import { loadMinMaxExchangeValues, queryExchange, submitExchange } from 'lib/apis/exolix/utils';
import { t, T } from 'lib/i18n';
import { useTypedSWR } from 'lib/swr';
import { useAccountAddressForEvm, useAccountAddressForTezos } from 'temple/front';

import { ErrorType, MinMaxDisplay } from '../../../../components/MinMaxDisplay';
import { ModalHeaderConfig } from '../../../../types';
import { StepLabel } from '../../../components/StepLabel';
import { Stepper } from '../../../components/Stepper';
import { defaultModalHeaderConfig, EXOLIX_DECIMALS, TEZOS_EXOLIX_NETWORK_CODE } from '../../../config';
import { useCryptoExchangeDataState } from '../../../context';
import { getCurrencyDisplayCode } from '../../../utils';
import { CryptoExchangeFormData } from '../types';

import { InfoCard } from './InfoCard';
import { SelectCurrencyButton } from './SelectCurrencyButton';
import { SelectTokenContent } from './SelectCurrencyContent';

const TEN_SECONDS_IN_MS = 10_000;

const DEFAULT_SWR_CONFIG = {
  shouldRetryOnError: false,
  focusThrottleInterval: TEN_SECONDS_IN_MS,
  refreshInterval: TEN_SECONDS_IN_MS,
  dedupingInterval: TEN_SECONDS_IN_MS
};

interface Props {
  setModalHeaderConfig: SyncFn<ModalHeaderConfig>;
  setModalContent: SyncFn<SelectTokenContent>;
}

export const FormContent: FC<Props> = ({ setModalHeaderConfig, setModalContent }) => {
  const formAnalytics = useFormAnalytics('ExolixOrderCreationForm');

  const evmAddress = useAccountAddressForEvm();
  const tezosAddress = useAccountAddressForTezos();

  const { setExchangeData, setStep } = useCryptoExchangeDataState();

  const { control, watch, handleSubmit, formState, trigger, setValue } = useFormContext<CryptoExchangeFormData>();
  const { isSubmitting, submitCount, errors } = formState;

  const formSubmitted = submitCount > 0;

  const inputValue = watch('inputValue');
  const [inputValueDebounced] = useDebounce(inputValue, 300);

  const inputCurrency = watch('inputCurrency');
  const outputCurrency = watch('outputCurrency');

  useLayoutEffect(() => void setModalHeaderConfig(defaultModalHeaderConfig), []);

  const { data: minMaxData, isValidating: isMinMaxLoading } = useTypedSWR(
    ['exolix/api/min-max', inputCurrency, outputCurrency],
    () =>
      loadMinMaxExchangeValues(
        inputCurrency.code,
        inputCurrency.network.code,
        outputCurrency.code,
        outputCurrency.network.code
      ),
    DEFAULT_SWR_CONFIG
  );

  const minMaxDataRef = useRef(minMaxData);

  useEffect(() => {
    if (minMaxDataRef.current !== minMaxData && inputValue) {
      trigger('inputValue');
      minMaxDataRef.current = minMaxData;
    }
  }, [inputValue, minMaxData, trigger]);

  const { data: ratesData, isValidating: isRatesLoading } = useTypedSWR(
    ['exolix/api/rate', minMaxData, inputValueDebounced],
    () => {
      const amount = Number(inputValueDebounced) ?? 0;

      if (!minMaxData || amount < minMaxData.finalMinAmount || amount > minMaxData.finalMaxAmount) {
        return;
      }

      return queryExchange({
        coinFrom: inputCurrency.code,
        coinFromNetwork: inputCurrency.network.code,
        amount,
        coinTo: outputCurrency.code,
        coinToNetwork: outputCurrency.network.code
      });
    },
    DEFAULT_SWR_CONFIG
  );

  const { rate, toAmount } = useMemo(
    () =>
      ratesData && 'rate' in ratesData
        ? { rate: ratesData.rate, toAmount: ratesData.toAmount }
        : { rate: null, toAmount: 0 },
    [ratesData]
  );

  const withdrawalAddress = useMemo(() => {
    if (outputCurrency.network.code === TEZOS_EXOLIX_NETWORK_CODE) {
      return tezosAddress;
    }

    return evmAddress;
  }, [evmAddress, outputCurrency.network.code, tezosAddress]);

  const selectInputCurrency = useCallback(() => setModalContent('send'), []);
  const selectOutputCurrency = useCallback(() => setModalContent('get'), []);

  const handleMinClick = useCallback(
    () => minMaxData && setValue('inputValue', minMaxData.finalMinAmount.toString(), { shouldValidate: true }),
    [minMaxData, setValue]
  );
  const handleMaxClick = useCallback(
    () => minMaxData && setValue('inputValue', minMaxData.finalMaxAmount.toString(), { shouldValidate: true }),
    [minMaxData, setValue]
  );

  const validateInputValue = useCallback(
    (value: string) => {
      if (!value || !minMaxData) return ErrorType.min;

      const amount = Number(value);
      const { finalMinAmount, finalMaxAmount } = minMaxData;

      if (amount < finalMinAmount) return ErrorType.min;
      if (amount > finalMaxAmount) return ErrorType.max;

      return true;
    },
    [minMaxData]
  );

  const onSubmit = useCallback<SubmitHandler<CryptoExchangeFormData>>(
    async ({ inputValue, inputCurrency, outputCurrency }) => {
      try {
        if (isSubmitting || !withdrawalAddress) return;

        formAnalytics.trackSubmit();

        const amount = Number(inputValue) ?? 0;

        const data = await submitExchange({
          coinFrom: inputCurrency.code,
          networkFrom: inputCurrency.network.code,
          coinTo: outputCurrency.code,
          networkTo: outputCurrency.network.code,
          amount,
          withdrawalAddress,
          withdrawalExtraId: ''
        });

        setExchangeData(data);
        setStep(1);

        formAnalytics.trackSubmitSuccess();
      } catch (e) {
        console.log(e);
        formAnalytics.trackSubmitFail();
        if (axios.isAxiosError(e) && e.response && e.response.status === 422) return;
        toastError('Something went wrong! Please try again later.');
      }
    },
    [formAnalytics, isSubmitting, setExchangeData, setStep, withdrawalAddress]
  );

  return (
    <FadeTransition>
      <form
        id="create-order-form"
        className="flex-1 pt-4 px-4 flex flex-col overflow-y-auto"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Stepper currentStep={0} />

        <StepLabel title="exchangeDetails" description="exchangeDetailsDescription" />

        <Controller
          name="inputValue"
          control={control}
          rules={{ validate: validateInputValue }}
          render={({ field: { value, onChange, onBlur }, formState: { errors } }) => (
            <AssetField
              value={value}
              onBlur={onBlur}
              onChange={v => onChange(v ?? '')}
              assetDecimals={EXOLIX_DECIMALS}
              rightSideComponent={<SelectCurrencyButton currency={inputCurrency} onClick={selectInputCurrency} />}
              rightSideContainerStyle={{ right: 2 }}
              style={{ paddingRight: 158 }}
              underneathComponent={
                <MinMaxDisplay
                  currencyCode={getCurrencyDisplayCode(inputCurrency.code)}
                  min={minMaxData?.finalMinAmount}
                  max={minMaxData?.finalMaxAmount}
                  error={errors.inputValue}
                  onMinClick={handleMinClick}
                  onMaxClick={handleMaxClick}
                />
              }
              label={t('send')}
              placeholder="0.00"
              containerClassName="pb-7"
            />
          )}
        />

        <AssetField
          readOnly
          value={toAmount === 0 ? '' : toAmount}
          assetDecimals={EXOLIX_DECIMALS}
          rightSideComponent={<SelectCurrencyButton currency={outputCurrency} onClick={selectOutputCurrency} />}
          rightSideContainerStyle={{ right: 2 }}
          style={{ paddingRight: 158 }}
          label={t('get')}
          placeholder="0.00"
          shouldShowErrorCaption={false}
          containerClassName="pb-5"
        />

        <InfoCard rate={rate} inputCurrencyCode={inputCurrency.code} outputCurrencyCode={outputCurrency.code} />
      </form>

      <ActionsButtonsBox>
        <StyledButton
          type="submit"
          form="create-order-form"
          size="L"
          color="primary"
          loading={isSubmitting || isMinMaxLoading || isRatesLoading}
          disabled={formSubmitted && (!toAmount || !isEmpty(errors))}
        >
          <T id="exchange" />
        </StyledButton>
      </ActionsButtonsBox>
    </FadeTransition>
  );
};
