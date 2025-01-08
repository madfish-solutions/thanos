import { useCallback, useEffect, useMemo, useState } from 'react';

import { transform } from 'lodash';
import { useForm } from 'react-hook-form-v7';
import { useDebounce } from 'use-debounce';
import {
  FeeValuesEIP1559,
  FeeValuesLegacy,
  TransactionSerializable,
  formatEther,
  parseEther,
  serializeTransaction
} from 'viem';

import { EvmEstimationData } from 'temple/evm/estimate';

import { useEvmEstimationDataState } from './context';
import { useEvmFeeOptions } from './hooks/use-evm-fee-options';
import { EvmTxParamsFormData, FeeOptionLabel, Tab } from './types';

const DEFAULT_INPUT_DEBOUNCE = 500;

const serializeBigint = (value: bigint | nullish) => (typeof value === 'bigint' ? value.toString() : undefined);

export const useEvmEstimationForm = (
  estimationData: EvmEstimationData | undefined,
  basicParams: TransactionSerializable | undefined,
  chainId: number
) => {
  const defaultValues = useMemo<Partial<EvmTxParamsFormData>>(() => {
    if (!basicParams) return {};

    const { nonce, data } = basicParams;
    const rawGasPrice =
      basicParams.type === 'legacy' || basicParams.type === 'eip2930' || basicParams.gasPrice
        ? basicParams.gasPrice
        : basicParams.maxFeePerGas;

    return {
      gasPrice: rawGasPrice ? formatEther(rawGasPrice, 'gwei') : undefined,
      gasLimit: serializeBigint(basicParams.gas),
      nonce: nonce?.toString(),
      data,
      rawTransaction: serializeTransaction(basicParams)
    };
  }, [basicParams]);
  const form = useForm<EvmTxParamsFormData>({ mode: 'onChange', defaultValues });
  const { watch, setValue } = form;

  const gasPriceValue = watch('gasPrice');

  const [debouncedNonce] = useDebounce(watch('nonce'), DEFAULT_INPUT_DEBOUNCE);
  const [debouncedGasLimit] = useDebounce(watch('gasLimit'), DEFAULT_INPUT_DEBOUNCE);
  const [debouncedGasPrice] = useDebounce(gasPriceValue, DEFAULT_INPUT_DEBOUNCE);

  const [tab, setTab] = useState<Tab>('details');
  const [selectedFeeOption, setSelectedFeeOption] = useState<FeeOptionLabel | nullish>(
    defaultValues.gasPrice ? null : 'mid'
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

      try {
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
      } catch (e) {
        console.error(e);

        return null;
      }
    },
    [feeOptions, selectedFeeOption]
  );

  const rawTransaction = useMemo(() => {
    if (!basicParams) return null;

    const feesPerGas = getFeesPerGas(debouncedGasPrice);
    const gas = debouncedGasLimit ? BigInt(debouncedGasLimit) : estimationData?.gas ?? basicParams.gas;
    const nonce = debouncedNonce ? Number(debouncedNonce) : estimationData?.nonce ?? basicParams.nonce;

    if (gas === undefined || nonce === undefined || !feesPerGas) return null;

    return serializeTransaction({
      ...basicParams,
      chainId,
      gas,
      nonce,
      ...feesPerGas
    } as TransactionSerializable);
  }, [basicParams, chainId, debouncedGasLimit, debouncedGasPrice, debouncedNonce, estimationData, getFeesPerGas]);
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

  return {
    form,
    tab,
    setTab,
    selectedFeeOption,
    handleFeeOptionSelect,
    feeOptions,
    displayedFee,
    getFeesPerGas
  };
};
