import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';

import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { Controller, ControllerProps, useForm } from 'react-hook-form-v7';
import { object as objectSchema, string as stringSchema, boolean as booleanSchema } from 'yup';

import { Button, IconBase } from 'app/atoms';
import {
  ActionModal,
  ActionModalBodyContainer,
  ActionModalButton,
  ActionModalButtonsContainer
} from 'app/atoms/action-modal';
import AssetField from 'app/atoms/AssetField';
import { SettingsCheckbox } from 'app/atoms/SettingsCheckbox';
import { ReactComponent as LockFillIcon } from 'app/icons/base/lock_fill.svg';
import { ShortenedTextWithTooltip } from 'app/templates/shortened-text-with-tooltip';
import { useEvmAssetBalance } from 'lib/balances/hooks';
import { MAX_EVM_ALLOWANCE } from 'lib/constants';
import { useYupValidationResolver } from 'lib/form/use-yup-validation-resolver';
import { T, t, toLocalFixed } from 'lib/i18n';
import { useEvmAssetMetadata } from 'lib/metadata';
import { atomsToTokens, tokensToAtoms } from 'lib/temple/helpers';
import { shouldDisableSubmitButton } from 'lib/ui/should-disable-submit-button';
import { toBigNumber, ZERO } from 'lib/utils/numbers';
import { EvmChain } from 'temple/front';

import { EvmTransactionViewSelectors } from '../selectors';

interface EditModalProps {
  assetSlug: string;
  chain: EvmChain;
  from: HexString;
  initialAllowance: BigNumber;
  minAllowance: bigint;
  minInclusive: boolean;
  setAllowance: SyncFn<BigNumber>;
  onClose: EmptyFn;
}

interface FormValues {
  amount: string;
  unlimited: boolean;
}

