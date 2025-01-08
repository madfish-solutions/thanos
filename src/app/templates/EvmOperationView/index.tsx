import React, { ReactNode, memo } from 'react';

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
  setCustomTitle: ReactSetStateFn<ReactNode>;
  onSubmit: EmptyFn;
}

// TODO: add layouts for other types of EVM dApp actions
export const EvmOperationView = memo<EvmOperationViewProps>(
  ({ payload, formId, error, setFinalEvmTransaction, setCustomTitle, onSubmit }) => (
    <EvmEstimationDataProvider>
      <EvmTransactionView
        error={error}
        payload={payload}
        formId={formId}
        setFinalEvmTransaction={setFinalEvmTransaction}
        setCustomTitle={setCustomTitle}
        onSubmit={onSubmit}
      />
    </EvmEstimationDataProvider>
  )
);
