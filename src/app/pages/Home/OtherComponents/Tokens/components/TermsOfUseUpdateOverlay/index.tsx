import React, { memo, useCallback } from 'react';

import clsx from 'clsx';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';

import { FormCheckbox, FormSubmitButton } from 'app/atoms';
import { FormCheckboxGroup } from 'app/atoms/FormCheckboxGroup';
import { OverlayCloseButton } from 'app/atoms/OverlayCloseButton';
import { useAppEnv } from 'app/env';
import ContentContainer from 'app/layouts/ContentContainer';
import { setAcceptedTermsVersionAction } from 'app/store/settings/actions';
import { PRIVACY_POLICY_URL, RECENT_TERMS_VERSION, TERMS_OF_USE_URL } from 'lib/constants';
import { t, T } from 'lib/i18n';

import AdvancedFeaturesIllustration from './advanced-features-illustration.png';
import IllustrationBgFull from './illustration-bg-full.png';
import IllustrationBgPopup from './illustration-bg-popup.png';
import { TermsOfUseUpdateOverlaySelectors } from './selectors';

interface FormValues {
  termsAccepted: boolean;
}

interface TermsOfUseUpdateOverlayProps {
  onClose: EmptyFn;
}

export const TermsOfUseUpdateOverlay = memo<TermsOfUseUpdateOverlayProps>(({ onClose }) => {
  const { popup } = useAppEnv();
  const dispatch = useDispatch();

  const { handleSubmit, errors, register } = useForm<FormValues>({
    defaultValues: { termsAccepted: false }
  });

  const onSubmit = useCallback(() => {
    void dispatch(setAcceptedTermsVersionAction(RECENT_TERMS_VERSION));
    onClose();
  }, [dispatch, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gray-700 bg-opacity-20">
      <ContentContainer
        className={clsx('overflow-y-scroll p-4', popup ? 'w-full h-full' : 'max-h-full')}
        padding={false}
        style={{ width: 632, maxWidth: 632 }}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={clsx(
            'relative flex flex-col justify-center items-center bg-white rounded-md p-6',
            popup && 'w-full min-h-full'
          )}
          style={{ width: popup ? undefined : 600 }}
        >
          <OverlayCloseButton onClick={onClose} />
          <img
            src={popup ? IllustrationBgPopup : IllustrationBgFull}
            alt=""
            className="absolute left-1/2 transform -translate-x-1/2 h-auto"
            style={{ top: popup ? 65 : 80, width: popup ? 356 : 383 }}
          />
          <div className="w-full flex flex-col items-center z-10">
            <h1
              className={clsx(
                'mt-8 text-center font-bold text-orange-500 leading-tight z-10',
                popup ? 'text-4xl' : 'text-4xl-plus'
              )}
            >
              <T id="templeUpdate" />
            </h1>
            <span
              className="font-semibold leading-tight text-sm text-gray-700 text-center mt-4"
              style={{ maxWidth: 354 }}
            >
              <T id="templeUpdateDescription" />
            </span>
            <img
              className="mt-6 mb-9 h-auto"
              src={AdvancedFeaturesIllustration}
              alt=""
              style={{ width: 336, letterSpacing: 0.014 }}
            />
            <FormCheckboxGroup
              isError={Boolean(errors.termsAccepted)}
              className={clsx('max-w-xs', popup ? 'mt-4' : undefined)}
            >
              <FormCheckbox
                basic
                ref={register({
                  validate: val => val || t('confirmTermsError')
                })}
                name="termsAccepted"
                testID={TermsOfUseUpdateOverlaySelectors.acceptTermsCheckbox}
                labelDescription={
                  <T
                    id="acceptTermsInputDescription"
                    substitutions={[
                      <a
                        href={TERMS_OF_USE_URL}
                        key="termsLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-secondary"
                      >
                        <T id="termsOfUsage" />
                      </a>,
                      <a
                        href={PRIVACY_POLICY_URL}
                        key="privacyPolicyLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-secondary"
                      >
                        <T id="privacyPolicy" />
                      </a>
                    ]}
                  />
                }
              />
            </FormCheckboxGroup>
            <FormSubmitButton className="mt-3 w-full max-w-xs" disabled={Object.keys(errors).length > 0}>
              <T id="continue" />
            </FormSubmitButton>
          </div>
        </form>
      </ContentContainer>
    </div>
  );
});
