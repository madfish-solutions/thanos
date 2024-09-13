import React, { memo, useCallback } from 'react';

import { Alert, FormField } from 'app/atoms';
import {
  ActionModal,
  ActionModalBodyContainer,
  ActionModalButton,
  ActionModalButtonsContainer
} from 'app/atoms/action-modal';
import { useTempleBackendActionForm } from 'app/hooks/use-temple-backend-action-form';
import { DEFAULT_PASSWORD_INPUT_PLACEHOLDER } from 'lib/constants';
import { T, t } from 'lib/i18n';
import { useTempleClient } from 'lib/temple/front';

import { SettingsSelectors } from './Settings.selectors';

export interface ResetExtensionModalProps {
  onClose: EmptyFn;
}

interface FormData {
  password: string;
}

export const ResetExtensionModal = memo<ResetExtensionModalProps>(({ onClose }) => {
  const { resetExtension } = useTempleClient();

  const handleResetPasswordSubmit = useCallback(({ password }: FormData) => resetExtension(password), [resetExtension]);

  const { register, handleSubmit, errors, formState, onSubmit } = useTempleBackendActionForm(
    handleResetPasswordSubmit,
    'password'
  );
  const submitting = formState.isSubmitting;

  return (
    <ActionModal title={t('resetExtensionModalTitle')} hasCloseButton={false} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ActionModalBodyContainer>
          <Alert
            className="mb-1"
            type="error"
            description={
              <p>
                <T id="resetExtensionModalDescription" />
              </p>
            }
          />

          <FormField
            ref={register({ required: t('required') })}
            id="reset-extension-password"
            type="password"
            name="password"
            shouldShowRevealWhenEmpty
            label={<T id="resetPasswordInputLabel" />}
            labelContainerClassName="text-grey-2"
            placeholder={DEFAULT_PASSWORD_INPUT_PLACEHOLDER}
            errorCaption={errors.password?.message}
            containerClassName="mb-2"
            testID={SettingsSelectors.passwordInput}
          />
        </ActionModalBodyContainer>

        <ActionModalButtonsContainer>
          <ActionModalButton
            color="primary-low"
            disabled={submitting}
            onClick={onClose}
            type="button"
            testID={SettingsSelectors.cancelResetExtensionButton}
          >
            <T id="cancel" />
          </ActionModalButton>

          <ActionModalButton
            color="red"
            disabled={submitting}
            type="submit"
            testID={SettingsSelectors.confirmResetExtensionButton}
          >
            <T id="reset" />
          </ActionModalButton>
        </ActionModalButtonsContainer>
      </form>
    </ActionModal>
  );
});
