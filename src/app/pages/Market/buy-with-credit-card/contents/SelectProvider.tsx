import React, { FC, memo, useCallback, useLayoutEffect } from 'react';

import clsx from 'clsx';
import { useFormContext } from 'react-hook-form-v7';

import { FadeTransition } from 'app/a11y/FadeTransition';
import Money from 'app/atoms/Money';
import { BackButton } from 'app/atoms/PageModal';
import { TopUpProviderIcon } from 'app/templates/TopUpProviderIcon';
import { T, t, TID } from 'lib/i18n';

import { InfoContainer } from '../../components/InfoBlock';
import { ModalHeaderConfig } from '../../types';
import { NewQuoteLabel } from '../components/NewQuoteLabel';
import { VALUE_PLACEHOLDER } from '../config';
import { BuyWithCreditCardFormData } from '../form-data.interface';
import { usePaymentProviders } from '../hooks/use-payment-providers';
import { TopUpProviderId } from '../top-up-provider-id.enum';
import { PaymentProviderInterface } from '../topup.interface';

interface Props {
  setModalHeaderConfig: SyncFn<ModalHeaderConfig>;
  onGoBack: EmptyFn;
}

export const SelectProvider: FC<Props> = ({ setModalHeaderConfig, onGoBack }) => {
  useLayoutEffect(
    () => void setModalHeaderConfig({ title: t('selectProvider'), titleLeft: <BackButton onClick={onGoBack} /> }),
    [setModalHeaderConfig, onGoBack]
  );

  const { watch, setValue } = useFormContext<BuyWithCreditCardFormData>();

  const activeProvider = watch('provider');
  const inputCurrency = watch('inputCurrency');
  const outputToken = watch('outputToken');

  const inputAmount = watch('inputAmount');

  const { paymentProvidersToDisplay } = usePaymentProviders(inputAmount, inputCurrency, outputToken);

  const onProviderSelect = useCallback(
    (p: PaymentProviderInterface) => {
      setValue('provider', p);
      onGoBack();
    },
    [setValue, onGoBack]
  );

  return (
    <FadeTransition>
      <NewQuoteLabel title="providers" className="m-4" />
      <div className="flex flex-col px-4 pb-4">
        {paymentProvidersToDisplay.map(p => (
          <Provider key={p.id} current={p} activeId={activeProvider?.id} onClick={onProviderSelect} />
        ))}
      </div>
    </FadeTransition>
  );
};

interface ProviderProps {
  current: PaymentProviderInterface;
  activeId?: TopUpProviderId;
  onClick?: SyncFn<PaymentProviderInterface>;
}

const Provider = memo<ProviderProps>(({ current, activeId, onClick }) => {
  const active = current.id === activeId;

  const handleClick = useCallback(() => onClick?.(current), [current, onClick]);

  return (
    <InfoContainer className={clsx('cursor-pointer mb-4 pt-3 pb-0', active && '!border-primary')} onClick={handleClick}>
      <div className="flex flex-row justify-between pb-3">
        <div className="flex flex-row gap-x-2">
          <TopUpProviderIcon providerId={current.id} size={40} />
          <div className="flex flex-col">
            <span className="text-font-medium-bold">{current.name}</span>
            <span className="text-font-num-12 text-grey-1">
              {current.minInputAmount && current.maxInputAmount ? (
                <>
                  <Money smallFractionFont={false}>{current.minInputAmount}</Money>
                  {' - '}
                  <Money smallFractionFont={false}>{current.maxInputAmount}</Money> {current.inputSymbol}
                </>
              ) : (
                VALUE_PLACEHOLDER
              )}
            </span>
          </div>
        </div>
        <div className="flex flex-row justify-end items-start gap-x-1">
          {!current.kycRequired && <Tag title="noKycRequired" className="bg-black" />}
          {current.isBestPrice && <Tag title="bestPrice" className="bg-success" />}
        </div>
      </div>
      <div className="py-3 flex flex-row justify-between items-center border-t-0.5">
        <p className="p-1 text-font-medium text-grey-1">
          <T id="youGet" />:
        </p>
        <span className="text-font-num-14 p-1">
          {current.outputAmount ? (
            <>
              {'≈ '}
              <Money smallFractionFont={false}>{current.outputAmount}</Money> {current.outputSymbol}
            </>
          ) : (
            VALUE_PLACEHOLDER
          )}
        </span>
      </div>
    </InfoContainer>
  );
});

interface TagProps {
  title: TID;
  className?: string;
}

const Tag = memo<TagProps>(({ title, className }) => (
  <div className={clsx('p-1 text-font-small-bold text-white rounded', className)}>
    <T id={title} />
  </div>
));
