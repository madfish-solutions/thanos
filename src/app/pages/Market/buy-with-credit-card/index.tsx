import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';

import { FormProvider, useForm } from 'react-hook-form-v7';

import { PageModal } from 'app/atoms/PageModal';
import { dispatch } from 'app/store';
import { loadAllCurrenciesActions } from 'app/store/buy-with-credit-card/actions';
import { useAccountAddressForTezos } from 'temple/front';

import {
  DEFAULT_EVM_OUTPUT_TOKEN,
  DEFAULT_INPUT_CURRENCY,
  DEFAULT_TEZOS_OUTPUT_TOKEN,
  defaultModalHeaderConfig
} from './config';
import { Form } from './contents/Form';
import { SelectCurrency } from './contents/SelectCurrency';
import { SelectProvider } from './contents/SelectProvider';
import { SelectToken } from './contents/SelectToken';
import { FormData } from './form-data.interface';

type ModalContent = 'form' | 'send' | 'get' | 'provider';

interface Props {
  opened: boolean;
  onRequestClose: EmptyFn;
}

export const BuyWithCreditCard: FC<Props> = ({ opened, onRequestClose }) => {
  const [modalContent, setModalContent] = useState<ModalContent>('form');
  const [modalHeaderConfig, setModalHeaderConfig] = useState(defaultModalHeaderConfig);

  const tezosAddress = useAccountAddressForTezos();

  const defaultValues = useMemo<FormData>(
    () => ({
      inputCurrency: DEFAULT_INPUT_CURRENCY,
      outputToken: tezosAddress ? DEFAULT_TEZOS_OUTPUT_TOKEN : DEFAULT_EVM_OUTPUT_TOKEN
    }),
    [tezosAddress]
  );

  const form = useForm<FormData>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: defaultValues
  });

  useEffect(() => void dispatch(loadAllCurrenciesActions.submit()), []);

  const onGoBack = useCallback(() => {
    setModalHeaderConfig(defaultModalHeaderConfig);
    setModalContent('form');
  }, []);

  return (
    <PageModal opened={opened} onRequestClose={onRequestClose} {...modalHeaderConfig}>
      <FormProvider {...form}>
        {(() => {
          switch (modalContent) {
            case 'send':
              return <SelectCurrency setModalHeaderConfig={setModalHeaderConfig} onGoBack={onGoBack} />;
            case 'get':
              return <SelectToken setModalHeaderConfig={setModalHeaderConfig} onGoBack={onGoBack} />;
            case 'provider':
              return <SelectProvider setModalHeaderConfig={setModalHeaderConfig} onGoBack={onGoBack} />;
            default:
              return <Form setModalContent={setModalContent} />;
          }
        })()}
      </FormProvider>
    </PageModal>
  );
};
