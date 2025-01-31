import React, { FC, useCallback, useEffect, useMemo } from 'react';

import { ChainIds } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import { FormProvider, useForm } from 'react-hook-form-v7';

import { DeadEndBoundaryError } from 'app/ErrorBoundary';
import { toastError } from 'app/toaster';
import { useFormAnalytics } from 'lib/analytics';
import { isTezAsset, TEZ_TOKEN_SLUG } from 'lib/assets';
import { useTezosAssetBalance } from 'lib/balances';
import { RECOMMENDED_ADD_TEZ_GAS_FEE } from 'lib/constants';
import { useAssetFiatCurrencyPrice } from 'lib/fiat-currency';
import { toLocalFixed, t } from 'lib/i18n';
import { useTezosAssetMetadata, getAssetSymbol } from 'lib/metadata';
import { validateRecipient as validateAddress } from 'lib/temple/front';
import { isValidTezosAddress, isTezosContractAddress } from 'lib/tezos';
import { useSafeState } from 'lib/ui/hooks';
import { ZERO } from 'lib/utils/numbers';
import { getAccountAddressForTezos } from 'temple/accounts';
import { useAccountForTezos, useTezosChainByChainId, useVisibleAccounts } from 'temple/front';
import { useSettings } from 'temple/front/ready';
import {
  isTezosDomainsNameValid,
  getTezosToolkitWithSigner,
  getTezosDomainsClient,
  useTezosAddressByDomainName
} from 'temple/front/tezos';

import { useTezosEstimationData } from '../hooks/use-tezos-estimation-data';

import { BaseForm } from './BaseForm';
import { ReviewData, SendFormData } from './interfaces';
import { getBaseFeeError, getFeeError, getMaxAmountFiat, getTezosMaxAmountToken } from './utils';

interface Props {
  chainId: string;
  assetSlug: string;
  onSelectAssetClick: EmptyFn;
  onReview: (data: ReviewData) => void;
}

