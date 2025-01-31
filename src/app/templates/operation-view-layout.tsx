import React, { useMemo } from 'react';

import { Loader } from 'app/atoms';
import { StoredAccount } from 'lib/temple/types';
import { BalancesChanges } from 'temple/types';

import { AccountCard } from './AccountCard';
import { BalancesChangesView } from './balances-changes-view';
import { TransactionTabs, TransactionTabsProps } from './TransactionTabs';
import { TxParamsFormData } from './TransactionTabs/types';

interface OperationViewLayoutProps<T extends TxParamsFormData> extends TransactionTabsProps<T> {
  sendingAccount: StoredAccount;
  balancesChanges: BalancesChanges;
  balancesChangesLoading: boolean;
}

export const OperationViewLayout = <T extends TxParamsFormData>({
  sendingAccount,
  balancesChanges,
  balancesChangesLoading,
  network,
  ...restProps
}: OperationViewLayoutProps<T>) => {
  const filteredBalancesChanges = useMemo(
    () => Object.fromEntries(Object.entries(balancesChanges).filter(([, { atomicAmount }]) => !atomicAmount.isZero())),
    [balancesChanges]
  );
  const expensesViewIsVisible = useMemo(
    () => Object.keys(filteredBalancesChanges).length > 0,
    [filteredBalancesChanges]
  );

  return (
    <>
      {expensesViewIsVisible ? (
        <BalancesChangesView balancesChanges={filteredBalancesChanges} chain={network} />
      ) : (
        balancesChangesLoading && (
          <div className="flex justify-center items-center">
            <Loader size="L" trackVariant="dark" className="text-primary" />
          </div>
        )
      )}

      <div className="flex flex-col">
        <AccountCard
          account={sendingAccount}
          isCurrent={false}
          attractSelf={false}
          searchValue=""
          showRadioOnHover={false}
        />

        <TransactionTabs<T> network={network} {...restProps} />
      </div>
    </>
  );
};
