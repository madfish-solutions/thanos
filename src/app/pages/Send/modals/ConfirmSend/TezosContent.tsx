import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';

import { localForger } from '@taquito/local-forging';
import { TezosToolkit, TransactionOperation, TransactionWalletOperation } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import { FormProvider, useForm } from 'react-hook-form-v7';
import { useDebounce } from 'use-debounce';

import { CLOSE_ANIMATION_TIMEOUT } from 'app/atoms/PageModal';
import { TezosReviewData } from 'app/pages/Send/form/interfaces';
import { TezosEstimationData, useTezosEstimationData } from 'app/pages/Send/hooks/use-tezos-estimation-data';
import { useTezosEstimationDataState } from 'app/templates/TransactionTabs/context';
import { DisplayedFeeOptions, FeeOptionLabel, TezosTxParamsFormData } from 'app/templates/TransactionTabs/types';
import { getTezosFeeOption } from 'app/templates/TransactionTabs/utils';
import { toastError, toastSuccess } from 'app/toaster';
import { TEZ_TOKEN_SLUG } from 'lib/assets';
import { toTransferParams } from 'lib/assets/contract.utils';
import { useTezosAssetBalance } from 'lib/balances';
import { AssetMetadataBase, useTezosAssetMetadata } from 'lib/metadata';
import { transferImplicit, transferToContract } from 'lib/michelson';
import { loadContract } from 'lib/temple/contract';
import { mutezToTz, tzToMutez } from 'lib/temple/helpers';
import { ReadOnlySigner } from 'lib/temple/read-only-signer';
import { isTezosContractAddress } from 'lib/tezos';
import { ZERO } from 'lib/utils/numbers';
import { getTezosToolkitWithSigner } from 'temple/front';
import { getTezosFastRpcClient, michelEncoder } from 'temple/tezos';

import { BaseContent, Tab } from './BaseContent';
import { DEFAULT_INPUT_DEBOUNCE } from './contants';

interface TezosContentProps {
  data: TezosReviewData;
  onClose: EmptyFn;
}

