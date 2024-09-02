import React, { memo, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { EmptyState } from 'app/atoms/EmptyState';
import { useAllAccountsReactiveOnAddition, useAllAccountsReactiveOnRemoval } from 'app/hooks/use-all-accounts-reactive';
import { t } from 'lib/i18n';
import { useTempleClient } from 'lib/temple/front';
import { DisplayedGroup, StoredAccount } from 'lib/temple/types';
import { useAlert } from 'lib/ui';
import { searchAndFilterAccounts } from 'temple/front/accounts';
import { useAccountsGroups } from 'temple/front/groups';

import { CreateHDWalletModal } from '../CreateHDWalletModal';
import { ImportAccountModal, ImportOptionSlug } from '../ImportAccountModal';
import { ManualBackupModal } from '../ManualBackupModal';
import { NewWalletActionsPopper } from '../NewWalletActionsPopper';
import { SearchBarField } from '../SearchField';

import { AccountAlreadyExistsWarning } from './account-already-exists-warning';
import { ConfirmSeedPhraseAccessModal } from './confirm-seed-phrase-access-modal';
import { DeleteWalletModal } from './delete-wallet-modal';
import { GroupView } from './group-view';
import { RenameWalletModal } from './rename-wallet-modal';
import { AccountsManagementSelectors } from './selectors';

enum AccountsManagementModal {
  RenameWallet = 'rename-wallet',
  ConfirmSeedPhraseAccess = 'confirm-seed-phrase-access',
  RevealSeedPhrase = 'reveal-seed-phrase',
  DeleteWallet = 'delete-wallet',
  AccountAlreadyExistsWarning = 'account-already-exists-warning',
  CreateHDWalletFlow = 'create-hd-wallet-flow',
  ImportAccount = 'import-account',
  ImportWallet = 'import-wallet',
  WatchOnly = 'watch-only'
}

interface AccountsManagementProps {
  setHeaderChildren: (children: ReactNode) => void;
}

export const AccountsManagement = memo<AccountsManagementProps>(({ setHeaderChildren }) => {
  const { createAccount } = useTempleClient();
  const customAlert = useAlert();
  const allAccounts = useAllAccountsReactiveOnAddition(false);
  useAllAccountsReactiveOnRemoval();

  const [searchValue, setSearchValue] = useState('');
  const [seedPhraseToReveal, setSeedPhraseToReveal] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<DisplayedGroup | null>(null);
  const [activeModal, setActiveModal] = useState<AccountsManagementModal | null>(null);
  const [oldAccount, setOldAccount] = useState<StoredAccount | null>(null);
  const [importOptionSlug, setImportOptionSlug] = useState<ImportOptionSlug | undefined>();

  const startWalletCreation = useCallback(() => setActiveModal(AccountsManagementModal.CreateHDWalletFlow), []);
  const onCreateWalletFlowEnd = useCallback(() => setActiveModal(null), []);

  const filteredAccounts = useMemo(
    () => (searchValue.length ? searchAndFilterAccounts(allAccounts, searchValue) : allAccounts),
    [searchValue, allAccounts]
  );
  const filteredGroups = useAccountsGroups(filteredAccounts);

  const handleModalClose = useCallback(() => {
    setSeedPhraseToReveal('');
    setActiveModal(null);
    setSelectedGroup(null);
    setOldAccount(null);
    setImportOptionSlug(undefined);
  }, []);

  const actionWithModalFactory = useCallback(
    (modal: AccountsManagementModal) => (group: DisplayedGroup) => {
      setSelectedGroup(group);
      setActiveModal(modal);
    },
    []
  );
  const handleDeleteClick = useMemo(
    () => actionWithModalFactory(AccountsManagementModal.DeleteWallet),
    [actionWithModalFactory]
  );
  const handleRenameClick = useMemo(
    () => actionWithModalFactory(AccountsManagementModal.RenameWallet),
    [actionWithModalFactory]
  );
  const handleRevealSeedPhraseClick = useMemo(
    () => actionWithModalFactory(AccountsManagementModal.ConfirmSeedPhraseAccess),
    [actionWithModalFactory]
  );

  const handleRevealSeedPhrase = useCallback((seedPhrase: string) => {
    setSeedPhraseToReveal(seedPhrase);
    setActiveModal(AccountsManagementModal.RevealSeedPhrase);
  }, []);

  const showAccountAlreadyExistsWarning = useCallback((group: DisplayedGroup, oldAccount: StoredAccount) => {
    setSelectedGroup(group);
    setOldAccount(oldAccount);
    setActiveModal(AccountsManagementModal.AccountAlreadyExistsWarning);
  }, []);

  const handleAccountAlreadyExistsWarnClose = useCallback(async () => {
    try {
      await createAccount(selectedGroup!.id);
    } catch (e: any) {
      console.error(e);
      customAlert({
        title: 'Failed to create an account',
        description: e.message
      });
    }
  }, [createAccount, customAlert, selectedGroup]);

  const goToImportWalletModal = useCallback(() => {
    setActiveModal(AccountsManagementModal.ImportWallet);
    setImportOptionSlug(undefined);
  }, []);
  const goToImportAccountModal = useCallback(() => {
    setActiveModal(AccountsManagementModal.ImportAccount);
    setImportOptionSlug('private-key');
  }, []);
  const goToWatchOnlyModal = useCallback(() => setActiveModal(AccountsManagementModal.WatchOnly), []);
  const handleSeedPhraseImportOptionSelect = useCallback(() => setImportOptionSlug('mnemonic'), []);
  const handlePrivateKeyImportOptionSelect = useCallback(() => setImportOptionSlug('private-key'), []);

  const modal = useMemo(() => {
    switch (activeModal) {
      case AccountsManagementModal.RenameWallet:
        return <RenameWalletModal onClose={handleModalClose} selectedGroup={selectedGroup!} />;
      case AccountsManagementModal.ConfirmSeedPhraseAccess:
        return (
          <ConfirmSeedPhraseAccessModal
            selectedGroup={selectedGroup!}
            onReveal={handleRevealSeedPhrase}
            onClose={handleModalClose}
          />
        );
      case AccountsManagementModal.RevealSeedPhrase:
        return (
          <ManualBackupModal
            isNewMnemonic={false}
            mnemonic={seedPhraseToReveal}
            onSuccess={handleModalClose}
            onCancel={handleModalClose}
          />
        );
      case AccountsManagementModal.DeleteWallet:
        return <DeleteWalletModal selectedGroup={selectedGroup!} onClose={handleModalClose} />;
      case AccountsManagementModal.AccountAlreadyExistsWarning:
        return (
          <AccountAlreadyExistsWarning
            newAccountGroup={selectedGroup!}
            oldAccount={oldAccount!}
            onClose={handleAccountAlreadyExistsWarnClose}
          />
        );
      case AccountsManagementModal.CreateHDWalletFlow:
        return <CreateHDWalletModal onEnd={onCreateWalletFlowEnd} />;
      case AccountsManagementModal.ImportWallet:
      case AccountsManagementModal.ImportAccount:
        return (
          <ImportAccountModal
            optionSlug={importOptionSlug}
            shouldShowBackButton={activeModal === AccountsManagementModal.ImportWallet && !!importOptionSlug}
            onGoBack={goToImportWalletModal}
            onRequestClose={handleModalClose}
            onSeedPhraseSelect={handleSeedPhraseImportOptionSelect}
            onPrivateKeySelect={handlePrivateKeyImportOptionSelect}
          />
        );
      case AccountsManagementModal.WatchOnly:
        return (
          <ImportAccountModal optionSlug="watch-only" onGoBack={handleModalClose} onRequestClose={handleModalClose} />
        );
      default:
        return null;
    }
  }, [
    activeModal,
    goToImportWalletModal,
    handleAccountAlreadyExistsWarnClose,
    handleModalClose,
    handlePrivateKeyImportOptionSelect,
    handleRevealSeedPhrase,
    handleSeedPhraseImportOptionSelect,
    importOptionSlug,
    oldAccount,
    onCreateWalletFlowEnd,
    seedPhraseToReveal,
    selectedGroup
  ]);

  const headerChildren = useMemo(
    () => (
      <div className="flex p-4 gap-x-2 items-center bg-background">
        <SearchBarField
          value={searchValue}
          placeholder={t('searchAccount', '')}
          onValueChange={setSearchValue}
          testID={AccountsManagementSelectors.searchField}
        />

        <NewWalletActionsPopper
          startWalletCreation={startWalletCreation}
          testID={AccountsManagementSelectors.newWalletActionsButton}
          goToImportModal={goToImportWalletModal}
          goToWatchOnlyModal={goToWatchOnlyModal}
        />
      </div>
    ),
    [goToImportWalletModal, goToWatchOnlyModal, searchValue, startWalletCreation]
  );

  useEffect(() => setHeaderChildren(headerChildren), [headerChildren, setHeaderChildren]);
  useEffect(() => {
    return () => setHeaderChildren(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {filteredGroups.length === 0 ? (
        <div className="w-full h-full flex items-center">
          <EmptyState variant="searchUniversal" />
        </div>
      ) : (
        <div className="flex flex-col gap-y-4 -m-4 px-4 pb-4 overflow-y-auto">
          {filteredGroups.map(group => (
            <GroupView
              group={group}
              key={group.id}
              searchValue={searchValue}
              showAccountAlreadyExistsWarning={showAccountAlreadyExistsWarning}
              onDeleteClick={handleDeleteClick}
              onRenameClick={handleRenameClick}
              onRevealSeedPhraseClick={handleRevealSeedPhraseClick}
              goToImportModal={goToImportAccountModal}
              goToWatchOnlyModal={goToWatchOnlyModal}
            />
          ))}
        </div>
      )}
      {modal}
    </>
  );
});