export const EditModal = memo<EditModalProps>(
  ({ assetSlug, chain, from, initialAllowance, minAllowance, minInclusive, setAllowance, onClose }) => {
    const assetMetadata = useEvmAssetMetadata(assetSlug, chain.chainId);
    const displayedSymbol = assetMetadata?.symbol ?? t('unknownTokenAcronym');
    const { rawValue: atomicAssetBalance, value: balance } = useEvmAssetBalance(assetSlug, from, chain);
    const decimals = assetMetadata?.decimals ?? 0;
    const defaultValues = useMemo(
      () =>
        initialAllowance.eq(MAX_EVM_ALLOWANCE.toString())
          ? { amount: '', unlimited: true }
          : { amount: atomsToTokens(initialAllowance, decimals).toFixed(), unlimited: false },
      [decimals, initialAllowance]
    );
    const validationSchema = useMemo(
      () =>
        objectSchema()
          .shape({
            amount: stringSchema().when('unlimited', ([unlimited], schema) => {
              if (unlimited) {
                return schema.strip();
              }

              const minValue = atomsToTokens(toBigNumber(minAllowance), decimals);
              const maxValue = atomsToTokens(toBigNumber(MAX_EVM_ALLOWANCE), decimals);

              return schema
                .test(
                  'min-amount',
                  t(minInclusive ? 'amountMustBeGte' : 'amountMustBeGt', minValue.toFixed()),
                  (value: string | undefined) => {
                    if (!value) {
                      return true;
                    }

                    const parsedValue = new BigNumber(value);

                    return minInclusive ? parsedValue.gte(minValue) : parsedValue.gt(minValue);
                  }
                )
                .test(
                  'max-amount',
                  t('tooLargeAmount'),
                  (value: string | undefined) => !value || new BigNumber(value).lte(maxValue)
                )
                .required(t('required'));
            }),
            unlimited: booleanSchema()
          })
          .required(),
      [decimals, minAllowance, minInclusive]
    );
    const validationResolver = useYupValidationResolver<FormValues>(validationSchema);
    const { handleSubmit, formState, control, watch, setValue } = useForm<FormValues>({
      defaultValues,
      resolver: validationResolver
    });
    const isUnlimited = watch('unlimited');
    const onSubmit = useCallback(
      ({ amount, unlimited }: FormValues) => {
        setAllowance(unlimited ? toBigNumber(MAX_EVM_ALLOWANCE) : tokensToAtoms(amount, decimals));
      },
      [decimals, setAllowance]
    );

    const amount = watch('amount');
    const amountRef = useRef(amount);
    useEffect(() => void (amount && (amountRef.current = amount)), [amount]);

    const handleSetMaxAmount = useCallback(() => {
      setValue(
        'amount',
        atomsToTokens(
          BigNumber.max(atomicAssetBalance ?? MAX_EVM_ALLOWANCE.toString(), minAllowance.toString()),
          decimals
        ).toFixed(),
        { shouldValidate: true }
      );
    }, [atomicAssetBalance, decimals, minAllowance, setValue]);
    const cleanAmount = useCallback(() => setValue('amount', '', { shouldValidate: true }), [setValue]);
    const renderAmountField = useCallback<ControllerProps<FormValues, 'amount'>['render']>(
      ({ field, fieldState, formState }) => (
        <AssetField
          {...field}
          extraFloatingInner={displayedSymbol}
          assetDecimals={decimals}
          readOnly={isUnlimited}
          placeholder={isUnlimited ? t('unlimited') : '0'}
          reserveSpaceForError
          errorCaption={formState.submitCount > 0 ? fieldState.error?.message : undefined}
          cleanable={!isUnlimited}
          floatAfterPlaceholder
          onClean={cleanAmount}
          rightSideComponent={
            isUnlimited ? (
              <IconBase Icon={LockFillIcon} size={16} className="text-grey-3" />
            ) : (
              <Button
                type="button"
                onClick={handleSetMaxAmount}
                className={clsx(
                  'flex justify-center items-center text-font-description-bold',
                  'text-white bg-primary hover:bg-primary-hover rounded-md py-1'
                )}
                style={{ width: '41px' }}
                testID={EvmTransactionViewSelectors.maxButton}
              >
                <T id="max" />
              </Button>
            )
          }
          testID={EvmTransactionViewSelectors.amountInput}
        />
      ),
      [displayedSymbol, decimals, isUnlimited, cleanAmount, handleSetMaxAmount]
    );
    const renderUnlimitedCheckbox = useCallback<ControllerProps<FormValues, 'unlimited'>['render']>(
      ({ field }) => {
        const handleUnlimitedChange = (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => {
          field.onChange(checked, event);
          setValue('amount', checked ? '' : amountRef.current, { shouldValidate: true });
        };

        return (
          <SettingsCheckbox
            {...field}
            onChange={handleUnlimitedChange}
            checked={field.value}
            label={<T id="setToUnlimited" />}
            testID={EvmTransactionViewSelectors.unlimitedCheckbox}
          />
        );
      },
      [setValue]
    );

    return (
      <ActionModal onClose={onClose} title={<T id="edit" />}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ActionModalBodyContainer className="gap-3 pb-4">
            <div className="flex flex-col gap-1">
              <div className="flex my-1 justify-between gap-1">
                <span className="text-font-description-bold">
                  <T id="amount" />
                </span>
                <div className="text-font-num-12 text-grey-1 min-w-0">
                  <T id="balance" />:{' '}
                  <ShortenedTextWithTooltip>{toLocalFixed(balance ?? ZERO)}</ShortenedTextWithTooltip> {displayedSymbol}
                </div>
              </div>

              <Controller control={control} name="amount" render={renderAmountField} />
            </div>

            <Controller control={control} name="unlimited" render={renderUnlimitedCheckbox} />
          </ActionModalBodyContainer>

          <ActionModalButtonsContainer>
            <ActionModalButton
              color="primary"
              disabled={shouldDisableSubmitButton({
                errors: formState.errors,
                formState,
                disableWhileSubmitting: true
              })}
              type="submit"
              testID={EvmTransactionViewSelectors.saveButton}
            >
              <T id="save" />
            </ActionModalButton>
          </ActionModalButtonsContainer>
        </form>
      </ActionModal>
    );
  }
);
