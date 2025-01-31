import React, { FC } from 'react';

import { AccountCard } from 'app/templates/AccountCard';
import { EvmOperationView } from 'app/templates/EvmOperationView';
import { ModifyFeeAndLimit } from 'app/templates/ExpensesView/ExpensesView';
import TezosOperationView from 'app/templates/TezosOperationView';
import { StoredAccount, TempleEvmDAppPayload, TempleTezosDAppPayload } from 'lib/temple/types';
import { NetworkEssentials } from 'temple/networks';
import { TempleChainKind } from 'temple/types';

import { AddAssetView } from './add-asset/add-asset-view';
import { AddChainView } from './add-chain/add-chain-view';
import { ConnectView } from './connect-view';

type DAppPayload<T extends TempleChainKind> = T extends TempleChainKind.EVM
  ? TempleEvmDAppPayload
  : TempleTezosDAppPayload;

type ExcludedDAppPayloads = 'connect' | 'add_chain' | 'add_asset';
type OperationDAppPayload<T extends TempleChainKind> = Exclude<DAppPayload<T>, { type: ExcludedDAppPayloads }>;

interface OperationViewProps<T extends TempleChainKind> {
  network: NetworkEssentials<T>;
  payload: OperationDAppPayload<T>;
  error?: any;
  modifyFeeAndLimit?: ModifyFeeAndLimit;
}

interface PayloadContentProps<T extends TempleChainKind> extends Omit<OperationViewProps<T>, 'payload'> {
  account: StoredAccount;
  payload: DAppPayload<T>;
  openAccountsModal: EmptyFn;
}

const PayloadContentHOC =
  <T extends TempleChainKind>(OperationView: FC<OperationViewProps<T>>) =>
  ({ network, payload, error, modifyFeeAndLimit, account, openAccountsModal }: PayloadContentProps<T>) => {
    const shouldShowAccountCard = payload.type !== 'add_chain' && payload.type !== 'add_asset';

    return (
      <div className="w-full flex flex-col gap-4">
        {shouldShowAccountCard && (
          <AccountCard
            account={account}
            isCurrent={false}
            attractSelf={false}
            searchValue=""
            showRadioOnHover={false}
            onClick={openAccountsModal}
          />
        )}
        {(() => {
          switch (payload.type) {
            case 'connect':
              return <ConnectView />;
            case 'add_asset':
              return <AddAssetView metadata={payload.metadata} />;
            case 'add_chain':
              return <AddChainView metadata={payload.metadata} />;
            default:
              return (
                <OperationView
                  network={network}
                  payload={payload as OperationDAppPayload<T>}
                  error={error}
                  modifyFeeAndLimit={modifyFeeAndLimit}
                />
              );
          }
        })()}
      </div>
    );
  };

export const TezosPayloadContent = PayloadContentHOC<TempleChainKind.Tezos>(TezosOperationView);

export const EvmPayloadContent = PayloadContentHOC<TempleChainKind.EVM>(EvmOperationView);
