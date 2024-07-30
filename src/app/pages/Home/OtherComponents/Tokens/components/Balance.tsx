import React, { memo } from 'react';

import BigNumber from 'bignumber.js';

import Money from 'app/atoms/Money';
import InFiat from 'app/templates/InFiat';
import { TestIDProps } from 'lib/analytics';

interface CryptoBalanceProps extends TestIDProps {
  value: BigNumber;
}

export const CryptoBalance = memo<CryptoBalanceProps>(({ value, testID, testIDProperties }) => (
  <div className="truncate text-font-num-14 text-right ml-4 flex-1 flex justify-end">
    <Money smallFractionFont={false} testID={testID} testIDProperties={testIDProperties}>
      {value}
    </Money>
  </div>
));

interface FiatBalanceProps extends CryptoBalanceProps {
  chainId: number | string;
  assetSlug: string;
  evm?: boolean;
}

export const FiatBalance = memo<FiatBalanceProps>(
  ({ evm = false, chainId, assetSlug, value, testID, testIDProperties }) => (
    <InFiat
      evm={evm}
      chainId={chainId}
      assetSlug={assetSlug}
      volume={value}
      smallFractionFont={false}
      testID={testID}
      testIDProperties={testIDProperties}
    >
      {({ balance, symbol }) => (
        <div className="ml-1 text-font-num-12 text-grey-1 flex items-center truncate text-right">
          {balance}
          <span className="ml-1">{symbol}</span>
        </div>
      )}
    </InFiat>
  )
);
