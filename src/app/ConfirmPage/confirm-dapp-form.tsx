import React, { ReactNode, memo, useCallback, useMemo, useState } from 'react';

import clsx from 'clsx';

import { Alert, Anchor, IconBase } from 'app/atoms';
import ConfirmLedgerOverlay from 'app/atoms/ConfirmLedgerOverlay';
import DAppLogo from 'app/atoms/DAppLogo';
import { Logo } from 'app/atoms/Logo';
import { CloseButton, PageModal } from 'app/atoms/PageModal';
import { ActionsButtonsBox } from 'app/atoms/PageModal/actions-buttons-box';
import { ScrollView } from 'app/atoms/PageModal/scroll-view';
import { ProgressAndNumbers } from 'app/atoms/ProgressAndNumbers';
import { StyledButton } from 'app/atoms/StyledButton';
import { ReactComponent as LinkIcon } from 'app/icons/base/link.svg';
import { ReactComponent as OutLinkIcon } from 'app/icons/base/outLink.svg';
import { AccountsModalContent } from 'app/templates/AccountsModalContent';
import { EvmOperationKind, getOperationKind } from 'lib/evm/on-chain/transactions';
import { parseEvmTxRequest } from 'lib/evm/on-chain/utils/parse-evm-tx-request';
import { T, t } from 'lib/i18n';
import { useTempleClient } from 'lib/temple/front';
import { StoredAccount, TempleAccountType, TempleDAppPayload } from 'lib/temple/types';
import { useBooleanState, useSafeState } from 'lib/ui/hooks';
import { delay } from 'lib/utils';
import { useCurrentAccountId } from 'temple/front';
import { TempleChainKind } from 'temple/types';

import { useAddAsset } from './add-asset/context';
import { ConfirmPageSelectors } from './selectors';

export interface ConfirmDAppFormContentProps {
  selectedAccount: StoredAccount;
  error: any;
  formId: string;
  openAccountsModal: EmptyFn;
  onSubmit: EmptyFn;
}

interface ConfirmDAppFormProps {
  accounts: StoredAccount[];
  payload: TempleDAppPayload;
  onConfirm: (confirmed: boolean, selectedAccount: StoredAccount) => Promise<void>;
  children: (props: ConfirmDAppFormContentProps) => ReactNode | ReactNode[];
}

const CONFIRM_OPERATIONS_FORM_ID = 'confirm-operations-form';

const evmOperationTitles: Record<EvmOperationKind, ReactNode> = {
  [EvmOperationKind.DeployContract]: <T id="deployContract" />,
  [EvmOperationKind.Mint]: <T id="mint" />,
  [EvmOperationKind.Send]: <T id="send" />,
  [EvmOperationKind.Other]: <T id="unknownTransaction" />,
  [EvmOperationKind.Approval]: <T id="approval" />,
  [EvmOperationKind.Transfer]: <T id="confirmAction" substitutions={<T id="transfer" />} />
};

