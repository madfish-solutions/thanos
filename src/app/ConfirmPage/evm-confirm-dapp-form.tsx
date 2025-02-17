import React, { memo, useCallback, useMemo, useRef, useState } from 'react';

import { CustomEvmChainIdContext } from 'lib/analytics';
import { useTempleClient } from 'lib/temple/front/client';
import { EvmTransactionRequestWithSender, StoredAccount, TempleEvmDAppPayload } from 'lib/temple/types';
import { getAccountForEvm, isAccountOfActableType } from 'temple/accounts';
import { useAllAccounts, useAllEvmChains } from 'temple/front';

import { useAddAsset } from './add-asset/context';
import { useAddChainDataState } from './add-chain/context';
import { ConfirmDAppForm, ConfirmDAppFormContentProps } from './confirm-dapp-form';
import { EvmPayloadContent } from './payload-content';

interface EvmConfirmDAppFormProps {
  payload: TempleEvmDAppPayload;
  id: string;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const EvmConfirmDAppForm = memo<EvmConfirmDAppFormProps>(({ payload, id }) => {
  const { confirmDAppPermission, confirmDAppSign, confirmEvmDAppOperation, confirmDAppEvmChainAdding } =
    useTempleClient();

  const [finalEvmTransaction, setFinalEvmTransaction] = useState<EvmTransactionRequestWithSender>(() =>
    payload.type === 'confirm_operations' ? payload.req : { to: ZERO_ADDRESS, from: ZERO_ADDRESS }
  );
  const evmTransactionRef = useRef(finalEvmTransaction);
  const updateFinalEvmTransaction = useCallback<ReactSetStateFn<EvmTransactionRequestWithSender>>(newEvmTransaction => {
    setFinalEvmTransaction(newEvmTransaction);
    evmTransactionRef.current =
      typeof newEvmTransaction === 'function' ? newEvmTransaction(evmTransactionRef.current) : newEvmTransaction;
  }, []);

  const modifiedPayload = useMemo(
    () => (payload.type === 'confirm_operations' ? { ...payload, req: finalEvmTransaction } : payload),
    [payload, finalEvmTransaction]
  );

  const { testnet } = useAddChainDataState();
  const { handleConfirm: confirmAssetAdding } = useAddAsset();

  const allAccountsStored = useAllAccounts();
  const allAccounts = useMemo(
    () => allAccountsStored.filter(acc => isAccountOfActableType(acc) && getAccountForEvm(acc)),
    [allAccountsStored]
  );

  const evmChains = useAllEvmChains();
  const chainId = Number(payload.chainId);

  const network = useMemo(
    () => ({ chainId, rpcBaseURL: payload.type === 'add_chain' ? '' : evmChains[chainId].rpcBaseURL }),
    [chainId, evmChains, payload.type]
  );

  const handleConfirm = useCallback(
    async (confirmed: boolean, selectedAccount: StoredAccount) => {
      const accountPkh = getAccountForEvm(selectedAccount)!.address;
      switch (payload.type) {
        case 'connect':
          return confirmDAppPermission(id, confirmed, accountPkh);
        case 'add_asset':
          return confirmAssetAdding(id, confirmed, payload.metadata);
        case 'add_chain':
          return confirmDAppEvmChainAdding(id, confirmed, testnet);

        case 'personal_sign':
        case 'sign_typed':
          return confirmDAppSign(id, confirmed);

        case 'confirm_operations':
          return confirmEvmDAppOperation(id, confirmed, evmTransactionRef.current);
      }
    },
    [
      payload,
      confirmDAppPermission,
      id,
      confirmAssetAdding,
      confirmDAppEvmChainAdding,
      testnet,
      confirmDAppSign,
      confirmEvmDAppOperation
    ]
  );

  const renderPayload = useCallback(
    ({ openAccountsModal, selectedAccount, formId, onSubmit, error }: ConfirmDAppFormContentProps) => (
      <EvmPayloadContent
        network={network}
        error={error}
        account={selectedAccount}
        payload={modifiedPayload}
        openAccountsModal={openAccountsModal}
        formId={formId}
        onSubmit={onSubmit}
        extraProps={{ setFinalEvmTransaction: updateFinalEvmTransaction }}
      />
    ),
    [modifiedPayload, network, updateFinalEvmTransaction]
  );

  return (
    <CustomEvmChainIdContext.Provider value={chainId}>
      <ConfirmDAppForm accounts={allAccounts} payload={modifiedPayload} onConfirm={handleConfirm}>
        {renderPayload}
      </ConfirmDAppForm>
    </CustomEvmChainIdContext.Provider>
  );
});
