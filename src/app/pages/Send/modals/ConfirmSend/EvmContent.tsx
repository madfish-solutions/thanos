import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';

import { omit, transform } from 'lodash';
import { FormProvider, useForm } from 'react-hook-form-v7';
import { useDebounce } from 'use-debounce';
import { FeeValuesEIP1559, FeeValuesLegacy, formatEther, parseEther, serializeTransaction } from 'viem';

import { CLOSE_ANIMATION_TIMEOUT } from 'app/atoms/PageModal';
import { EvmReviewData } from 'app/pages/Send/form/interfaces';
import { useEvmEstimationData } from 'app/pages/Send/hooks/use-evm-estimation-data';
import { toastError, toastSuccess } from 'app/toaster';
import { EVM_TOKEN_SLUG } from 'lib/assets/defaults';
import { useEvmAssetBalance } from 'lib/balances/hooks';
import { useEvmCategorizedAssetMetadata } from 'lib/metadata';
import { useTempleClient } from 'lib/temple/front';
import { ZERO } from 'lib/utils/numbers';
import { EvmTxParams } from 'temple/evm/types';

import { buildBasicEvmSendParams } from '../../build-basic-evm-send-params';

import { BaseContent, Tab } from './BaseContent';
import { DEFAULT_INPUT_DEBOUNCE } from './contants';
import { useEvmEstimationDataState } from './context';
import { useEvmFeeOptions } from './hooks/use-evm-fee-options';
import { EvmTxParamsFormData, FeeOptionLabel } from './types';

interface EvmContentProps {
  data: EvmReviewData;
  onClose: EmptyFn;
}

