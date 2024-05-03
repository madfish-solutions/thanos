import React, { FC, memo, useMemo } from 'react';

import { Button, IconBase } from 'app/atoms';
import { ReactComponent as DeleteIcon } from 'app/icons/delete.svg';
import { ReactComponent as DownloadIcon } from 'app/icons/download.svg';
import { ReactComponent as EditIcon } from 'app/icons/edit.svg';
import { ReactComponent as MenuCircleIcon } from 'app/icons/menu_circle.svg';
import { ReactComponent as AddIcon } from 'app/icons/plus_circle.svg';
import { ReactComponent as RevealEyeIcon } from 'app/icons/reveal.svg';
import { ACCOUNT_EXISTS_SHOWN_WARNINGS_STORAGE_KEY } from 'lib/constants';
import { t } from 'lib/i18n';
import { useStorage, useTempleClient } from 'lib/temple/front';
import { DisplayedGroup, StoredAccount, TempleAccountType } from 'lib/temple/types';
import { useAlert } from 'lib/ui';
import Popper, { PopperRenderProps } from 'lib/ui/Popper';
import { isTruthy } from 'lib/utils';
import { navigate } from 'lib/woozie';
import { useHDGroups } from 'temple/front';

import { Action, ActionsDropdown } from './actions-dropdown';

export interface GroupActionsPopperProps {
  group: DisplayedGroup;
  onRenameClick: (group: DisplayedGroup) => void;
  onRevealSeedPhraseClick: (group: DisplayedGroup) => void;
  onDeleteClick: (group: DisplayedGroup) => void;
  showAccountAlreadyExistsWarning: (group: DisplayedGroup, oldAccount: StoredAccount) => void;
}

const GroupActionsDropdown = memo<PopperRenderProps & GroupActionsPopperProps>(
  ({
    group,
    opened,
    setOpened,
    toggleOpened,
    onRenameClick,
    onRevealSeedPhraseClick,
    onDeleteClick,
    showAccountAlreadyExistsWarning
  }) => {
    const { createAccount, findFreeHdIndex } = useTempleClient();
    const hdGroups = useHDGroups();
    const customAlert = useAlert();
    const [accountExistsShownWarnings, setAccountExistsShownWarnings] = useStorage<Record<string, boolean>>(
      ACCOUNT_EXISTS_SHOWN_WARNINGS_STORAGE_KEY,
      {}
    );

    const actions = useMemo<Action[]>(() => {
      if (group.type === TempleAccountType.HD) {
        return [
          {
            key: 'add-account',
            title: () => 'Add Account',
            icon: AddIcon,
            onClick: async () => {
              try {
                const { firstSkippedAccount } = await findFreeHdIndex(group.id);
                if (firstSkippedAccount && !accountExistsShownWarnings[group.id]) {
                  showAccountAlreadyExistsWarning(group, firstSkippedAccount);
                  setAccountExistsShownWarnings(prevState => ({
                    ...Object.fromEntries(
                      Object.entries(prevState).filter(([groupId]) => !hdGroups.some(({ id }) => id === groupId))
                    ),
                    [group.id]: true
                  }));
                } else {
                  await createAccount(group.id);
                }
              } catch (e: any) {
                console.error(e);
                customAlert({
                  title: 'Failed to create an account',
                  description: e.message
                });
              }
            }
          },
          {
            key: 'rename-wallet',
            title: () => 'Rename Wallet',
            icon: EditIcon,
            onClick: async () => onRenameClick(group)
          },
          {
            key: 'reveal-seed-phrase',
            title: () => t('revealSeedPhrase'),
            icon: RevealEyeIcon,
            onClick: () => onRevealSeedPhraseClick(group)
          },
          hdGroups.length > 1 && {
            key: 'delete-wallet',
            title: () => 'Delete Wallet',
            icon: DeleteIcon,
            onClick: () => onDeleteClick(group),
            danger: true
          }
        ].filter(isTruthy);
      }

      let importActionUrl;
      switch (group.type) {
        case TempleAccountType.Imported:
          importActionUrl = '/import-account/private-key';
          break;
        case TempleAccountType.Ledger:
          importActionUrl = '/connect-ledger';
          break;
        case TempleAccountType.ManagedKT:
          importActionUrl = '/import-account/managed-kt';
          break;
        default:
          importActionUrl = '/import-account/watch-only';
      }

      return [
        {
          key: 'import',
          title: () => t(group.type === TempleAccountType.Imported ? 'importAccount' : 'createAccount'),
          icon: DownloadIcon,
          onClick: () => navigate(importActionUrl)
        },
        {
          key: 'delete-group',
          title: () => t('delete'),
          icon: DeleteIcon,
          onClick: () => onDeleteClick(group),
          danger: true
        }
      ];
    }, [
      group,
      hdGroups,
      findFreeHdIndex,
      accountExistsShownWarnings,
      showAccountAlreadyExistsWarning,
      setAccountExistsShownWarnings,
      createAccount,
      customAlert,
      onRenameClick,
      onRevealSeedPhraseClick,
      onDeleteClick
    ]);

    return (
      <ActionsDropdown
        opened={opened}
        setOpened={setOpened}
        toggleOpened={toggleOpened}
        title={group.type === TempleAccountType.HD ? 'Wallet Actions' : 'Actions'}
        actions={actions}
      />
    );
  }
);

export const GroupActionsPopper: FC<GroupActionsPopperProps> = ({ group, ...restPopperProps }) => (
  <Popper
    placement="bottom-end"
    strategy="fixed"
    popup={props => <GroupActionsDropdown group={group} {...restPopperProps} {...props} />}
  >
    {({ ref, toggleOpened }) => (
      <Button ref={ref} onClick={toggleOpened}>
        <IconBase Icon={MenuCircleIcon} size={16} className="text-secondary" />
      </Button>
    )}
  </Popper>
);
