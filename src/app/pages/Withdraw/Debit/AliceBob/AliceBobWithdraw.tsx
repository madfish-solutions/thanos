import React, { FC, useState } from 'react';

import { AliceBobOrderInfo, AliceBobOrderStatus } from 'lib/alice-bob-api';
import { t, T } from 'lib/i18n/react';
import { useAccount, useNetwork, useStorage } from 'lib/temple/front';
import { TempleAccountType } from 'lib/temple/types';
import { Redirect } from 'lib/woozie';

import { Stepper } from '../../../../atoms';
import { ReactComponent as AttentionRedIcon } from '../../../../icons/attentionRed.svg';
import PageLayout from '../../../../layouts/PageLayout';
import styles from '../../../Buy/Crypto/Exolix/Exolix.module.css';
import { ALICE_BOB_PRIVACY_LINK, ALICE_BOB_TERMS_LINK } from '../../../Buy/Debit/AliceBob/config';
import { InitialStep } from './steps/InitialStep';
import { OrderStatusStep } from './steps/OrderStatusStep';
import { SellStep } from './steps/SellStep';

const steps = [`${t('step')} 1`, `${t('step')} 2`, `${t('step')} 3`];

export const AliceBobWithdraw: FC = () => {
  const network = useNetwork();
  const account = useAccount();
  const { publicKeyHash } = account;
  const [step, setStep] = useStorage<number>(`alice_bob_withdraw_step_state_${publicKeyHash}`, 0);
  const [isApiError, setIsApiError] = useState(false);
  const [orderInfo, setOrderInfo] = useStorage<AliceBobOrderInfo | null>(
    `alice_bob_withdraw_order_state_${publicKeyHash}`,
    null
  );

  if (network.type !== 'main' || account.type === TempleAccountType.WatchOnly) {
    return <Redirect to={'/'} />;
  }

  return (
    <PageLayout
      pageTitle={
        <div className="font-medium text-sm">
          <T id="sellTez" />
        </div>
      }
    >
      <div className="pb-8 text-center max-w-sm mx-auto">
        <Stepper
          steps={steps}
          currentStep={step}
          completed={orderInfo?.status === AliceBobOrderStatus.COMPLETED}
          style={{ maxWidth: 250, marginTop: 8 }}
        />

        {isApiError && (
          <div className="flex w-full justify-center my-6 text-red-600" style={{ fontSize: 17 }}>
            <AttentionRedIcon />
            <h3 className="ml-1">
              <T id="serviceIsUnavailable" />
            </h3>
          </div>
        )}

        {step === 0 && (
          <InitialStep
            isApiError={isApiError}
            setStep={setStep}
            setOrderInfo={setOrderInfo}
            setIsApiError={setIsApiError}
          />
        )}

        {orderInfo && step === 1 && (
          <SellStep
            orderInfo={orderInfo}
            isApiError={isApiError}
            setStep={setStep}
            setOrderInfo={setOrderInfo}
            setIsApiError={setIsApiError}
          />
        )}

        {orderInfo && step === 2 && (
          <OrderStatusStep
            orderInfo={orderInfo}
            isApiError={isApiError}
            setStep={setStep}
            setOrderInfo={setOrderInfo}
            setIsApiError={setIsApiError}
          />
        )}

        <div className="text-gray-700">
          {step === 0 && (
            <p className="mt-6">
              <T
                id="privacyAndPolicyLinks"
                substitutions={[
                  <T id={'next'} />,
                  <a className={styles['link']} rel="noreferrer" href={ALICE_BOB_PRIVACY_LINK} target="_blank">
                    <T id={'termsOfUse'} />
                  </a>,
                  <a className={styles['link']} rel="noreferrer" href={ALICE_BOB_TERMS_LINK} target="_blank">
                    <T id={'privacyPolicy'} />
                  </a>
                ]}
              />
            </p>
          )}
          <p className="my-6">
            <T id="warningTopUpServiceMessage" />
          </p>
        </div>
      </div>
    </PageLayout>
  );
};