export const ConfirmDAppForm = memo<ConfirmDAppFormProps>(({ accounts, payload, onConfirm, children }) => {
  const [accountsModalIsOpen, openAccountsModal, closeAccountsModal] = useBooleanState(false);
  const [bottomEdgeIsVisible, setBottomEdgeIsVisible] = useState(true);
  const [isConfirming, setIsConfirming] = useSafeState(false);
  const [isDeclining, setIsDeclining] = useSafeState(false);
  const [error, setError] = useSafeState<any>(null);

  const { errorMessage: addAssetErrorMessage } = useAddAsset();

  const currentAccountId = useCurrentAccountId();
  const selectedAccountId = useMemo(
    () => (accounts.some(account => account.id === currentAccountId) ? currentAccountId : accounts[0].id),
    [accounts, currentAccountId]
  );
  const selectedAccount = useMemo(
    () => accounts.find(account => account.id === selectedAccountId)!,
    [accounts, selectedAccountId]
  );
  const { dAppQueueCounters } = useTempleClient();
  const { length: requestsLeft, maxLength: totalRequestsCount } = dAppQueueCounters;

  const shouldShowProgress =
    payload.type !== 'connect' &&
    payload.type !== 'add_chain' &&
    payload.type !== 'add_asset' &&
    totalRequestsCount > 1;

  const confirm = useCallback(
    async (confirmed: boolean) => {
      setError(null);
      try {
        await onConfirm(confirmed, selectedAccount);
      } catch (err: any) {
        console.error(err);

        // Human delay.
        await delay();
        setError(err);
      }
    },
    [onConfirm, selectedAccount, setError]
  );

  const handleConfirmClick = useCallback(async () => {
    if (isConfirming || isDeclining) return;

    setIsConfirming(true);
    await confirm(true);
    setIsConfirming(false);
  }, [confirm, isConfirming, isDeclining, setIsConfirming]);

  const handleDeclineClick = useCallback(async () => {
    if (isConfirming || isDeclining) return;

    setIsDeclining(true);
    await confirm(false);
    setIsDeclining(false);
  }, [confirm, isConfirming, isDeclining, setIsDeclining]);

  const handleErrorAlertClose = useCallback(() => setError(null), [setError]);

  const { title, confirmButtonName, confirmTestID, declineTestID, confirmDisabled } = useMemo(() => {
    switch (payload.type) {
      case 'connect':
        return {
          title: <T id="connectAccount" />,
          confirmButtonName: <T id={error ? 'retry' : 'connect'} />,
          confirmTestID: error
            ? ConfirmPageSelectors.ConnectAction_RetryButton
            : ConfirmPageSelectors.ConnectAction_ConnectButton,
          declineTestID: ConfirmPageSelectors.ConnectAction_CancelButton
        };
      case 'sign_typed':
      case 'personal_sign':
      case 'sign':
        return {
          title: <T id="signatureRequest" />,
          confirmButtonName: <T id="signAction" />,
          confirmTestID: ConfirmPageSelectors.SignAction_SignButton,
          declineTestID: ConfirmPageSelectors.SignAction_RejectButton
        };
      case 'add_asset':
        return {
          title: <T id="addToken" />,
          confirmButtonName: <T id={error ? 'retry' : 'confirm'} />,
          confirmTestID: error
            ? ConfirmPageSelectors.ConfirmOperationsAction_RetryButton
            : ConfirmPageSelectors.ConfirmOperationsAction_ConfirmButton,
          declineTestID: ConfirmPageSelectors.ConfirmOperationsAction_RejectButton,
          confirmDisabled: Boolean(addAssetErrorMessage)
        };
      case 'add_chain':
        return {
          title: <T id="addNetwork" />,
          confirmButtonName: <T id={error ? 'retry' : 'confirm'} />,
          confirmTestID: error
            ? ConfirmPageSelectors.ConfirmOperationsAction_RetryButton
            : ConfirmPageSelectors.ConfirmOperationsAction_ConfirmButton,
          declineTestID: ConfirmPageSelectors.ConfirmOperationsAction_RejectButton
        };
      default:
        return {
          title:
            payload.chainType === TempleChainKind.EVM ? (
              evmOperationTitles[getOperationKind(parseEvmTxRequest(payload).txSerializable)]
            ) : (
              <T id="confirmAction" substitutions={<T id="transfer" />} />
            ),
          confirmButtonName: <T id={error ? 'retry' : 'confirm'} />,
          confirmTestID: error
            ? ConfirmPageSelectors.ConfirmOperationsAction_RetryButton
            : ConfirmPageSelectors.ConfirmOperationsAction_ConfirmButton,
          declineTestID: ConfirmPageSelectors.ConfirmOperationsAction_RejectButton
        };
    }
  }, [payload, error, addAssetErrorMessage]);

  const isOperationsConfirm = payload.type === 'confirm_operations';

  return (
    <PageModal
      title={title}
      opened
      titleLeft={
        shouldShowProgress ? (
          <ProgressAndNumbers progress={totalRequestsCount - requestsLeft + 1} total={totalRequestsCount} />
        ) : null
      }
      titleRight={accountsModalIsOpen ? <CloseButton onClick={closeAccountsModal} /> : null}
      animated={false}
      onRequestClose={closeAccountsModal}
    >
      {accountsModalIsOpen ? (
        <AccountsModalContent
          accounts={accounts}
          currentAccountId={selectedAccountId}
          opened
          onRequestClose={closeAccountsModal}
        />
      ) : (
        <>
          <ScrollView className="p-4 gap-4" onBottomEdgeVisibilityChange={setBottomEdgeIsVisible}>
            {payload.type !== 'add_asset' && (
              <div className="mb-2 flex flex-col items-center gap-2">
                <div className="flex gap-2 relative">
                  <div className="w-13 h-13 flex justify-center items-center bg-white shadow-card rounded">
                    <Logo size={30} type="icon" />
                  </div>
                  <div className="w-13 h-13 flex justify-center items-center bg-white shadow-card rounded">
                    <DAppLogo size={30} icon={payload.appMeta.icon} origin={payload.origin} />
                  </div>
                  <div
                    className={clsx(
                      'w-5 h-5 rounded-full bg-grey-4 flex justify-center items-center',
                      'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                    )}
                  >
                    <IconBase Icon={LinkIcon} size={12} className="text-grey-1" />
                  </div>
                </div>

                <Anchor className="flex pl-1 items-center" href={payload.origin}>
                  <span className="text-font-description-bold">{payload.appMeta.name}</span>
                  <IconBase Icon={OutLinkIcon} size={16} className="text-secondary" />
                </Anchor>
              </div>
            )}

            {error && !isOperationsConfirm && (
              <Alert
                closable
                onClose={handleErrorAlertClose}
                type="error"
                title="Error"
                description={error?.message ?? t('smthWentWrong')}
                autoFocus
              />
            )}

            {children({
              openAccountsModal,
              selectedAccount,
              formId: CONFIRM_OPERATIONS_FORM_ID,
              onSubmit: handleConfirmClick,
              error
            })}
          </ScrollView>

          <ActionsButtonsBox shouldCastShadow={!bottomEdgeIsVisible} flexDirection="row">
            <StyledButton
              size="L"
              color="primary-low"
              className="w-full"
              loading={isDeclining}
              testID={declineTestID}
              onClick={handleDeclineClick}
            >
              <T id="cancel" />
            </StyledButton>

            <StyledButton
              size="L"
              color="primary"
              className="w-full"
              loading={isConfirming}
              testID={confirmTestID}
              type={isOperationsConfirm ? 'submit' : 'button'}
              onClick={isOperationsConfirm ? undefined : handleConfirmClick}
              form={isOperationsConfirm ? CONFIRM_OPERATIONS_FORM_ID : undefined}
              disabled={confirmDisabled}
            >
              {confirmButtonName}
            </StyledButton>
          </ActionsButtonsBox>

          <ConfirmLedgerOverlay displayed={isConfirming && selectedAccount.type === TempleAccountType.Ledger} />
        </>
      )}
    </PageModal>
  );
});
