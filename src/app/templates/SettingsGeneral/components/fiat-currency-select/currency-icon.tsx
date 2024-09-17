import React, { memo } from 'react';

import { FiatCurrencyOption } from 'lib/fiat-currency';

import { CellPartProps } from '../select-with-modal';

export const CurrencyIcon = memo<CellPartProps<FiatCurrencyOption>>(({ option: { symbol } }) => (
  <div className="w-6 h-6 flex items-center justify-center bg-white border-px border-lines shadow-bottom">
    <span className="text-grey-1 leading-5 font-medium text-[13px]">{symbol}</span>
  </div>
));