export const TezosForm: FC<Props> = ({ chainId, assetSlug, onSelectAssetClick, onReview }) => {
  const account = useAccountForTezos();
  const network = useTezosChainByChainId(chainId);

  if (!account || !network) throw new DeadEndBoundaryError();

  const assetMetadata = useTezosAssetMetadata(assetSlug, chainId);

  if (!assetMetadata) throw new Error('Metadata not found');

  const allAccounts = useVisibleAccounts();
  const { contacts } = useSettings();

  const assetPrice = useAssetFiatCurrencyPrice(assetSlug, chainId);

  const assetDecimals = assetMetadata.decimals ?? 0;

  const assetSymbol = useMemo(() => getAssetSymbol(assetMetadata), [assetMetadata]);

  const accountPkh = account.address;
  const tezos = getTezosToolkitWithSigner(network.rpcBaseURL, account.ownerAddress || accountPkh);
  const domainsClient = getTezosDomainsClient(network.chainId, network.rpcBaseURL);

  const formAnalytics = useFormAnalytics('SendForm');

  const { value: balance = ZERO } = useTezosAssetBalance(assetSlug, accountPkh, network);
  const { value: tezBalance = ZERO } = useTezosAssetBalance(TEZ_TOKEN_SLUG, accountPkh, network);

  const [shouldUseFiat, setShouldUseFiat] = useSafeState(false);

  const canToggleFiat = network.chainId === ChainIds.MAINNET && assetPrice.isGreaterThan(ZERO);

  const form = useForm<SendFormData>({
    mode: 'onSubmit',
    reValidateMode: 'onChange'
  });

  const { watch, formState, trigger, reset } = form;

  const toValue = watch('to');

  const toFilledWithAddress = useMemo(() => Boolean(toValue && isValidTezosAddress(toValue)), [toValue]);

  const toFilledWithDomain = useMemo(
    () => Boolean(toValue && isTezosDomainsNameValid(toValue, domainsClient)),
    [toValue, domainsClient]
  );

  const { data: resolvedAddress } = useTezosAddressByDomainName(toValue, network);

  const toFilled = resolvedAddress ? toFilledWithDomain : toFilledWithAddress;

  const toResolved = resolvedAddress || toValue;

  const isToFilledWithFamiliarAddress = useMemo(() => {
    if (!toFilled) return false;

    if (allAccounts.some(acc => getAccountAddressForTezos(acc) === toResolved)) return true;
    if (contacts?.some(contact => contact.address === toResolved)) return true;

    return false;
  }, [allAccounts, contacts, toFilled, toResolved]);

  const {
    data: estimationData,
    error: estimationDataError,
    isValidating: estimating
  } = useTezosEstimationData(
    toResolved,
    tezos,
    chainId,
    account,
    accountPkh,
    assetSlug,
    balance,
    tezBalance,
    assetMetadata,
    toFilled
  );

  const feeError = getBaseFeeError(estimationData?.baseFee, estimationDataError);
  const estimationError = getFeeError(estimating, feeError);

  const maxAmount = useMemo(() => {
    if (!(estimationData?.baseFee instanceof BigNumber)) {
      return shouldUseFiat ? getMaxAmountFiat(assetPrice.toNumber(), balance) : balance;
    }

    const maxAmountAsset = isTezAsset(assetSlug)
      ? getTezosMaxAmountToken(account.type, balance, estimationData.baseFee, RECOMMENDED_ADD_TEZ_GAS_FEE)
      : balance;

    return shouldUseFiat ? getMaxAmountFiat(assetPrice.toNumber(), maxAmountAsset) : maxAmountAsset;
  }, [estimationData, assetSlug, account.type, balance, shouldUseFiat, assetPrice]);

  const validateAmount = useCallback(
    (amount: string) => {
      if (!amount) return t('required');
      if (toValue && !isTezosContractAddress(toValue) && Number(amount) === 0) return t('amountMustBePositive');

      return new BigNumber(amount).isLessThanOrEqualTo(maxAmount) || t('maximalAmount', toLocalFixed(maxAmount, 6));
    },
    [maxAmount, toValue]
  );

  const validateRecipient = useCallback(
    (address: string) => {
      if (!address) return t('required');

      return validateAddress(address, domainsClient);
    },
    [domainsClient]
  );

  const maxAmountStr = maxAmount?.toString();
  useEffect(() => {
    if (formState.dirtyFields.amount) {
      trigger('amount');
    }
  }, [formState.dirtyFields, trigger, maxAmountStr]);

  const toAssetAmount = useCallback(
    (fiatAmount: BigNumber.Value) =>
      new BigNumber(fiatAmount).dividedBy(assetPrice ?? 1).toFormat(assetDecimals, BigNumber.ROUND_FLOOR, {
        decimalSeparator: '.'
      }),
    [assetPrice, assetDecimals]
  );

  const resetForm = useCallback(() => {
    reset({ to: '', amount: '' });
    setShouldUseFiat(false);
  }, [reset, setShouldUseFiat]);

  const onSubmit = useCallback(
    async ({ amount }: SendFormData) => {
      if (formState.isSubmitting) return;

      if (estimationError) {
        toastError('Failed to estimate transaction.');
        return;
      }

      formAnalytics.trackSubmit();

      try {
        const actualAmount = shouldUseFiat ? toAssetAmount(amount) : amount;

        onReview({
          account,
          assetSlug,
          network,
          amount: actualAmount,
          to: toResolved,
          onConfirm: resetForm
        });

        formAnalytics.trackSubmitSuccess();
      } catch (err: any) {
        console.error(err);

        formAnalytics.trackSubmitFail();

        toastError('Oops, Something went wrong!');
      }
    },
    [
      account,
      assetSlug,
      estimationError,
      formAnalytics,
      formState.isSubmitting,
      network,
      onReview,
      resetForm,
      shouldUseFiat,
      toAssetAmount,
      toResolved
    ]
  );

  return (
    <FormProvider {...form}>
      <BaseForm
        network={network}
        accountPkh={accountPkh}
        assetSlug={assetSlug}
        assetSymbol={assetSymbol}
        assetPrice={assetPrice}
        maxAmount={maxAmount}
        maxEstimating={estimating}
        canToggleFiat={canToggleFiat}
        shouldUseFiat={shouldUseFiat}
        setShouldUseFiat={setShouldUseFiat}
        assetDecimals={assetDecimals}
        validateAmount={validateAmount}
        validateRecipient={validateRecipient}
        onSelectAssetClick={onSelectAssetClick}
        isToFilledWithFamiliarAddress={isToFilledWithFamiliarAddress}
        onSubmit={onSubmit}
      />
    </FormProvider>
  );
};