export const EvmContent: FC<EvmContentProps> = ({ data, onClose }) => {
  const { account, network, assetSlug, to, amount, onConfirm } = data;

  const accountPkh = account.address as HexString;

  const { sendEvmTransaction } = useTempleClient();

  const { value: balance = ZERO } = useEvmAssetBalance(assetSlug, accountPkh, network);
  const { value: ethBalance = ZERO } = useEvmAssetBalance(EVM_TOKEN_SLUG, accountPkh, network);
  const assetMetadata = useEvmCategorizedAssetMetadata(assetSlug, network.chainId);

  const form = useForm<EvmTxParamsFormData>({ mode: 'onChange' });
  const { watch, formState, setValue } = form;

  const gasPriceValue = watch('gasPrice');

  const [debouncedNonce] = useDebounce(watch('nonce'), DEFAULT_INPUT_DEBOUNCE);
  const [debouncedGasLimit] = useDebounce(watch('gasLimit'), DEFAULT_INPUT_DEBOUNCE);
  const [debouncedGasPrice] = useDebounce(gasPriceValue, DEFAULT_INPUT_DEBOUNCE);

  const [tab, setTab] = useState<Tab>('details');
  const [selectedFeeOption, setSelectedFeeOption] = useState<FeeOptionLabel | nullish>('mid');
  const [latestSubmitError, setLatestSubmitError] = useState<string | nullish>(null);

  const { data: estimationData } = useEvmEstimationData(
    to as HexString,
    assetSlug,
    accountPkh,
    network,
    balance,
    ethBalance,
    true,
    amount
  );

  const feeOptions = useEvmFeeOptions(debouncedGasLimit, estimationData);
  const { setData } = useEvmEstimationDataState();

  useEffect(() => {
    if (estimationData && feeOptions) setData({ ...estimationData, feeOptions });
  }, [estimationData, feeOptions, setData]);

  useEffect(() => {
    if (gasPriceValue && selectedFeeOption) setSelectedFeeOption(null);
  }, [gasPriceValue, selectedFeeOption]);

  const getFeesPerGas = useCallback(
    (rawGasPrice: string): FeeValuesLegacy | FeeValuesEIP1559 | null => {
      if (!feeOptions) {
        return null;
      }

      const parsedGasPrice = rawGasPrice ? parseEther(rawGasPrice, 'gwei') : null;
      const feeOptionValues = feeOptions.gasPrice[selectedFeeOption ?? 'mid'];

      return transform(
        feeOptionValues,
        (acc, value, key) => {
          if (typeof value === 'bigint' && parsedGasPrice) {
            // @ts-expect-error
            acc[key] = parsedGasPrice;
          }

          return acc;
        },
        { ...feeOptionValues }
      );
    },
    [feeOptions, selectedFeeOption]
  );

  const rawTransaction = useMemo(() => {
    const feesPerGas = getFeesPerGas(debouncedGasPrice);

    if (!estimationData || !feesPerGas || !assetMetadata) return null;

    const basicParams = buildBasicEvmSendParams(accountPkh, to as HexString, assetMetadata, amount);

    return serializeTransaction({
      chainId: network.chainId,
      gas: debouncedGasLimit ? BigInt(debouncedGasLimit) : estimationData.gas,
      nonce: debouncedNonce ? Number(debouncedNonce) : estimationData.nonce,
      ...basicParams,
      ...feesPerGas
    });
  }, [
    accountPkh,
    amount,
    assetMetadata,
    debouncedGasLimit,
    debouncedGasPrice,
    debouncedNonce,
    estimationData,
    getFeesPerGas,
    network.chainId,
    to
  ]);

  useEffect(() => {
    if (rawTransaction) setValue('rawTransaction', rawTransaction);
  }, [rawTransaction, setValue]);

  const displayedFee = useMemo(() => {
    if (feeOptions && selectedFeeOption) return feeOptions.displayed[selectedFeeOption];

    if (estimationData && debouncedGasPrice) {
      const gas = debouncedGasLimit ? BigInt(debouncedGasLimit) : estimationData.gas;

      return formatEther(gas * parseEther(debouncedGasPrice, 'gwei'));
    }

    return '0';
  }, [feeOptions, selectedFeeOption, estimationData, debouncedGasPrice, debouncedGasLimit]);

  const handleFeeOptionSelect = useCallback(
    (label: FeeOptionLabel) => {
      setSelectedFeeOption(label);
      setValue('gasPrice', '', { shouldValidate: true });
    },
    [setValue]
  );

  const onSubmit = useCallback(
    async ({ gasPrice, gasLimit, nonce }: EvmTxParamsFormData) => {
      if (formState.isSubmitting) return;

      const feesPerGas = getFeesPerGas(gasPrice);

      if (!assetMetadata) {
        throw new Error('Asset metadata not found.');
      }

      if (!estimationData || !feesPerGas) {
        toastError('Failed to estimate transaction.');

        return;
      }

      try {
        const { value, to: txDestination } = buildBasicEvmSendParams(
          accountPkh,
          to as HexString,
          assetMetadata,
          amount
        );

        const txHash = await sendEvmTransaction(accountPkh, network, {
          to: txDestination,
          value,
          ...omit(estimationData, 'estimatedFee'),
          ...feesPerGas,
          ...(gasLimit ? { gas: BigInt(gasLimit) } : {}),
          ...(nonce ? { nonce: Number(nonce) } : {})
        } as EvmTxParams);

        onConfirm();
        onClose();

        setTimeout(() => toastSuccess('Transaction Submitted', true, txHash), CLOSE_ANIMATION_TIMEOUT * 2);
      } catch (err: any) {
        console.error(err);

        setLatestSubmitError(err.message);
        setTab('error');
      }
    },
    [
      accountPkh,
      amount,
      assetMetadata,
      estimationData,
      formState.isSubmitting,
      getFeesPerGas,
      network,
      onClose,
      onConfirm,
      sendEvmTransaction,
      to
    ]
  );

  return (
    <FormProvider {...form}>
      <BaseContent<EvmTxParamsFormData>
        network={network}
        assetSlug={assetSlug}
        amount={amount}
        recipientAddress={to}
        displayedFeeOptions={feeOptions?.displayed}
        selectedTab={tab}
        setSelectedTab={setTab}
        selectedFeeOption={selectedFeeOption}
        latestSubmitError={latestSubmitError}
        displayedFee={displayedFee}
        onFeeOptionSelect={handleFeeOptionSelect}
        onCancel={onClose}
        onSubmit={onSubmit}
      />
    </FormProvider>
  );
};
