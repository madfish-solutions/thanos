import { useCallback, useEffect, useMemo, useState } from 'react';

import { localForger } from '@taquito/local-forging';
import { TezosToolkit, WalletParamsWithKind, getRevealFee } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import { useForm } from 'react-hook-form-v7';
import { useDebounce } from 'use-debounce';

import { buildFinalTezosOpParams, mutezToTz, tzToMutez } from 'lib/temple/helpers';
import { ReadOnlySigner } from 'lib/temple/read-only-signer';
import { StoredAccount } from 'lib/temple/types';
import { ZERO } from 'lib/utils/numbers';
import { AccountForChain, getAccountForTezos } from 'temple/accounts';
import { getTezosToolkitWithSigner } from 'temple/front';
import { getTezosFastRpcClient, michelEncoder } from 'temple/tezos';
import { TempleChainKind } from 'temple/types';

import { DEFAULT_INPUT_DEBOUNCE } from './constants';
import { useTezosEstimationDataState } from './context';
import { DisplayedFeeOptions, FeeOptionLabel, Tab, TezosEstimationData, TezosTxParamsFormData } from './types';
import { getTezosFeeOption } from './utils';

export const useTezosEstimationForm = (
  estimationData: TezosEstimationData | undefined,
  basicParams: WalletParamsWithKind[] | undefined,
  senderAccount: StoredAccount | AccountForChain<TempleChainKind.Tezos>,
  rpcBaseURL: string
) => {
  const ownerAddress =
    'ownerAddress' in senderAccount
      ? senderAccount.ownerAddress
      : 'owner' in senderAccount
      ? senderAccount.owner
      : undefined;
  const accountPkh = useMemo(
    () => ('address' in senderAccount ? senderAccount.address : getAccountForTezos(senderAccount)!.address),
    [senderAccount]
  );
  const sender = ownerAddress || accountPkh;
  const tezos = getTezosToolkitWithSigner(rpcBaseURL, sender, true);
  const estimates = estimationData?.estimates;

  const defaultValues = useMemo(() => {
    let gasFee: BigNumber | undefined;
    let storageLimit: BigNumber | undefined;

    if (basicParams) {
      gasFee = estimates && estimates.length > basicParams.length ? mutezToTz(getRevealFee(sender)) : ZERO;
      storageLimit = ZERO;
      for (let i = 0; i < basicParams.length; i++) {
        if (gasFee === undefined && storageLimit === undefined) break;

        const suboperationParams = basicParams[i];
        const { fee: suboperationGasFeeMutez, storageLimit: suboperationStorageLimit } = suboperationParams;
        gasFee = suboperationGasFeeMutez === undefined ? undefined : gasFee?.plus(mutezToTz(suboperationGasFeeMutez));
        storageLimit =
          suboperationStorageLimit === undefined ? undefined : storageLimit?.plus(suboperationStorageLimit);
      }
    }

    return { gasFee: gasFee?.toString(), storageLimit: storageLimit?.toString() };
  }, [basicParams, estimates, sender]);
  const form = useForm<TezosTxParamsFormData>({ mode: 'onChange', defaultValues });
  const { watch, setValue } = form;

  const gasFeeValue = watch('gasFee');

  const [debouncedGasFee] = useDebounce(gasFeeValue, DEFAULT_INPUT_DEBOUNCE);
  const [debouncedStorageLimit] = useDebounce(watch('storageLimit'), DEFAULT_INPUT_DEBOUNCE);

  const [tab, setTab] = useState<Tab>('details');
  const [selectedFeeOption, setSelectedFeeOption] = useState<FeeOptionLabel | null>(
    defaultValues.gasFee ? null : 'mid'
  );

  const { setData } = useTezosEstimationDataState();

  useEffect(() => {
    if (estimationData) setData(estimationData);
  }, [estimationData, setData]);

  const displayedFeeOptions = useMemo<DisplayedFeeOptions | undefined>(() => {
    const gasFee = estimationData?.gasFee;

    if (!(gasFee instanceof BigNumber)) return;

    return {
      slow: getTezosFeeOption('slow', gasFee),
      mid: getTezosFeeOption('mid', gasFee),
      fast: getTezosFeeOption('fast', gasFee)
    };
  }, [estimationData]);

  const displayedFee = useMemo(() => {
    if (debouncedGasFee) return debouncedGasFee;

    if (displayedFeeOptions && selectedFeeOption) return displayedFeeOptions[selectedFeeOption];

    return;
  }, [selectedFeeOption, debouncedGasFee, displayedFeeOptions]);

  const totalDefaultStorageLimit = useMemo(
    () => (estimates ?? []).reduce((acc, { storageLimit }) => acc.plus(storageLimit), new BigNumber(0)),
    [estimates]
  );
  const displayedStorageFee = useMemo(() => {
    if (!estimates) return;

    const storageLimit = debouncedStorageLimit || totalDefaultStorageLimit.toString();
    const minimalFeePerStorageByteMutez = estimates[0].minimalFeePerStorageByteMutez;

    return mutezToTz(new BigNumber(storageLimit).times(minimalFeePerStorageByteMutez)).toString();
  }, [estimates, debouncedStorageLimit, totalDefaultStorageLimit]);

  useEffect(() => {
    if (gasFeeValue && selectedFeeOption) setSelectedFeeOption(null);
  }, [gasFeeValue, selectedFeeOption]);

  const submitOperation = useCallback(
    async (
      tezos: TezosToolkit,
      gasFee: string,
      storageLimit: string,
      revealFee: BigNumber,
      displayedFeeOptions?: DisplayedFeeOptions
    ) => {
      if (!displayedFeeOptions || !basicParams) return;

      const opParams = buildFinalTezosOpParams(
        basicParams,
        tzToMutez(gasFee || displayedFeeOptions[selectedFeeOption || 'mid'])
          .minus(tzToMutez(revealFee))
          .toNumber(),
        storageLimit ? Number(storageLimit) : totalDefaultStorageLimit.toNumber()
      );

      return await tezos.wallet.batch(opParams).send();
    },
    [basicParams, selectedFeeOption, totalDefaultStorageLimit]
  );

  const revealFee = estimationData?.revealFee ?? ZERO;
  const setRawTransaction = useCallback(async () => {
    try {
      const sourcePublicKey = await tezos.wallet.getPK();

      let bytesToSign: string | undefined;
      const signer = new ReadOnlySigner(accountPkh, sourcePublicKey, digest => {
        bytesToSign = digest;
      });

      const readOnlyTezos = new TezosToolkit(getTezosFastRpcClient(rpcBaseURL));
      readOnlyTezos.setSignerProvider(signer);
      readOnlyTezos.setPackerProvider(michelEncoder);

      await submitOperation(
        readOnlyTezos,
        debouncedGasFee,
        debouncedStorageLimit,
        revealFee,
        displayedFeeOptions
      ).catch(() => null);

      if (bytesToSign) {
        const rawToSign = await localForger.parse(bytesToSign).catch(() => null);
        if (rawToSign) setValue('raw', rawToSign);
        setValue('bytes', bytesToSign);
      }
    } catch (err: any) {
      console.error(err);
    }
  }, [
    accountPkh,
    displayedFeeOptions,
    debouncedGasFee,
    rpcBaseURL,
    setValue,
    debouncedStorageLimit,
    submitOperation,
    tezos,
    revealFee
  ]);

  useEffect(() => void setRawTransaction(), [setRawTransaction]);

  const handleFeeOptionSelect = useCallback(
    (label: FeeOptionLabel) => {
      setSelectedFeeOption(label);
      setValue('gasFee', '', { shouldValidate: true });
    },
    [setValue]
  );

  return {
    form,
    tab,
    setTab,
    selectedFeeOption,
    handleFeeOptionSelect,
    submitOperation,
    displayedFeeOptions,
    displayedFee,
    displayedStorageFee
  };
};
