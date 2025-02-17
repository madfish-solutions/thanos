import React, { FC, memo, ReactNode } from 'react';

import { CaptionAlert, IconBase, PageTitle } from 'app/atoms';
import { IconBaseProps } from 'app/atoms/IconBase';
import { ReactComponent as CardIcon } from 'app/icons/base/card.svg';
import { ReactComponent as RouteIcon } from 'app/icons/base/route.svg';
import PageLayout from 'app/layouts/PageLayout';
import { t } from 'lib/i18n/react';
import { useBooleanState } from 'lib/ui/hooks';

import { BuyWithCreditCard } from './buy-with-credit-card';
import { CryptoExchange } from './crypto-exchange';
import { ExchangeCountdown } from './crypto-exchange/components/ExchangeCountdown';
import { CryptoExchangeDataProvider, useCryptoExchangeDataState } from './crypto-exchange/context';

export const Market = memo(() => {
  const [cryptoExchangeModalOpened, setCryptoExchangeModalOpen, setCryptoExchangeModalClosed] = useBooleanState(false);
  const [debitCreditCardModalOpened, setDebitCreditCardModalOpen, setDebitCreditCardModalClosed] =
    useBooleanState(false);

  return (
    <>
      <PageLayout pageTitle={<PageTitle title={t('market')} />} noScroll>
        <CaptionAlert type="info" message={t('marketPageDisclaimer')} className="mb-4" />

        <CryptoExchangeDataProvider>
          <Option
            Icon={RouteIcon}
            title={t('cryptoExchange')}
            description={t('cryptoExchangeDescription')}
            extraInnerComponent={<Timer />}
            onClick={setCryptoExchangeModalOpen}
          />
        </CryptoExchangeDataProvider>
        <Option
          Icon={CardIcon}
          title={t('debitCreditCard')}
          description={t('debitCreditCardDescription')}
          onClick={setDebitCreditCardModalOpen}
        />
      </PageLayout>

      <CryptoExchangeDataProvider>
        <CryptoExchange opened={cryptoExchangeModalOpened} onRequestClose={setCryptoExchangeModalClosed} />
      </CryptoExchangeDataProvider>

      <BuyWithCreditCard opened={debitCreditCardModalOpened} onRequestClose={setDebitCreditCardModalClosed} />
    </>
  );
});

const Timer = memo(() => {
  const { exchangeData } = useCryptoExchangeDataState();

  if (!exchangeData) return null;

  return (
    <div className="flex flex-row justify-center items-center w-15 h-5 gap-x-1 bg-warning-low rounded-6">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
      </span>
      <ExchangeCountdown className="text-font-small-bold w-8" />
    </div>
  );
});

interface OptionProps extends Pick<IconBaseProps, 'Icon'> {
  title: string;
  description: string;
  extraInnerComponent?: ReactNode;
  onClick?: EmptyFn;
}

const Option: FC<OptionProps> = ({ Icon, title, description, extraInnerComponent, onClick }) => (
  <div
    className="cursor-pointer flex justify-between items-center mb-3 p-3 gap-x-3 rounded-lg shadow-bottom border-0.5 border-transparent hover:border-lines"
    onClick={onClick}
  >
    <CircleIcon Icon={Icon} size={32} className="text-primary" />

    <div className="flex flex-col gap-y-1">
      <div className="flex flex-row gap-x-2">
        <span className="text-font-medium-bold">{title}</span>
        {extraInnerComponent}
      </div>
      <span className="text-font-description text-grey-1">{description}</span>
    </div>
  </div>
);

const CircleIcon: FC<IconBaseProps> = props => (
  <div className="flex justify-center items-center bg-primary-low p-3 rounded-full">
    <IconBase {...props} />
  </div>
);
