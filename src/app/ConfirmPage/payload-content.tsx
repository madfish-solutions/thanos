import React, { FC, memo } from 'react';

import type { Omit as StrictOmit } from 'viem';

import { IconBase } from 'app/atoms';
import { ReactComponent as UnlockFillIcon } from 'app/icons/base/unlock_fill.svg';
import { AccountCard } from 'app/templates/AccountCard';
import { EvmOperationView } from 'app/templates/EvmOperationView';
import { SignPayloadView } from 'app/templates/SignPayloadView';
import { TezosOperationView } from 'app/templates/TezosOperationView';
import { T, TID } from 'lib/i18n';
import {
  EvmTransactionRequestWithSender,
  StoredAccount,
  TempleEvmDAppConnectPayload,
  TempleEvmDAppPayload,
  TempleEvmDAppSignPayload,
  TempleTezosDAppOperationsPayload,
  TempleTezosDAppPayload
} from 'lib/temple/types';
import { NetworkEssentials } from 'temple/networks';
import { TempleChainKind } from 'temple/types';

type DAppPayload<T extends TempleChainKind> = T extends TempleChainKind.EVM
  ? TempleEvmDAppPayload
  : TempleTezosDAppPayload;

type DAppOperationsPayload<T extends TempleChainKind> = T extends TempleChainKind.Tezos
  ? TempleTezosDAppOperationsPayload
  : Exclude<TempleEvmDAppPayload, TempleEvmDAppConnectPayload | TempleEvmDAppSignPayload>;

interface OperationViewPropsBase<T extends TempleChainKind> {
  network: NetworkEssentials<T>;
  payload: DAppOperationsPayload<T>;
  error: any;
  formId: string;
  onSubmit: EmptyFn;
}

interface PayloadContentPropsBase<T extends TempleChainKind> extends Omit<OperationViewPropsBase<T>, 'payload'> {
  account: StoredAccount;
  payload: DAppPayload<T>;
  openAccountsModal: EmptyFn;
}

const permissionsDescriptionsI18nKeys: TID[] = [
  'viewWalletPermissionDescription',
  'transactionsPermissionDescription',
  'signingPermissionDescription'
];

const ConnectView = memo<{ account: StoredAccount; openAccountsModal: EmptyFn }>(({ account, openAccountsModal }) => (
  <>
    <AccountCard
      account={account}
      isCurrent={false}
      attractSelf={false}
      searchValue=""
      showRadioOnHover={false}
      onClick={openAccountsModal}
    />
    <div className="bg-white shadow-bottom rounded-lg p-4">
      <p className="my-1 text-font-description-bold text-grey-1">
        <T id="permissions" />
      </p>
      {permissionsDescriptionsI18nKeys.map(key => (
        <div className="flex justify-between items-center py-2.5" key={key}>
          <span className="text-font-description">
            <T id={key} />
          </span>
          <div className="bg-grey-4 rounded-md pl-1.5 pr-2 py-1 flex items-center gap-px">
            <IconBase Icon={UnlockFillIcon} size={12} className="text-success" />

            <span className="text-font-num-bold-10 uppercase">
              <T id="allowed" />
            </span>
          </div>
        </div>
      ))}
    </div>
  </>
));

const PayloadContentHOC = <
  T extends TempleChainKind,
  E extends StrictOmit<StringRecord<unknown>, keyof PayloadContentPropsBase<T>>
>(
  OperationView: FC<OperationViewPropsBase<T> & E>
) => {
  const PayloadContent: FC<PayloadContentPropsBase<T> & E> = ({
    network,
    payload,
    error,
    account,
    openAccountsModal,
    ...restProps
  }) => (
    <div className="w-full flex flex-col gap-4">
      {(() => {
        switch (payload.type) {
          case 'connect':
            return <ConnectView account={account} openAccountsModal={openAccountsModal} />;
          case 'sign':
          case 'personal_sign':
          case 'sign_typed':
            return <SignPayloadView payload={payload} />;
          default:
            // @ts-expect-error
            return <OperationView network={network} payload={payload} error={error} {...restProps} />;
        }
      })()}
    </div>
  );

  return PayloadContent;
};

export const TezosPayloadContent = PayloadContentHOC<
  TempleChainKind.Tezos,
  { setTotalFee: SyncFn<number>; setStorageLimit: SyncFn<number> }
>(TezosOperationView);

export const EvmPayloadContent = PayloadContentHOC<
  TempleChainKind.EVM,
  { setFinalEvmTransaction: ReactSetStateFn<EvmTransactionRequestWithSender> }
>(EvmOperationView);
