import React, { HTMLAttributes, memo, ReactNode, useMemo } from 'react';

import classNames from 'clsx';

import AccountTypeBadge from 'app/atoms/AccountTypeBadge';
import Identicon from 'app/atoms/Identicon';
import Money from 'app/atoms/Money';
import Name from 'app/atoms/Name';
import Balance from 'app/templates/Balance';
import { useGasToken } from 'lib/assets/hooks';
import { t } from 'lib/i18n';
import { StoredAccountBase } from 'lib/temple/types';

interface Props extends HTMLAttributes<HTMLDivElement> {
  account: StoredAccountBase;
  tezosAddress?: string;
  evmAddress?: string;
  displayBalance?: boolean;
  networkRpc?: string;
  label?: ReactNode;
  labelDescription?: ReactNode;
  labelIndent?: 'sm' | 'md';
  smallLabelIndent?: boolean;
}

const AccountBanner = memo<Props>(
  ({
    account,
    tezosAddress,
    evmAddress,
    displayBalance = true,
    networkRpc,
    className,
    label,
    smallLabelIndent,
    labelDescription
  }) => {
    const labelWithFallback = label ?? t('account');
    const { metadata } = useGasToken();

    return (
      <div className={classNames('flex flex-col', className)}>
        {(labelWithFallback || labelDescription) && (
          <h2 className={classNames(smallLabelIndent ? 'mb-2' : 'mb-4', 'leading-tight flex flex-col')}>
            {labelWithFallback && <span className="text-base font-semibold text-gray-700">{labelWithFallback}</span>}

            {labelDescription && (
              <span className="mt-1 text-xs font-light text-gray-600 max-w-9/10">{labelDescription}</span>
            )}
          </h2>
        )}

        <div className="w-full border rounded-md p-2 flex items-center">
          <Identicon type="bottts" hash={account.id} size={32} className="flex-shrink-0 shadow-xs" />

          <div className="flex flex-col items-start ml-2">
            <div className="flex flex-wrap items-center">
              <Name className="text-sm font-medium leading-tight text-gray-800">{account.name}</Name>

              <AccountTypeBadge accountType={account.type} />
            </div>

            {tezosAddress && (
              <div className="flex flex-wrap items-center mt-1">
                <AccountBannerAddress address={tezosAddress} />

                {displayBalance && tezosAddress && (
                  <Balance address={tezosAddress} networkRpc={networkRpc}>
                    {bal => (
                      <div className="ml-2 text-xs leading-none flex items-baseline text-gray-600">
                        <Money>{bal}</Money>
                        <span className="ml-1" style={{ fontSize: '0.75em' }}>
                          {metadata.symbol}
                        </span>
                      </div>
                    )}
                  </Balance>
                )}
              </div>
            )}

            {evmAddress && (
              <div className="flex flex-wrap items-center mt-1">
                <AccountBannerAddress address={evmAddress} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default AccountBanner;

const AccountBannerAddress = memo<{ address: string }>(({ address }) => {
  const [start, end] = useMemo(() => {
    const ln = address.length;

    return [address.slice(0, 7), address.slice(ln - 4, ln)];
  }, [address]);

  return (
    <div className="text-xs leading-none text-gray-700">
      {start}
      <span className="opacity-75">...</span>
      {end}
    </div>
  );
});
