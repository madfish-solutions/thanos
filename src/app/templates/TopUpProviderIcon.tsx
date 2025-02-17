import React, { FC } from 'react';

import classNames from 'clsx';

import { ReactComponent as AliceBobIcon } from 'app/icons/alice-bob.svg';
import { ReactComponent as MoonPayIcon } from 'app/icons/moonpay.svg';
import { ReactComponent as UtorgIcon } from 'app/icons/utorg.svg';
import { TopUpProviderId } from 'lib/buy-with-credit-card/top-up-provider-id.enum';

type Size = 24 | 40;

interface TopUpProviderIconProps {
  providerId: TopUpProviderId;
  size?: Size;
}

const providersIcons: Record<TopUpProviderId, ImportedSVGComponent> = {
  [TopUpProviderId.MoonPay]: MoonPayIcon,
  [TopUpProviderId.Utorg]: UtorgIcon,
  [TopUpProviderId.AliceBob]: AliceBobIcon
};

const ICON_CLASSNAME: Record<Size, string> = {
  24: 'h-6 w-6',
  40: 'h-10 w-10'
};

const CONTAINER_CLASSNAME: Record<Size, string> = {
  24: 'rounded',
  40: 'rounded-8'
};

export const TopUpProviderIcon: FC<TopUpProviderIconProps> = ({ providerId, size = 24 }) => {
  const Icon = providersIcons[providerId];

  return (
    <div className={classNames(CONTAINER_CLASSNAME[size], 'overflow-hidden rounded')}>
      <Icon className={ICON_CLASSNAME[size]} />
    </div>
  );
};
