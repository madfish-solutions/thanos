import React, { ReactNode, memo, useCallback, useMemo } from 'react';

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
import { parseTransactionRequest } from 'temple/evm/utils';
import { useAllAccounts, useAllEvmChains } from 'temple/front';

import { AccountCard } from '../AccountCard';
import { TransactionTabs } from '../TransactionTabs';
import { EvmTxParamsFormData } from '../TransactionTabs/types';
import { useEvmEstimationForm } from '../TransactionTabs/use-evm-estimation-form';

import { useEvmEstimationData } from './use-evm-estimation-data';

interface EvmTransactionViewProps {
  payload: TempleEvmDAppTransactionPayload;
  formId: string;
  error: any;
  setFinalEvmTransaction: ReactSetStateFn<EvmTransactionRequestWithSender>;
  // TODO: use `setCustomTitle` to set the appropriate title for approves, contract deployments, etc.
  setCustomTitle: ReactSetStateFn<ReactNode>;
  onSubmit: EmptyFn;
}

export const EvmTransactionView = memo<EvmTransactionViewProps>(
  ({ payload, formId, error, setFinalEvmTransaction, onSubmit }) => {
    const chains = useAllEvmChains();
    const { chainId, req } = payload;
    const parsedChainId = Number(chainId);
    const parsedReq = useMemo(() => ({ ...parseTransactionRequest(req), from: req.from }), [req]);

    const accounts = useAllAccounts();
    const chain = useMemo(() => Object.values(chains).find(c => c.chainId === parsedChainId)!, [chains, parsedChainId]);
    const sendingAccount = useMemo(
      () => accounts.find(acc => getAccountAddressForEvm(acc)?.toLowerCase() === req.from.toLowerCase())!,
      [accounts, req.from]
    );

    const { data: estimationData, error: estimationError } = useEvmEstimationData(parsedChainId, parsedReq);
    const basicParams = useMemo(
      () => ({
        ...parsedReq,
        chainId: parsedChainId,
        kzg: parsedReq.kzg as any,
        authorizationList: parsedReq.authorizationList as any
      }),
      [parsedChainId, parsedReq]
    );
    const { form, tab, setTab, selectedFeeOption, handleFeeOptionSelect, feeOptions, displayedFee, getFeesPerGas } =
      useEvmEstimationForm(estimationData, basicParams, parsedChainId);
    const { formState } = form;

    const handleSubmit = useCallback(
      ({ gasPrice, gasLimit, nonce }: EvmTxParamsFormData) => {
        if (formState.isSubmitting) return;

        const feesPerGas = getFeesPerGas(gasPrice);

        if (!estimationData || !feesPerGas) {
          toastError('Failed to estimate transaction.');

          return;
        }

        const finalTransaction = {
          ...parsedReq,
          ...omit(estimationData, 'estimatedFee'),
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
      <>
        <FormProvider {...form}>
          <AccountCard
            account={sendingAccount}
            isCurrent={false}
            attractSelf={false}
            searchValue=""
            showRadioOnHover={false}
          />

          <TransactionTabs<EvmTxParamsFormData>
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
          />
        </FormProvider>
      </>
    );
  }
);
