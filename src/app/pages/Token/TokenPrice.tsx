import React, { memo, useMemo } from 'react';

import clsx from 'clsx';

import { Money } from 'app/atoms';
import { useAssetFiatCurrencyPrice, useFiatCurrency } from 'lib/fiat-currency';
import useTippy, { UseTippyOptions } from 'lib/ui/useTippy';

interface Props {
  assetSlug: string;
  chainId: string | number;
  forEVM?: boolean;
}

export const TokenPrice = memo<Props>(({ assetSlug, chainId, forEVM }) => {
  const { selectedFiatCurrency } = useFiatCurrency();

  const price = useAssetFiatCurrencyPrice(assetSlug, chainId, forEVM);

  const symbol = selectedFiatCurrency.symbol;

  const basicTooltipProps = useMemo<UseTippyOptions>(
    () => ({
      trigger: 'mouseenter',
      animation: 'shift-away-subtle',
      placement: 'bottom',
      content: 'Token price'
    }),
    []
  );

  const tooltipWrapperRef = useTippy<HTMLSpanElement>(basicTooltipProps);

  return (
    <div className="h-6 flex items-center px-2 py-1 gap-x-1 bg-grey-4 border border-lines rounded-lg">
      <span
        ref={tooltipWrapperRef}
        className={clsx(
          'h-4 min-w-4 flex items-center justify-center text-[10px] leading-none select-none',
          'text-grey-4 bg-grey-2 rounded-full text-font-num-14 font-medium'
        )}
      >
        {symbol}
      </span>

      <span className="text-font-num-12">
        {price.isZero() ? (
          'No value'
        ) : (
          <Money cryptoDecimals={4} smallFractionFont={false}>
            {price}
          </Money>
        )}
      </span>
    </div>
  );
});
