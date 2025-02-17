import React, { memo, useCallback } from 'react';

import { IconBase } from 'app/atoms';
import { HashChip } from 'app/atoms/HashChip';
import { ReactComponent as CopyIcon } from 'app/icons/base/copy.svg';
import { toastSuccess } from 'app/toaster';
import { t } from 'lib/i18n';

import { InfoContainer, InfoRaw } from '../../../../components/InfoBlock';
import { CurrencyIcon } from '../../../components/CurrencyIcon';
import { DisplayExchangeValue } from '../../../components/DisplayExchangeValue';
import { useCryptoExchangeDataState } from '../../../context';

export const InProgressStatusInfoBlocks = memo(() => {
  const { exchangeData } = useCryptoExchangeDataState();

  const handleCopyTxId = useCallback(() => {
    window.navigator.clipboard.writeText(exchangeData!.id);
    toastSuccess(t('copiedHash'));
  }, [exchangeData]);

  if (!exchangeData) return null;

  return (
    <>
      <InfoContainer>
        <InfoRaw bottomSeparator title="youSent">
          <div className="flex flex-row gap-x-0.5">
            <span className="p-1 text-font-description-bold">
              <DisplayExchangeValue value={exchangeData.amount} currencyCode={exchangeData.coinFrom.coinCode} />
            </span>
            <CurrencyIcon src={exchangeData.coinFrom.icon} code={exchangeData.coinFrom.coinCode} size={24} />
          </div>
        </InfoRaw>
        <InfoRaw bottomSeparator title="network">
          <span className="p-1 text-font-description">{exchangeData.coinFrom.networkName}</span>
        </InfoRaw>
        <InfoRaw title="depositAddress">
          <HashChip hash={exchangeData.depositAddress} />
        </InfoRaw>
      </InfoContainer>

      <InfoContainer className="my-4">
        <InfoRaw bottomSeparator title="youGet">
          <div className="flex flex-row gap-x-0.5">
            <span className="p-1 text-font-description-bold">
              <DisplayExchangeValue value={exchangeData.amountTo} currencyCode={exchangeData.coinTo.coinCode} />
            </span>
            <CurrencyIcon src={exchangeData.coinTo.icon} code={exchangeData.coinTo.coinCode} size={24} />
          </div>
        </InfoRaw>
        <InfoRaw bottomSeparator title="network">
          <span className="p-1 text-font-description">{exchangeData.coinTo.networkName}</span>
        </InfoRaw>
        <InfoRaw title="recipientAddress">
          <HashChip hash={exchangeData.withdrawalAddress} />
        </InfoRaw>
      </InfoContainer>

      <InfoContainer>
        <InfoRaw title="transactionId">
          <div className="flex flex-row justify-center items-center gap-x-0.5">
            <span className="p-1 text-font-description max-w-32 truncate">{exchangeData.id}</span>
            <IconBase Icon={CopyIcon} className="cursor-pointer text-secondary" onClick={handleCopyTxId} />
          </div>
        </InfoRaw>
      </InfoContainer>
    </>
  );
});
