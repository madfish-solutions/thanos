import React, { memo, useCallback, useMemo, useRef } from 'react';

import { CustomTezosChainIdContext } from 'lib/analytics';
import { useTempleClient } from 'lib/temple/front/client';
import { StoredAccount, TempleTezosDAppPayload } from 'lib/temple/types';
import { getAccountForTezos, isAccountOfActableType } from 'temple/accounts';
import { useAllAccounts, useTezosChainIdLoadingValue } from 'temple/front';

import { ConfirmDAppForm, ConfirmDAppFormContentProps } from './confirm-dapp-form';
import { TezosPayloadContent } from './payload-content';

interface TezosConfirmDAppFormProps {
  payload: TempleTezosDAppPayload;
  id: string;
}

export const TezosConfirmDAppForm = memo<TezosConfirmDAppFormProps>(({ payload, id }) => {
  const { confirmDAppPermission, confirmTezosDAppOperation, confirmDAppSign } = useTempleClient();

  const allAccountsStored = useAllAccounts();
  const allAccounts = useMemo(
    () => allAccountsStored.filter(acc => isAccountOfActableType(acc) && getAccountForTezos(acc)),
    [allAccountsStored]
  );

  const tezosChainId = useTezosChainIdLoadingValue(payload.networkRpc, true)!;

  const network = useMemo(
    () => ({ chainId: tezosChainId, rpcBaseURL: payload.networkRpc }),
    [tezosChainId, payload.networkRpc]
  );

  const revealFee = useMemo(() => {
    if (
      payload.type === 'confirm_operations' &&
      payload.estimates &&
      payload.estimates.length === payload.opParams.length + 1
    ) {
      return payload.estimates[0].suggestedFeeMutez;
    }

    return 0;
  }, [payload]);

  const initialTotalFeeValue = useMemo(
    () =>
      (payload.type === 'confirm_operations' &&
        payload.opParams.reduce((sum, op) => sum + (op.fee ? +op.fee : 0), 0) + revealFee) ||
      0,
    [payload, revealFee]
  );
  const modifiedTotalFeeValueRef = useRef(initialTotalFeeValue);
  const modifiedStorageLimitValueRef = useRef(
    (payload.type === 'confirm_operations' && payload.opParams[0].storageLimit) || 0
  );

  const setTotalFee = useCallback((value: number) => void (modifiedTotalFeeValueRef.current = value), []);
  const setStorageLimit = useCallback((value: number) => void (modifiedStorageLimitValueRef.current = value), []);

  const handleConfirm = useCallback(
    async (confirmed: boolean, selectedAccount: StoredAccount) => {
      const accountPkh = getAccountForTezos(selectedAccount)!.address;
      switch (payload.type) {
        case 'connect':
          return confirmDAppPermission(id, confirmed, accountPkh);

        case 'confirm_operations':
          return confirmTezosDAppOperation(
            id,
            confirmed,
            modifiedTotalFeeValueRef.current - revealFee,
            modifiedStorageLimitValueRef.current
          );

        case 'sign':
          return confirmDAppSign(id, confirmed);
      }
    },
    [payload.type, confirmDAppPermission, id, confirmTezosDAppOperation, revealFee, confirmDAppSign]
  );

  const renderPayload = useCallback(
    ({ openAccountsModal, selectedAccount, error, formId, onSubmit }: ConfirmDAppFormContentProps) => (
      <TezosPayloadContent
        network={network}
        error={error}
        setTotalFee={setTotalFee}
        setStorageLimit={setStorageLimit}
        account={selectedAccount}
        payload={payload}
        openAccountsModal={openAccountsModal}
        formId={formId}
        onSubmit={onSubmit}
      />
    ),
    [network, payload, setTotalFee, setStorageLimit]
  );

  return (
    <CustomTezosChainIdContext.Provider value={tezosChainId}>
      <ConfirmDAppForm accounts={allAccounts} payload={payload} onConfirm={handleConfirm}>
        {renderPayload}
      </ConfirmDAppForm>
    </CustomTezosChainIdContext.Provider>
  );
});
