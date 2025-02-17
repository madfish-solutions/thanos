import React, { memo, useCallback, useMemo } from 'react';

import { Anchor, HashShortView, IconBase } from 'app/atoms';
import { HashChip } from 'app/atoms/HashChip';
import { ReactComponent as CopyIcon } from 'app/icons/base/copy.svg';
import { ReactComponent as OutLinkIcon } from 'app/icons/base/outLink.svg';
import { toastSuccess } from 'app/toaster';
import { ExchangeHash } from 'lib/apis/exolix/types';
import { t } from 'lib/i18n';

import { InfoContainer, InfoRaw } from '../../../../components/InfoBlock';
import { CurrencyIcon } from '../../../components/CurrencyIcon';
import { DisplayExchangeValue } from '../../../components/DisplayExchangeValue';
import { VALUE_PLACEHOLDER } from '../../../config';
import { useCryptoExchangeDataState } from '../../../context';

export const CompletedStatusInfoBlocks = memo(() => {
  const { exchangeData } = useCryptoExchangeDataState();

  const handleCopyTxId = useCallback(() => {
    window.navigator.clipboard.writeText(exchangeData!.id);
    toastSuccess(t('copiedHash'));
  }, [exchangeData]);

  const sendTime = useMemo(() => {
    const date = new Date(exchangeData!.createdAt);

    const formattedDate = date
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      .replace(',', '');

    const formattedTime = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return `${formattedDate} ${formattedTime}`;
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
        <InfoRaw title="transactionHash">
          <TxHash exchangeHash={exchangeData.hashIn} />
        </InfoRaw>
      </InfoContainer>

      <InfoContainer className="mt-4 mb-6">
        <InfoRaw bottomSeparator title="youReceived">
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
        <InfoRaw title="transactionHash">
          <TxHash exchangeHash={exchangeData.hashOut} />
        </InfoRaw>
      </InfoContainer>

      <InfoContainer>
        <InfoRaw bottomSeparator title="transactionId">
          <div className="flex flex-row justify-center items-center gap-x-0.5">
            <span className="p-1 text-font-description max-w-32 truncate">{exchangeData.id}</span>
            <IconBase Icon={CopyIcon} className="cursor-pointer text-secondary" onClick={handleCopyTxId} />
          </div>
        </InfoRaw>
        <InfoRaw bottomSeparator title="depositAddress">
          <HashChip hash={exchangeData.depositAddress} />
        </InfoRaw>
        <InfoRaw bottomSeparator title="recipientAddress">
          <HashChip hash={exchangeData.withdrawalAddress} />
        </InfoRaw>
        <InfoRaw title="sendTime">
          <span className="p-1 text-font-description">{sendTime}</span>
        </InfoRaw>
      </InfoContainer>
    </>
  );
});

interface TxHashProps {
  exchangeHash: ExchangeHash;
}

const TxHash = memo<TxHashProps>(({ exchangeHash }) => {
  if (exchangeHash.hash && exchangeHash.link) {
    return (
      <Anchor href={exchangeHash.link} className="flex items-center gap-x-0.5 text-secondary">
        <span className="text-font-num-12">
          <HashShortView hash={exchangeHash.hash} firstCharsCount={6} lastCharsCount={4} />
        </span>

        <IconBase Icon={OutLinkIcon} size={12} />
      </Anchor>
    );
  }

  if (exchangeHash.hash) {
    return (
      <span className="text-font-num-12">
        <HashShortView hash={exchangeHash.hash} firstCharsCount={6} lastCharsCount={4} />
      </span>
    );
  }

  return <span className="p-1 text-font-description">{VALUE_PLACEHOLDER}</span>;
});
