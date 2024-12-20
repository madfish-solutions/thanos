import React, { memo } from 'react';

import clsx from 'clsx';

import Money from 'app/atoms/Money';
import { T } from 'lib/i18n';

import { CurrencyIcon } from '../../../components/CurrencyIcon';
import { ExchangeCountdown } from '../../../components/ExchangeCountdown';
import { EXOLIX_DECIMALS } from '../../../config';
import { useCryptoExchangeDataState } from '../../../context';
import { getCurrencyDisplayCode } from '../../../utils';

interface Props {
  className?: string;
}

export const ExpiresInBlock = memo<Props>(({ className }) => {
  const { exchangeData } = useCryptoExchangeDataState();

  if (!exchangeData) return null;

  return (
    <div className={clsx('rounded-lg shadow-bottom border-0.5 border-transparent', className)}>
      <div className="flex flex-row justify-between bg-grey-4 rounded-tl-7 rounded-tr-7 py-2.5 px-4 mt-0.5 mx-0.5">
        <span className="text-font-description-bold text-grey-1">
          <T id="expiresIn" />
        </span>
        <ExchangeCountdown className="text-font-num-bold-12 w-8" />
      </div>
      <div className="flex flex-col justify-center items-center gap-y-2 p-4 pt-2.5">
        <div className="flex flex-row items-center gap-x-2">
          <CurrencyIcon src={exchangeData.coinFrom.icon} code={exchangeData.coinFrom.coinCode} size={24} />
          <span className={exchangeData.amount.length > 12 ? 'text-font-num-bold-14' : 'text-font-num-bold-16'}>
            <Money cryptoDecimals={EXOLIX_DECIMALS} smallFractionFont={false} tooltipPlacement="bottom">
              {exchangeData.amount}
            </Money>{' '}
            {getCurrencyDisplayCode(exchangeData.coinFrom.coinCode)}
          </span>
        </div>
        <span className="text-font-description text-grey-1 text-center">
          <T
            id="sendInOneTransaction"
            substitutions={[
              <span key="networkName" className="text-font-description-bold">
                {exchangeData.coinFrom.networkName}
              </span>
            ]}
          />
        </span>
      </div>
    </div>
  );
});
