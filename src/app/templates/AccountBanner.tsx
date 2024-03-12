import React, { HTMLAttributes, memo, ReactNode } from 'react';

import classNames from 'clsx';

import AccountTypeBadge from 'app/atoms/AccountTypeBadge';
import Identicon from 'app/atoms/Identicon';
import Money from 'app/atoms/Money';
import Name from 'app/atoms/Name';
import Balance from 'app/templates/Balance';
import { useGasToken } from 'lib/assets/hooks';
import { t } from 'lib/i18n';
import { NewTempleAccountBase } from 'lib/temple/types';

interface Props extends HTMLAttributes<HTMLDivElement> {
  account: NewTempleAccountBase;
  displayBalance?: boolean;
  networkRpc?: string;
  label?: ReactNode;
  labelDescription?: ReactNode;
  labelIndent?: 'sm' | 'md';
}

const AccountBanner = memo<Props>(
  ({ account, displayBalance = true, networkRpc, className, label, labelIndent = 'md', labelDescription }) => {
    const labelWithFallback = label ?? t('account');
    const { metadata } = useGasToken();

    return (
      <div className={classNames('flex flex-col', className)}>
        {(labelWithFallback || labelDescription) && (
          <h2 className={classNames(labelIndent === 'md' ? 'mb-4' : 'mb-2', 'leading-tight flex flex-col')}>
            {labelWithFallback && <span className="text-base font-semibold text-gray-700">{labelWithFallback}</span>}

            {labelDescription && (
              <span className="mt-1 text-xs font-light text-gray-600 max-w-9/10">{labelDescription}</span>
            )}
          </h2>
        )}

        <div className="w-full border rounded-md p-2 flex items-center">
          <Identicon type="bottts" hash={account.address} size={32} className="flex-shrink-0 shadow-xs" />

          <div className="flex flex-col items-start ml-2">
            <div className="flex flex-wrap items-center">
              <Name className="text-sm font-medium leading-tight text-gray-800">{account.title}</Name>

              <AccountTypeBadge accountType={account.type} />
            </div>

            <div className="flex flex-wrap items-center mt-1">
              <div className="text-xs leading-none text-gray-700">
                {(() => {
                  const val = account.address;
                  const ln = val.length;
                  return (
                    <>
                      {val.slice(0, 7)}
                      <span className="opacity-75">...</span>
                      {val.slice(ln - 4, ln)}
                    </>
                  );
                })()}
              </div>

              {displayBalance && (
                <Balance address={account.address} networkRpc={networkRpc}>
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
          </div>
        </div>
      </div>
    );
  }
);

export default AccountBanner;
