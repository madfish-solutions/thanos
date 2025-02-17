import React, { memo, useCallback, useEffect, useState } from 'react';

import { FadeTransition } from 'app/a11y/FadeTransition';
import { CaptionAlert, IconBase } from 'app/atoms';
import { ActionsButtonsBox } from 'app/atoms/PageModal';
import { StyledButton } from 'app/atoms/StyledButton';
import { ReactComponent as CopyIcon } from 'app/icons/base/copy.svg';
import { toastSuccess } from 'app/toaster';
import { OrderStatusEnum } from 'lib/apis/exolix/types';
import { t, T } from 'lib/i18n';

import { InfoContainer, InfoRaw } from '../../../components/InfoBlock';
import { CurrencyIcon } from '../../components/CurrencyIcon';
import { DisplayExchangeValue } from '../../components/DisplayExchangeValue';
import { StepLabel } from '../../components/StepLabel';
import { Stepper } from '../../components/Stepper';
import { SupportLink } from '../../components/SupportLink';
import { useCryptoExchangeDataState } from '../../context';
import { useTopUpUpdate } from '../../hooks/use-top-up-update';
import { getCurrencyDisplayCode } from '../../utils';

import { DepositAddressBlock } from './components/DepositAddressBlock';
import { DepositMemoBlock } from './components/DepositMemoBlock';
import { ExpiresInBlock } from './components/ExpiresInBlock';

export const Deposit = memo(() => {
  const [isOrderOverdue, setIsOrderOverdue] = useState(false);

  const { exchangeData, setStep, reset } = useCryptoExchangeDataState();

  useTopUpUpdate();

  useEffect(() => {
    if (!exchangeData) return;

    switch (exchangeData.status) {
      case OrderStatusEnum.CONFIRMATION:
      case OrderStatusEnum.EXCHANGING:
        setStep(2);
        break;
      case OrderStatusEnum.OVERDUE:
        setIsOrderOverdue(true);
    }
  }, [exchangeData, setStep]);

  const shouldShowMemoBlock = Boolean(exchangeData?.depositExtraId);

  return (
    <FadeTransition>
      <div className="flex-1 pt-4 px-4 flex flex-col overflow-y-auto">
        <Stepper currentStep={1} />

        <StepLabel title="deposit" description="depositDescription" />

        {isOrderOverdue ? (
          <CaptionAlert type="error" title={t('orderExpired')} message={t('orderExpiredDescription')} />
        ) : (
          <>
            <CaptionAlert type="warning" message={t('depositDisclaimer')} />

            <ExpiresInBlock className="mt-4" />

            <DepositAddressBlock className="mt-6 mb-4" />

            {shouldShowMemoBlock && <DepositMemoBlock />}

            <InfoBlock />
          </>
        )}

        <SupportLink className="mt-6 mb-7" />
      </div>

      <ActionsButtonsBox>
        <StyledButton size="L" color={isOrderOverdue ? 'primary' : 'red-low'} onClick={reset}>
          <T id={isOrderOverdue ? 'retry' : 'cancelOrder'} />
        </StyledButton>
      </ActionsButtonsBox>
    </FadeTransition>
  );
});

const InfoBlock = memo(() => {
  const { exchangeData } = useCryptoExchangeDataState();

  const handleCopyTxId = useCallback(() => {
    window.navigator.clipboard.writeText(exchangeData!.id);
    toastSuccess('Copied');
  }, [exchangeData]);

  if (!exchangeData) return null;

  return (
    <InfoContainer>
      <InfoRaw bottomSeparator title="youGet">
        <div className="flex flex-row gap-x-0.5">
          <span className="p-1 text-font-description-bold">
            <DisplayExchangeValue value={exchangeData.amountTo} currencyCode={exchangeData.coinTo.coinCode} />
          </span>
          <CurrencyIcon src={exchangeData.coinTo.icon} code={exchangeData.coinTo.coinCode} size={24} />
        </div>
      </InfoRaw>
      <InfoRaw bottomSeparator title="exchangeRate">
        <span className="p-1 text-font-description">
          <span>{`1 ${getCurrencyDisplayCode(exchangeData.coinFrom.coinCode)} = `}</span>
          <DisplayExchangeValue value={exchangeData.rate} currencyCode={exchangeData.coinTo.coinCode} />
        </span>
      </InfoRaw>
      <InfoRaw title="transactionId">
        <div className="flex flex-row justify-center items-center gap-x-0.5">
          <span className="p-1 text-font-description max-w-32 truncate">{exchangeData.id}</span>
          <IconBase Icon={CopyIcon} className="cursor-pointer text-secondary" onClick={handleCopyTxId} />
        </div>
      </InfoRaw>
    </InfoContainer>
  );
});
