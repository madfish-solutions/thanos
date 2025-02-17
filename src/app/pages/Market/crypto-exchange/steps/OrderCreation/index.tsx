import React, { FC, useCallback, useMemo, useState } from 'react';

import { FormProvider, useForm } from 'react-hook-form-v7';

import { dispatch } from 'app/store';
import { loadExolixCurrenciesActions, loadExolixNetworksMapActions } from 'app/store/crypto-exchange/actions';
import { useDidMount } from 'lib/ui/hooks';
import { useAccountAddressForTezos } from 'temple/front';

import { ModalHeaderConfig } from '../../../types';
import {
  INITIAL_EVM_ACC_OUTPUT_CURRENCY,
  INITIAL_INPUT_CURRENCY,
  INITIAL_TEZOS_ACC_OUTPUT_CURRENCY
} from '../../config';

import { FormContent } from './components/FormContent';
import { SelectCurrencyContent, SelectTokenContent } from './components/SelectCurrencyContent';
import { CryptoExchangeFormData } from './types';

type ModalContent = 'form' | SelectTokenContent;

interface Props {
  setModalHeaderConfig: SyncFn<ModalHeaderConfig>;
}

export const OrderCreation: FC<Props> = ({ setModalHeaderConfig }) => {
  const [modalContent, setModalContent] = useState<ModalContent>('form');

  useDidMount(() => {
    dispatch(loadExolixNetworksMapActions.submit());
    dispatch(loadExolixCurrenciesActions.submit());
  });

  const tezosAddress = useAccountAddressForTezos();

  const defaultFormData = useMemo(
    () => ({
      inputValue: '',
      inputCurrency: INITIAL_INPUT_CURRENCY,
      outputCurrency: tezosAddress ? INITIAL_TEZOS_ACC_OUTPUT_CURRENCY : INITIAL_EVM_ACC_OUTPUT_CURRENCY
    }),
    [tezosAddress]
  );

  const form = useForm<CryptoExchangeFormData>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: defaultFormData
  });

  const onGoBack = useCallback(() => setModalContent('form'), []);

  return (
    <FormProvider {...form}>
      {modalContent === 'form' ? (
        <FormContent setModalHeaderConfig={setModalHeaderConfig} setModalContent={setModalContent} />
      ) : (
        <SelectCurrencyContent content={modalContent} setModalHeaderConfig={setModalHeaderConfig} onGoBack={onGoBack} />
      )}
    </FormProvider>
  );
};