export const TezosContent: FC<TezosContentProps> = ({ data, onClose }) => {
  const { account, network, assetSlug, to, amount, onConfirm } = data;

  const assetMetadata = useTezosAssetMetadata(assetSlug, network.chainId);

  if (!assetMetadata) throw new Error('Metadata not found');

  const accountPkh = account.address;

  const form = useForm<TezosTxParamsFormData>({ mode: 'onChange' });
  const { watch, formState, setValue } = form;

  const gasFeeValue = watch('gasFee');

  const [debouncedGasFee] = useDebounce(gasFeeValue, DEFAULT_INPUT_DEBOUNCE);
  const [debouncedStorageLimit] = useDebounce(watch('storageLimit'), DEFAULT_INPUT_DEBOUNCE);

  const [tab, setTab] = useState<Tab>('details');
  const [selectedFeeOption, setSelectedFeeOption] = useState<FeeOptionLabel | null>('mid');
  const [latestSubmitError, setLatestSubmitError] = useState<string | nullish>(null);

  const { value: balance = ZERO } = useTezosAssetBalance(assetSlug, accountPkh, network);
  const { value: tezBalance = ZERO } = useTezosAssetBalance(TEZ_TOKEN_SLUG, accountPkh, network);

  const tezos = getTezosToolkitWithSigner(network.rpcBaseURL, account.ownerAddress || accountPkh, true);

  const { data: estimationData } = useTezosEstimationData(
    to,
    tezos,
    network.chainId,
    account,
    accountPkh,
    assetSlug,
    balance,
    tezBalance,
    assetMetadata,
    true
  );

  const { setData } = useTezosEstimationDataState();

  useEffect(() => {
    if (estimationData) setData(estimationData);
  }, [estimationData, setData]);

  const displayedFeeOptions = useMemo<DisplayedFeeOptions | undefined>(() => {
    const baseFee = estimationData?.baseFee;

    if (!(baseFee instanceof BigNumber)) return;

    return {
      slow: getTezosFeeOption('slow', baseFee),
      mid: getTezosFeeOption('mid', baseFee),
      fast: getTezosFeeOption('fast', baseFee)
    };
  }, [estimationData]);

  const displayedFee = useMemo(() => {
    if (debouncedGasFee) return debouncedGasFee;

    if (displayedFeeOptions && selectedFeeOption) return displayedFeeOptions[selectedFeeOption];

    return;
  }, [selectedFeeOption, debouncedGasFee, displayedFeeOptions]);

  const displayedStorageFee = useMemo(() => {
    if (!estimationData) return;

    const estimates = estimationData.estimates;

    const storageLimit = debouncedStorageLimit || estimates.storageLimit;
    // @ts-expect-error
    const minimalFeePerStorageByteMutez = estimates.minimalFeePerStorageByteMutez;

    return mutezToTz(new BigNumber(storageLimit).times(minimalFeePerStorageByteMutez)).toString();
  }, [estimationData, debouncedStorageLimit]);

  useEffect(() => {
    if (gasFeeValue && selectedFeeOption) setSelectedFeeOption(null);
  }, [gasFeeValue, selectedFeeOption]);

  const submitOperation = useCallback(
    async (
      tezos: TezosToolkit,
      gasFee: string,
      storageLimit: string,
      assetMetadata: AssetMetadataBase,
      estimationData?: TezosEstimationData,
      displayedFeeOptions?: DisplayedFeeOptions
    ) => {
      if (!estimationData || !displayedFeeOptions) return;

      let operation: TransactionWalletOperation | TransactionOperation;

      if (isTezosContractAddress(accountPkh)) {
        const michelsonLambda = isTezosContractAddress(to) ? transferToContract : transferImplicit;

        const contract = await loadContract(tezos, accountPkh);
        operation = await contract.methodsObject.do(michelsonLambda(to, tzToMutez(amount))).send({ amount: 0 });
      } else {
        const transferParams = await toTransferParams(tezos, assetSlug, assetMetadata, accountPkh, to, amount);
        operation = await tezos.wallet
          .transfer({
            ...transferParams,
            fee: tzToMutez(
              gasFee || (selectedFeeOption ? displayedFeeOptions[selectedFeeOption] : displayedFeeOptions.mid)
            ).toNumber(),
            storageLimit: storageLimit ? Number(storageLimit) : estimationData.estimates.storageLimit
          })
          .send();
      }

      return operation;
    },
    [accountPkh, amount, assetSlug, selectedFeeOption, to]
  );

  const setRawTransaction = useCallback(async () => {
    try {
      const sourcePublicKey = await tezos.wallet.getPK();

      let bytesToSign: string | undefined;
      const signer = new ReadOnlySigner(accountPkh, sourcePublicKey, digest => {
        bytesToSign = digest;
      });

      const readOnlyTezos = new TezosToolkit(getTezosFastRpcClient(network.rpcBaseURL));
      readOnlyTezos.setSignerProvider(signer);
      readOnlyTezos.setPackerProvider(michelEncoder);

      await submitOperation(
        readOnlyTezos,
        debouncedGasFee,
        debouncedStorageLimit,
        assetMetadata,
        estimationData,
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
    assetMetadata,
    displayedFeeOptions,
    estimationData,
    debouncedGasFee,
    network.rpcBaseURL,
    setValue,
    debouncedStorageLimit,
    submitOperation,
    tezos
  ]);

  useEffect(() => void setRawTransaction(), [setRawTransaction]);

  const handleFeeOptionSelect = useCallback(
    (label: FeeOptionLabel) => {
      setSelectedFeeOption(label);
      setValue('gasFee', '', { shouldValidate: true });
    },
    [setValue]
  );

  const onSubmit = useCallback(
    async ({ gasFee, storageLimit }: TezosTxParamsFormData) => {
      try {
        if (formState.isSubmitting) return;

        if (!estimationData || !displayedFeeOptions) {
          toastError('Failed to estimate transaction.');

          return;
        }

        const operation = await submitOperation(
          tezos,
          gasFee,
          storageLimit,
          assetMetadata,
          estimationData,
          displayedFeeOptions
        );

        onConfirm();
        onClose();

        // @ts-expect-error
        const txHash = operation?.hash || operation?.opHash;

        setTimeout(() => toastSuccess('Transaction Submitted', true, txHash), CLOSE_ANIMATION_TIMEOUT * 2);
      } catch (err: any) {
        console.error(err);

        setLatestSubmitError(err.errors ? JSON.stringify(err.errors) : err.message);
        setTab('error');
      }
    },
    [
      assetMetadata,
      displayedFeeOptions,
      estimationData,
      formState.isSubmitting,
      onClose,
      onConfirm,
      submitOperation,
      tezos
    ]
  );

  return (
    <FormProvider {...form}>
      <BaseContent<TezosTxParamsFormData>
        network={network}
        assetSlug={assetSlug}
        amount={amount}
        recipientAddress={to}
        displayedFeeOptions={displayedFeeOptions}
        displayedFee={displayedFee}
        selectedTab={tab}
        setSelectedTab={setTab}
        latestSubmitError={latestSubmitError}
        displayedStorageFee={displayedStorageFee}
        onFeeOptionSelect={handleFeeOptionSelect}
        selectedFeeOption={selectedFeeOption}
        onCancel={onClose}
        onSubmit={onSubmit}
      />
    </FormProvider>
  );
};
