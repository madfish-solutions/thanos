import React, { memo, useCallback, useMemo } from 'react';

import { FormField } from 'app/atoms';
import {
  ActionModal,
  ActionModalBodyContainer,
  ActionModalButton,
  ActionModalButtonsContainer
} from 'app/atoms/action-modal';
import { ACCOUNT_OR_GROUP_NAME_PATTERN } from 'app/defaults';
import { useTempleBackendActionForm } from 'app/hooks/use-temple-backend-action-form';
import { T, t } from 'lib/i18n';
import { useTempleClient } from 'lib/temple/front';
import { StoredAccount } from 'lib/temple/types';

interface EditAccountNameModalProps {
  account: StoredAccount;
  onClose: () => void;
}

interface FormData {
  name: string;
}

export const EditAccountNameModal = memo<EditAccountNameModalProps>(({ account, onClose }) => {
  const { editAccountName } = useTempleClient();
  const renameFormInitialValues = useMemo(() => ({ name: account.name }), [account]);

  const renameAccount = useCallback(
    async ({ name }: FormData) => {
      await editAccountName(account.id, name);
      onClose();
    },
    [account.id, editAccountName, onClose]
  );

  const { register, handleSubmit, errors, formState, onSubmit } = useTempleBackendActionForm<FormData>(
    renameAccount,
    'name',
    { defaultValues: renameFormInitialValues }
  );
  const submitting = formState.isSubmitting;

  return (
    <ActionModal title="Edit Account Name" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ActionModalBodyContainer>
          <FormField
            ref={register({
              required: t('required'),
              pattern: {
                value: ACCOUNT_OR_GROUP_NAME_PATTERN,
                message: t('accountOrGroupNameInputTitle')
              }
            })}
            label={t('accountNameInputLabel')}
            id="rename-account-input"
            type="text"
            name="name"
            placeholder={account.name}
            errorCaption={errors.name?.message}
            containerClassName="mb-1"
          />
        </ActionModalBodyContainer>
        <ActionModalButtonsContainer>
          <ActionModalButton
            className="bg-orange-200 text-orange-20"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <T id="cancel" />
          </ActionModalButton>

          <ActionModalButton className="bg-orange-20 text-white" disabled={submitting} type="submit">
            <T id="save" />
          </ActionModalButton>
        </ActionModalButtonsContainer>
      </form>
    </ActionModal>
  );
});
