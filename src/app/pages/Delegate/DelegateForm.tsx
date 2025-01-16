import React, { memo, ReactNode, useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import { DEFAULT_FEE, DelegateParams, TransactionOperation, WalletOperation } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import { Controller, useForm } from 'react-hook-form';

import { NoSpaceField } from 'app/atoms';
import { ArtificialError, NotEnoughFundsError, ZeroBalanceError } from 'app/defaults';
import { useAppEnv } from 'app/env';
import OperationStatus from 'app/templates/OperationStatus';
import { useFormAnalytics } from 'lib/analytics';
import { submitDelegation } from 'lib/apis/everstake';
import { RECOMMENDED_ADD_TEZ_GAS_FEE } from 'lib/constants';
import { TEZOS_BLOCK_DURATION } from 'lib/fixed-times';
import { TID, t } from 'lib/i18n';
import { RECOMMENDED_BAKER_ADDRESS } from 'lib/known-bakers';
import { setDelegate } from 'lib/michelson';
import { useTypedSWR } from 'lib/swr';
import { loadContract } from 'lib/temple/contract';
import { useKnownBaker, validateDelegate } from 'lib/temple/front';
import { mutezToTz, tzToMutez } from 'lib/temple/helpers';
import { isTezosContractAddress, isValidTezosAddress, tezosManagerKeyHasManager } from 'lib/tezos';
import { useSafeState } from 'lib/ui/hooks';
import { fifoResolve } from 'lib/utils';
import { AccountForTezos } from 'temple/accounts';
import { getTezosToolkitWithSigner } from 'temple/front';
import { getTezosDomainsClient, isTezosDomainsNameValid, useTezosAddressByDomainName } from 'temple/front/tezos';
import { isTezosDcpChainId, TezosNetworkEssentials } from 'temple/networks';

import { BakerForm, BakerFormProps } from './BakerForm';
import { UnchangedError, UnregisteredDelegateError } from './errors';
import { DelegateFormSelectors } from './selectors';

const PENNY = 0.000001;

interface FormData {
  to: string;
  fee: number;
}

interface Props {
  network: TezosNetworkEssentials;
  account: AccountForTezos;
  balance: BigNumber;
}

const DelegateForm = memo<Props>(({ network, account, balance }) => {
  const { registerBackHandler } = useAppEnv();
  const formAnalytics = useFormAnalytics('DelegateForm');

  const isDcpNetwork = isTezosDcpChainId(network.chainId);

  const { rpcBaseURL: rpcUrl, chainId: tezosChainId } = network;
  const ownerAddress = account.ownerAddress;
  const accountPkh = account.address;
  const tezos = getTezosToolkitWithSigner(rpcUrl, ownerAddress || accountPkh);

  const balanceNum = balance.toNumber();
  const domainsClient = getTezosDomainsClient(network.chainId, network.rpcBaseURL);
  const canUseDomainNames = domainsClient.isSupported;

  /**
   * Form
   */

  const { watch, handleSubmit, errors, control, formState, setValue, triggerValidation, reset } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      fee: RECOMMENDED_ADD_TEZ_GAS_FEE
    }
  });

  const toValue = watch('to');

  const toFilledWithAddress = useMemo(() => Boolean(toValue && isValidTezosAddress(toValue)), [toValue]);
  const toFilledWithDomain = useMemo(
    () => toValue && isTezosDomainsNameValid(toValue, domainsClient),
    [toValue, domainsClient]
  );
  const { data: resolvedAddress } = useTezosAddressByDomainName(toValue, network);

  const toFieldRef = useRef<HTMLTextAreaElement>(null);

  const toFilled = useMemo(
    () => (resolvedAddress ? toFilledWithDomain : toFilledWithAddress),
    [toFilledWithAddress, toFilledWithDomain, resolvedAddress]
  );

  const toResolved = useMemo(() => resolvedAddress || toValue, [resolvedAddress, toValue]);

  const getEstimation = useCallback(async () => {
    if (ownerAddress) {
      const contract = await loadContract(tezos, accountPkh);
      const transferParams = contract.methods.do(setDelegate(toResolved)).toTransferParams();
      return tezos.estimate.transfer(transferParams);
    } else {
      return tezos.estimate.setDelegate({
        source: accountPkh,
        delegate: toResolved
      } as DelegateParams);
    }
  }, [tezos, accountPkh, ownerAddress, toResolved]);

  const cleanToField = useCallback(() => {
    setValue('to', '');
    triggerValidation('to');
  }, [setValue, triggerValidation]);

  useLayoutEffect(() => {
    if (toFilled) {
      return registerBackHandler(() => {
        cleanToField();
        window.scrollTo(0, 0);
      });
    }
    return undefined;
  }, [toFilled, registerBackHandler, cleanToField]);

  const estimateBaseFee = useCallback(async () => {
    try {
      if (balance.isZero()) throw new ZeroBalanceError();

      const estmtn = await getEstimation();
      const manager = await tezos.rpc.getManagerKey(ownerAddress || accountPkh);

      let baseFee = mutezToTz(estmtn.burnFeeMutez + estmtn.suggestedFeeMutez);
      if (!tezosManagerKeyHasManager(manager) && !ownerAddress) {
        baseFee = baseFee.plus(mutezToTz(DEFAULT_FEE.REVEAL));
      }

      if (baseFee.isGreaterThanOrEqualTo(balance)) {
        throw new NotEnoughFundsError();
      }

      return baseFee;
    } catch (err: any) {
      if (err instanceof ArtificialError) {
        return err;
      }

      console.error(err);

      switch (true) {
        case ['delegate.unchanged', 'delegate.already_active'].some(errorLabel => err?.id.includes(errorLabel)):
          return new UnchangedError(err.message);

        case err?.id.includes('unregistered_delegate'):
          return new UnregisteredDelegateError(err.message);

        default:
          throw err;
      }
    }
  }, [balance, tezos, getEstimation, accountPkh, ownerAddress]);

  const {
    data: baseFee,
    error: estimateBaseFeeError,
    isValidating: estimating
  } = useTypedSWR(
    () => (toFilled ? ['delegate-base-fee', tezos.clientId, accountPkh, toResolved] : null),
    estimateBaseFee,
    {
      shouldRetryOnError: false,
      focusThrottleInterval: 10_000,
      dedupingInterval: TEZOS_BLOCK_DURATION
    }
  );
  const baseFeeError = baseFee instanceof Error ? baseFee : estimateBaseFeeError;
  const estimationError = !estimating ? baseFeeError : null;

  const { data: baker, isValidating: bakerValidating } = useKnownBaker(toResolved || null, tezosChainId, false);

  const maxAddFee = useMemo(() => {
    if (baseFee instanceof BigNumber) {
      return new BigNumber(balanceNum).minus(baseFee).minus(PENNY).toNumber();
    }
    return undefined;
  }, [balanceNum, baseFee]);

  const fifoValidateDelegate = useMemo(
    () => fifoResolve((value: any) => validateDelegate(value, domainsClient, validateAddress)),
    [domainsClient]
  );

  const handleFeeFieldChange = useCallback<BakerFormProps['handleFeeFieldChange']>(
    ([v]) => (maxAddFee && v > maxAddFee ? maxAddFee : v),
    [maxAddFee]
  );

  const [submitError, setSubmitError] = useSafeState<ReactNode>(null, `${tezos.clientId}_${toResolved}`);
  const [operation, setOperation] = useSafeState<any>(null, tezos.clientId);

  const onSubmit = useCallback(
    async ({ fee: feeVal }: FormData) => {
      const to = toResolved;
      if (formState.isSubmitting) return;
      setSubmitError(null);
      setOperation(null);

      const analyticsProperties = { bakerAddress: to };

      formAnalytics.trackSubmit(analyticsProperties);
      try {
        const estmtn = await getEstimation();
        const addFee = tzToMutez(feeVal ?? 0);
        const fee = addFee.plus(estmtn.suggestedFeeMutez).toNumber();
        let op: WalletOperation | TransactionOperation;
        let opHash = '';
        if (ownerAddress) {
          const contract = await loadContract(tezos, accountPkh);
          op = await contract.methods.do(setDelegate(to)).send({ amount: 0 });
        } else {
          op = await tezos.wallet
            .setDelegate({
              source: accountPkh,
              delegate: to,
              fee
            } as any)
            .send();

          opHash = op.opHash;
        }

        setOperation(op);
        reset({ to: '', fee: RECOMMENDED_ADD_TEZ_GAS_FEE });

        if (to === RECOMMENDED_BAKER_ADDRESS && opHash) {
          submitDelegation(opHash);
        }

        formAnalytics.trackSubmitSuccess(analyticsProperties);
      } catch (err: any) {
        formAnalytics.trackSubmitFail(analyticsProperties);

        if (err.message === 'Declined') {
          return;
        }

        console.error(err);

        setSubmitError(err);
      }
    },
    [
      ownerAddress,
      formState.isSubmitting,
      tezos,
      accountPkh,
      setSubmitError,
      setOperation,
      reset,
      getEstimation,
      formAnalytics,
      toResolved
    ]
  );

  return (
    <>
      {operation && (
        <OperationStatus network={network} typeTitle={t('delegation')} operation={operation} className="mb-8" />
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="to"
          as={<NoSpaceField ref={toFieldRef} />}
          control={control}
          rules={{ validate: fifoValidateDelegate }}
          onChange={([v]) => v}
          onFocus={() => toFieldRef.current?.focus()}
          textarea
          rows={2}
          cleanable={Boolean(toValue)}
          onClean={cleanToField}
          id="delegate-to"
          label={isDcpNetwork ? t('producer') : t('customBaker')}
          labelDescription={
            canUseDomainNames
              ? t('bakerInputDescriptionWithDomain')
              : isDcpNetwork
              ? t('producerInputDescription')
              : t('bakerInputDescription')
          }
          placeholder={canUseDomainNames ? t('recipientInputPlaceholderWithDomain') : t('bakerInputPlaceholder')}
          errorCaption={errors.to?.message && t(errors.to.message.toString() as TID)}
          style={{
            resize: 'none'
          }}
          containerClassName={!resolvedAddress && 'mb-6'}
          fieldWrapperBottomMargin={false}
          testID={DelegateFormSelectors.bakerInput}
        />

        {resolvedAddress && (
          <div className="mb-6 text-xs font-light text-gray-600 flex flex-wrap items-center">
            <span className="mr-1 whitespace-nowrap">{t('resolvedAddress')}:</span>
            <span className="font-normal">{resolvedAddress}</span>
          </div>
        )}

        <BakerForm
          tezosChainId={tezosChainId}
          accountPkh={accountPkh}
          baker={baker}
          balance={balance}
          submitError={submitError}
          estimationError={estimationError}
          estimating={estimating}
          baseFee={baseFee}
          toFilled={toFilled}
          bakerValidating={bakerValidating}
          control={control}
          errors={errors}
          handleFeeFieldChange={handleFeeFieldChange}
          setValue={setValue}
          triggerValidation={triggerValidation}
          formState={formState}
        />
      </form>
    </>
  );
});

export default DelegateForm;

function validateAddress(value: string) {
  switch (false) {
    case value.length > 0:
      return true;

    case isValidTezosAddress(value):
      return 'invalidAddress';

    case !isTezosContractAddress(value):
      return 'unableToDelegateToKTAddress';

    default:
      return true;
  }
}
