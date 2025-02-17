import React, { memo } from 'react';

import { Button, IconBase } from 'app/atoms';
import { ReactComponent as CompactDown } from 'app/icons/base/compact_down.svg';

import { TopUpInputInterface } from '../topup.interface';

import { AssetIcon } from './AssetIcon';

interface Props {
  currency: TopUpInputInterface;
  useFlagIcon?: boolean;
  onClick?: EmptyFn;
}

export const SelectAssetButton = memo<Props>(({ currency, useFlagIcon, onClick }) => (
  <Button
    className="cursor-pointer flex justify-between items-center bg-white py-0.5 px-2 gap-x-1 rounded-8 w-[144px] h-[46px] border-0.5 border-transparent hover:border-lines"
    onClick={onClick}
  >
    <div className="flex items-center gap-x-2">
      <AssetIcon useFlagIcon={useFlagIcon} src={currency.icon} code={currency.code} />
      <div className="text-start">
        <p className="text-font-description-bold">{currency.code}</p>
        <p className="text-font-num-12 text-grey-1 w-[52px] truncate">{currency.name}</p>
      </div>
    </div>
    <IconBase Icon={CompactDown} className="text-primary" size={16} />
  </Button>
));
