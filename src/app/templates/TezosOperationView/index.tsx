import React, { memo } from 'react';

import { TezosEstimationDataProvider } from '../TransactionTabs/context';

import { TezosTransactionView, TezosTransactionViewProps } from './tezos-transaction-view';

export const TezosOperationView = memo<TezosTransactionViewProps>(
  ({ payload, formId, error, setTotalFee, setStorageLimit, onSubmit }) => (
    <TezosEstimationDataProvider>
      <TezosTransactionView
        error={error}
        payload={payload}
        formId={formId}
        setTotalFee={setTotalFee}
        setStorageLimit={setStorageLimit}
        onSubmit={onSubmit}
      />
    </TezosEstimationDataProvider>
  )
);
