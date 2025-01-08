import React, { memo, useMemo } from 'react';

import BigNumber from 'bignumber.js';
import clsx from 'clsx';

import Money from 'app/atoms/Money';
import FastIconSrc from 'app/icons/fee-options/fast.svg?url';
import MiddleIconSrc from 'app/icons/fee-options/middle.svg?url';
import SlowIconSrc from 'app/icons/fee-options/slow.svg?url';
import InFiat from 'app/templates/InFiat';
import { getAssetSymbol, TEZOS_METADATA } from 'lib/metadata';
import { OneOfChains } from 'temple/front/chains';
import { TempleChainKind } from 'temple/types';

import { DisplayedFeeOptions, FeeOptionLabel } from '../types';

interface Option {
  label: FeeOptionLabel;
  iconSrc: string;
  textColorClassName: string;
}

const options: Option[] = [
  { label: 'slow', iconSrc: SlowIconSrc, textColorClassName: 'text-error' },
  { label: 'mid', iconSrc: MiddleIconSrc, textColorClassName: 'text-warning' },
  { label: 'fast', iconSrc: FastIconSrc, textColorClassName: 'text-success' }
];

interface FeeOptionsProps {
  network: OneOfChains;
  assetSlug: string;
  activeOptionName: FeeOptionLabel | nullish;
  displayedFeeOptions: DisplayedFeeOptions;
  onOptionClick?: (label: FeeOptionLabel) => void;
}

export const FeeOptions = memo<FeeOptionsProps>(
  ({ network, assetSlug, activeOptionName, displayedFeeOptions, onOptionClick }) => (
    <div className="flex flex-row gap-x-2">
      {options.map(option => (
        <Option
          key={option.label}
          network={network}
          assetSlug={assetSlug}
          option={option}
          value={displayedFeeOptions[option.label]}
          active={activeOptionName === option.label}
          onClick={() => onOptionClick?.(option.label)}
        />
      ))}
    </div>
  )
);

interface OptionProps {
  network: OneOfChains;
  assetSlug: string;
  active: boolean;
  option: Option;
  value: string;
  onClick?: EmptyFn;
}

const Option = memo<OptionProps>(({ network, assetSlug, active, option, value, onClick }) => {
  const isEvm = network.kind === TempleChainKind.EVM;

  const nativeAssetSymbol = useMemo(() => getAssetSymbol(isEvm ? network?.currency : TEZOS_METADATA), [isEvm, network]);

  return (
    <div
      className={clsx(
        'flex flex-col flex-1 justify-center cursor-pointer',
        'items-center shadow-bottom p-2 gap-y-1 rounded-lg border-1.5',
        active ? 'border-primary' : 'border-transparent'
      )}
      onClick={onClick}
    >
      <div className="flex flex-col text-center">
        <img src={option.iconSrc} alt={option.label} className="my-1.5" />
        <span className={clsx('text-font-description-bold uppercase', option.textColorClassName)}>{option.label}</span>
      </div>
      <div className="flex flex-col text-center">
        <InFiat
          chainId={network.chainId}
          assetSlug={assetSlug}
          volume={value}
          smallFractionFont={false}
          roundingMode={BigNumber.ROUND_FLOOR}
          evm={isEvm}
        >
          {({ balance, symbol }) => (
            <span className="text-font-num-bold-12">
              {symbol}
              {balance}
            </span>
          )}
        </InFiat>
        <span className="text-font-description text-grey-2">
          <Money
            cryptoDecimals={nativeAssetSymbol.length > 4 ? 5 : 6}
            smallFractionFont={false}
            tooltipPlacement="bottom"
          >
            {value}
          </Money>{' '}
          {nativeAssetSymbol}
        </span>
      </div>
    </div>
  );
});
