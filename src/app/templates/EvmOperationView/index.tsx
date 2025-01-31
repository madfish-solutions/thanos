import React, { memo } from 'react';

import {
  EvmTransactionRequestWithSender,
  TempleEvmDAppConnectPayload,
  TempleEvmDAppPayload,
  TempleEvmDAppSignPayload
} from 'lib/temple/types';

import { EvmEstimationDataProvider } from '../TransactionTabs/context';

import { EvmTransactionView } from './evm-transaction-view';

interface EvmOperationViewProps {
  payload: Exclude<TempleEvmDAppPayload, TempleEvmDAppConnectPayload | TempleEvmDAppSignPayload>;
  formId: string;
  error: any;
  setFinalEvmTransaction: ReactSetStateFn<EvmTransactionRequestWithSender>;
  onSubmit: EmptyFn;
}

// TODO: add layouts for other types of EVM dApp actions
export const EvmOperationView = memo<EvmOperationViewProps>(
  ({ payload, formId, error, setFinalEvmTransaction, onSubmit }) => (
    <EvmEstimationDataProvider>
      <EvmTransactionView
        error={error}
        payload={payload}
        formId={formId}
        setFinalEvmTransaction={setFinalEvmTransaction}
        onSubmit={onSubmit}
      />
    </EvmEstimationDataProvider>
  )
);
