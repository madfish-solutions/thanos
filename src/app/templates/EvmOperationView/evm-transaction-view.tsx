import React, { memo, useCallback, useMemo } from 'react';

import { omit } from 'lodash';
import { FormProvider } from 'react-hook-form-v7';
import { TransactionRequest, formatTransactionRequest } from 'viem';

import { HashChip } from 'app/atoms/HashChip';
import { toastError } from 'app/toaster';
import { EVM_TOKEN_SLUG } from 'lib/assets/defaults';
import { T } from 'lib/i18n';
import { EvmTransactionRequestWithSender, TempleEvmDAppTransactionPayload } from 'lib/temple/types';
import { serializeError } from 'lib/utils/serialize-error';
import { getAccountAddressForEvm } from 'temple/accounts';
import { deserializeEstimationData } from 'temple/evm/estimate';
import { isEvmEstimationData, isSerializedEvmEstimationData, parseTransactionRequest } from 'temple/evm/utils';
import { useAllAccounts, useAllEvmChains } from 'temple/front';

import { OperationViewLayout } from '../operation-view-layout';
import { EvmTxParamsFormData } from '../TransactionTabs/types';
import { useEvmEstimationForm } from '../TransactionTabs/use-evm-estimation-form';

interface EvmTransactionViewProps {
  payload: TempleEvmDAppTransactionPayload;
  formId: string;
  error: any;
  setFinalEvmTransaction: ReactSetStateFn<EvmTransactionRequestWithSender>;
  onSubmit: EmptyFn;
}

export const EvmTransactionView = memo<EvmTransactionViewProps>(
  ({ payload, formId, error, setFinalEvmTransaction, onSubmit }) => {
    const chains = useAllEvmChains();
    const { chainId, req, estimationData: serializedEstimationData, error: estimationError } = payload;
    const parsedChainId = Number(chainId);
    const parsedReq = useMemo(() => ({ ...parseTransactionRequest(req), from: req.from }), [req]);

    const accounts = useAllAccounts();
    const chain = chains[parsedChainId];
    const sendingAccount = useMemo(
      () => accounts.find(acc => getAccountAddressForEvm(acc)?.toLowerCase() === req.from.toLowerCase())!,
      [accounts, req.from]
    );

    const estimationData = useMemo(() => {
      if (!serializedEstimationData) {
        return undefined;
      }

      return isSerializedEvmEstimationData(serializedEstimationData)
        ? deserializeEstimationData(serializedEstimationData)
        : { gasPrice: BigInt(serializedEstimationData.gasPrice), type: serializedEstimationData.type };
    }, [serializedEstimationData]);
    const basicParams = useMemo(
      () => ({
        ...parsedReq,
        chainId: parsedChainId,
        kzg: parsedReq.kzg as any,
        authorizationList: parsedReq.authorizationList as any
      }),
      [parsedChainId, parsedReq]
    );
    const {
      balancesChanges,
      balancesChangesLoading,
      form,
      tab,
      setTab,
      selectedFeeOption,
      handleFeeOptionSelect,
      feeOptions,
      displayedFee,
      getFeesPerGas
    } = useEvmEstimationForm(estimationData, basicParams, sendingAccount, parsedChainId, true);
    const { formState } = form;

    const handleSubmit = useCallback(
      ({ gasPrice, gasLimit, nonce }: EvmTxParamsFormData) => {
        if (formState.isSubmitting) return;

        const feesPerGas = getFeesPerGas(gasPrice);

        if (!feesPerGas) {
          toastError('Failed to get fees.');

          return;
        }

        const finalTransaction = {
          ...parsedReq,
          ...(isEvmEstimationData(estimationData) ? omit(estimationData, 'estimatedFee') : {}),
          ...feesPerGas,
          ...(gasLimit ? { gas: BigInt(gasLimit) } : {}),
          ...(nonce ? { nonce: Number(nonce) } : {})
        } as TransactionRequest;
        setFinalEvmTransaction({ ...formatTransactionRequest(finalTransaction), from: parsedReq.from });
        onSubmit();
      },
      [estimationData, formState.isSubmitting, getFeesPerGas, onSubmit, parsedReq, setFinalEvmTransaction]
    );

    const displayedEstimationError = useMemo(() => serializeError(estimationError), [estimationError]);
    const displayedSubmitError = useMemo(() => serializeError(error), [error]);

    return (
      <FormProvider {...form}>
        <OperationViewLayout
          network={chain}
          nativeAssetSlug={EVM_TOKEN_SLUG}
          selectedTab={tab}
          setSelectedTab={setTab}
          selectedFeeOption={selectedFeeOption}
          latestSubmitError={displayedSubmitError}
          estimationError={displayedEstimationError}
          onFeeOptionSelect={handleFeeOptionSelect}
          onSubmit={handleSubmit}
          displayedFee={displayedFee}
          displayedFeeOptions={feeOptions?.displayed}
          formId={formId}
          tabsName="confirm-send-tabs"
          destinationName={req.to ? <T id="interactionWith" /> : null}
          destinationValue={req.to ? <HashChip hash={req.to} /> : null}
          sendingAccount={sendingAccount}
          balancesChanges={balancesChanges}
          balancesChangesLoading={balancesChangesLoading}
        />
      </FormProvider>
    );
  }
);
