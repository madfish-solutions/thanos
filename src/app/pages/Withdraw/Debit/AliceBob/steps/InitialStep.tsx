import React, { ChangeEvent, FC, useCallback, useMemo, useRef, useState } from 'react';

import classNames from 'clsx';

import { FormSubmitButton } from 'app/atoms/FormSubmitButton';
import { TopUpInput } from 'app/pages/Buy/Debit/Utorg/components/TopUpInput/TopUpInput';
import { createAliceBobOrder } from 'lib/alice-bob-api';
import { useAnalyticsState } from 'lib/analytics/use-analytics-state.hook';
import { T } from 'lib/i18n/react';

import { useDisabledProceed } from '../../../../../hooks/AliceBob/useDisabledProceed';
import { useOutputEstimation } from '../../../../../hooks/AliceBob/useOutputEstimation';
import { useUpdatedExchangeInfo } from '../../../../../hooks/AliceBob/useUpdatedExchangeInfo';
import { ReactComponent as AlertIcon } from '../../../../../icons/alert.svg';
import { ReactComponent as AttentionRedIcon } from '../../../../../icons/attentionRed.svg';
import styles from '../../../../Buy/Crypto/Exolix/Exolix.module.css';
import { WithdrawSelectors } from '../../../Withdraw.selectors';
import { CardNumberInput } from '../components/CardNumberInput';

const NOT_UKRAINIAN_CARD_ERROR_MESSAGE = 'Ukrainian bank card is required.';

export const InitialStep: FC = () => {
  const { analyticsState } = useAnalyticsState();

  const [inputAmount, setInputAmount] = useState(0);

  const [isLoading, setLoading] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  const cardNumberRef = useRef<HTMLInputElement>(null);

  const [isApiError, setIsApiError] = useState(false);
  const [isCardInputError, setIsCardInputError] = useState(false);
  const [isNotUkrainianCardError, setIsNotUkrainianCardError] = useState(false);

  const { minExchangeAmount, maxExchangeAmount, isMinMaxLoading } = useUpdatedExchangeInfo(setIsApiError, true);

  const { isMinAmountError, isMaxAmountError, disabledProceed } = useDisabledProceed(
    inputAmount,
    minExchangeAmount,
    maxExchangeAmount,
    isApiError,
    isCardInputError,
    isNotUkrainianCardError
  );

  const outputAmount = useOutputEstimation(inputAmount, disabledProceed, setLoading, setIsApiError, true);

  const exchangeRate = useMemo(
    () => (inputAmount > 0 ? (outputAmount / inputAmount).toFixed(4) : 0),
    [inputAmount, outputAmount]
  );

  const handleSubmit = () => {
    setSubmitCount(prevState => prevState + 1);
    if (!disabledProceed) {
      setLoading(true);
      createAliceBobOrder({
        isWithdraw: 'true',
        amount: inputAmount.toString(),
        userId: analyticsState.userId,
        cardNumber: cardNumberRef.current?.value ?? ''
      })
        .then(({ orderInfo }) => {
          console.log('orderInfo', orderInfo);
        })
        .catch(err => {
          if (err.response.data.message === NOT_UKRAINIAN_CARD_ERROR_MESSAGE) {
            setIsNotUkrainianCardError(true);
          } else {
            setIsApiError(true);
          }
        })
        .finally(() => setLoading(false));
    }
  };

  const handleInputAmountChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setInputAmount(Number(e.target.value)),
    []
  );

  return (
    <>
      {isApiError && (
        <div className="flex w-full justify-center my-6 text-red-600" style={{ fontSize: 17 }}>
          <AttentionRedIcon />
          <h3 className="ml-1">
            <T id="serviceIsUnavailable" />
          </h3>
        </div>
      )}

      <p className={styles['title']}>
        <T id={'sellTezDetails'} />
      </p>
      <p className={styles['description']}>
        <T id={'sellDetailsDescription'} />
      </p>

      <div className="mx-auto mt-10 text-center font-inter font-normal text-gray-700" style={{ maxWidth: 360 }}>
        <TopUpInput
          singleToken
          isDefaultUahIcon
          amountInputDisabled={isMinMaxLoading}
          label={<T id="send" />}
          currencyName="XTZ"
          currenciesList={[]}
          minAmount={minExchangeAmount.toString()}
          maxAmount={maxExchangeAmount.toString()}
          isMinAmountError={isMinAmountError}
          isMaxAmountError={isMaxAmountError}
          onAmountChange={handleInputAmountChange}
          className="mb-4"
        />

        <br />
        <TopUpInput
          readOnly
          singleToken
          isDefaultUahIcon
          amountInputDisabled
          label={<T id="get" />}
          currencyName="UAH"
          currenciesList={[]}
          amount={outputAmount}
        />

        <div className={classNames(styles['exchangeRateBlock'], 'mt-1 mb-10')}>
          <p className={classNames(styles['exchangeTitle'])}>
            <T id={'exchangeRate'} />:
          </p>
          <p className={styles['exchangeData']}>1 TEZ ≈ {exchangeRate} UAH</p>
        </div>

        <div className="w-full flex mb-1 items-center justify-between">
          <span className="text-xl text-gray-900">
            <T id="toCard" />
          </span>
          <span
            className={classNames(
              'inline-flex items-center font-inter text-xs font-normal',
              isNotUkrainianCardError ? 'text-red-700' : 'text-orange-500'
            )}
          >
            <AlertIcon className="mr-1 stroke-current" />
            <T id="onlyForUkrainianCards" />
          </span>
        </div>

        <CardNumberInput
          ref={cardNumberRef}
          showError={submitCount > 0}
          setIsError={setIsCardInputError}
          setIsNotUkrainianCardError={setIsNotUkrainianCardError}
          className={classNames(isNotUkrainianCardError && 'border-red-700')}
        />

        <FormSubmitButton
          className="w-full justify-center border-none mt-6"
          style={{
            background: '#4299e1',
            paddingTop: '0.625rem',
            paddingBottom: '0.625rem'
          }}
          disabled={disabledProceed}
          loading={isLoading || isMinMaxLoading}
          testID={WithdrawSelectors.AliceBobCreateOrder}
          onClick={handleSubmit}
        >
          <T id="next" />
        </FormSubmitButton>
        <div className="border-solid border-gray-300" style={{ borderTopWidth: 1 }}>
          <p className="mt-6">
            <T
              id="privacyAndPolicyLinks"
              substitutions={[
                <T id={'next'} />,
                <a
                  className={styles['link']}
                  rel="noreferrer"
                  href="https://oval-rhodium-33f.notion.site/End-User-License-Agreement-Abex-Eng-6124123e256d456a83cffc3b2977c4dc"
                  target="_blank"
                >
                  <T id={'termsOfUse'} />
                </a>,
                <a
                  className={styles['link']}
                  rel="noreferrer"
                  href="https://oval-rhodium-33f.notion.site/Privacy-Policy-Abex-Eng-d70fa7cc134341a3ac4fd04816358b9e"
                  target="_blank"
                >
                  <T id={'privacyPolicy'} />
                </a>
              ]}
            />
          </p>
          <p className="my-6">
            <T id={'warningTopUpServiceMessage'} />
          </p>
        </div>
      </div>
    </>
  );
};
