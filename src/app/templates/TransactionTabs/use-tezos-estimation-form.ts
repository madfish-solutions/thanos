import { useCallback, useEffect, useMemo, useState } from 'react';

import { ForgeParams, localForger } from '@taquito/local-forging';
import { Estimate, TezosToolkit, WalletParamsWithKind, getRevealFee } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import { useForm } from 'react-hook-form-v7';
import { BehaviorSubject, EMPTY, catchError, from, of, switchMap } from 'rxjs';
import { useDebounce } from 'use-debounce';

import { buildFinalTezosOpParams, mutezToTz, tzToMutez } from 'lib/temple/helpers';
import { ReadOnlySigner } from 'lib/temple/read-only-signer';
import { SerializedEstimate, StoredAccount } from 'lib/temple/types';
import { getBalancesChanges } from 'lib/tezos';
import { useSafeState } from 'lib/ui/hooks';
import { ZERO } from 'lib/utils/numbers';
import { serializeEstimate } from 'lib/utils/serialize-estimate';
import { AccountForChain, getAccountAddressForTezos } from 'temple/accounts';
import { getTezosToolkitWithSigner } from 'temple/front';
import { getTezosFastRpcClient, michelEncoder } from 'temple/tezos';
import { AssetsAmounts, TempleChainKind } from 'temple/types';

import { DEFAULT_INPUT_DEBOUNCE } from './constants';
import { useTezosEstimationDataState } from './context';
import { DisplayedFeeOptions, FeeOptionLabel, Tab, TezosEstimationData, TezosTxParamsFormData } from './types';
import { getTezosFeeOption } from './utils';

const SEND_TEZ_TO_NON_EMPTY_ESTIMATE = new Estimate(169000, 0, 155, 250, 100);

export const useTezosEstimationForm = (
  estimationData: TezosEstimationData | undefined,
  basicParams: WalletParamsWithKind[] | undefined,
  senderAccount: StoredAccount | AccountForChain<TempleChainKind.Tezos>,
  rpcBaseURL: string,
  chainId: string,
  simulateOperation?: boolean,
  sourcePkIsRevealed = true
) => {
  const ownerAddress =
    'ownerAddress' in senderAccount
      ? senderAccount.ownerAddress
      : 'owner' in senderAccount
      ? senderAccount.owner
      : undefined;
  const accountPkh = useMemo(
    () => ('address' in senderAccount ? senderAccount.address : getAccountAddressForTezos(senderAccount)!),
    [senderAccount]
  );
  const sender = ownerAddress || accountPkh;
  const tezos = getTezosToolkitWithSigner(rpcBaseURL, sender, true);
  const estimates = estimationData?.estimates;
  const params$ = useMemo(() => new BehaviorSubject<ForgeParams | null>(null), []);
  const [balancesChanges, setBalancesChanges] = useSafeState<AssetsAmounts>({});
  const [balancesChangesLoading, setBalancesChangesLoading] = useSafeState(false);

  const revealFee = useMemo(
    () => estimationData?.revealFee ?? (sourcePkIsRevealed ? ZERO : mutezToTz(getRevealFee(sender))),
    [estimationData?.revealFee, sender, sourcePkIsRevealed]
  );

  useEffect(() => {
    const deltas$ = params$.pipe(
      switchMap(operation => {
        if (!operation) {
          return EMPTY;
        }

        return from(tezos.rpc.simulateOperation({ operation, chain_id: chainId })).pipe(
          catchError(e => {
            console.error(e);

            return from(
              tezos.rpc.simulateOperation({ operation: { contents: operation.contents }, chain_id: chainId })
            );
          }),
          switchMap(response => {
            if (
              response.contents.some(
                entry =>
                  'metadata' in entry &&
                  'operation_result' in entry.metadata &&
                  entry.metadata.operation_result.status !== 'applied'
              )
            ) {
              throw new Error('Could not get results by simulation');
            }

            setBalancesChangesLoading(false);

            return of(getBalancesChanges(response.contents, accountPkh));
          }),
          catchError(e => {
            console.error(e);

            try {
              return of(getBalancesChanges(operation.contents, accountPkh));
            } catch (err) {
              console.error(err);

              return EMPTY;
            } finally {
              setBalancesChangesLoading(false);
            }
          })
        );
      })
    );

    const sub = deltas$.subscribe(deltas => {
      setBalancesChanges(deltas);
    });

    return () => sub.unsubscribe();
  }, [accountPkh, params$, tezos.rpc, chainId, setBalancesChangesLoading, setBalancesChanges]);

  const defaultValues = useMemo(() => {
    let gasFee: BigNumber | undefined;
    let storageLimit: BigNumber | undefined;

    if (basicParams) {
      gasFee = tzToMutez(revealFee);
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

    return { gasFee: gasFee?.toString() ?? '', storageLimit: storageLimit?.toString() ?? '' };
  }, [basicParams, revealFee]);
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

  const gasFeeFromEstimation = estimationData?.gasFee;
  const displayedFeeOptions = useMemo<DisplayedFeeOptions | undefined>(() => {
    const gasFee =
      gasFeeFromEstimation ??
      (basicParams
        ? mutezToTz(SEND_TEZ_TO_NON_EMPTY_ESTIMATE.suggestedFeeMutez * basicParams.length).plus(revealFee)
        : undefined);

    if (!(gasFee instanceof BigNumber)) return;

    return {
      slow: getTezosFeeOption('slow', gasFee),
      mid: getTezosFeeOption('mid', gasFee),
      fast: getTezosFeeOption('fast', gasFee)
    };
  }, [basicParams, gasFeeFromEstimation, revealFee]);

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
    if (!basicParams) return;

    const estimatesWithFallback =
      estimates ??
      Array<SerializedEstimate>(basicParams.length).fill(serializeEstimate(SEND_TEZ_TO_NON_EMPTY_ESTIMATE));

    const storageLimit = debouncedStorageLimit || totalDefaultStorageLimit.toString();
    const minimalFeePerStorageByteMutez = estimatesWithFallback[0].minimalFeePerStorageByteMutez;

    return mutezToTz(new BigNumber(storageLimit).times(minimalFeePerStorageByteMutez)).toString();
  }, [basicParams, estimates, debouncedStorageLimit, totalDefaultStorageLimit]);

  useEffect(() => {
    if (gasFeeValue && selectedFeeOption) setSelectedFeeOption(null);
  }, [gasFeeValue, selectedFeeOption]);

  const makeFinalOpParams = useCallback(
    (gasFee: string, storageLimit: string, revealFee: BigNumber, displayedFeeOptions?: DisplayedFeeOptions) => {
      if (!displayedFeeOptions || !basicParams) return;

      return buildFinalTezosOpParams(
        basicParams,
        tzToMutez(gasFee || displayedFeeOptions[selectedFeeOption || 'mid'])
          .minus(tzToMutez(revealFee))
          .toNumber(),
        storageLimit ? Number(storageLimit) : totalDefaultStorageLimit.toNumber()
      );
    },
    [basicParams, selectedFeeOption, totalDefaultStorageLimit]
  );

  const submitOperation = useCallback(
    async (
      tezos: TezosToolkit,
      gasFee: string,
      storageLimit: string,
      revealFee: BigNumber,
      displayedFeeOptions?: DisplayedFeeOptions
    ) => {
      const opParams = makeFinalOpParams(gasFee, storageLimit, revealFee, displayedFeeOptions);

      return opParams ? await tezos.wallet.batch(opParams).send() : undefined;
    },
    [makeFinalOpParams]
  );

  const trySignOperation = useCallback(
    async (
      tezos: TezosToolkit,
      gasFee: string,
      storageLimit: string,
      revealFee: BigNumber,
      displayedFeeOptions?: DisplayedFeeOptions
    ) => {
      const opParams = makeFinalOpParams(gasFee, storageLimit, revealFee, displayedFeeOptions);

      if (!opParams) {
        return;
      }

      const forgeParams = tezos.prepare.toForge(await tezos.prepare.batch(opParams));

      try {
        await tezos.signer.sign(await localForger.forge(forgeParams), new Uint8Array([3]));
      } catch {
        // Do nothing
      }

      return forgeParams;
    },
    [makeFinalOpParams]
  );

  const setRawTransaction = useCallback(async () => {
    try {
      if (simulateOperation) {
        setBalancesChangesLoading(true);
      }
      const sourcePublicKey = await tezos.wallet.pk();

      let bytesToSign: string | undefined;
      const signer = new ReadOnlySigner(accountPkh, sourcePublicKey, digest => {
        bytesToSign = digest;
      });

      const readOnlyTezos = new TezosToolkit(getTezosFastRpcClient(rpcBaseURL));
      readOnlyTezos.setSignerProvider(signer);
      readOnlyTezos.setPackerProvider(michelEncoder);

      const forgeParams = await trySignOperation(
        readOnlyTezos,
        debouncedGasFee,
        debouncedStorageLimit,
        revealFee,
        displayedFeeOptions
      ).catch(() => undefined);

      if (bytesToSign && forgeParams) {
        if (simulateOperation) {
          params$.next(forgeParams);
        }
        setValue('raw', forgeParams);
        setValue('bytes', bytesToSign);
      } else if (simulateOperation) {
        setBalancesChangesLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setBalancesChangesLoading(false);
    }
  }, [
    accountPkh,
    displayedFeeOptions,
    debouncedGasFee,
    rpcBaseURL,
    setValue,
    debouncedStorageLimit,
    trySignOperation,
    tezos,
    revealFee,
    simulateOperation,
    params$,
    setBalancesChangesLoading
  ]);

  useEffect(() => void setRawTransaction(), [setRawTransaction]);

  const handleFeeOptionSelect = useCallback(
    (label: FeeOptionLabel) => {
      setSelectedFeeOption(label);
      setValue('gasFee', '', { shouldValidate: true });
    },
    [setValue]
  );

  const getFeeParams = useCallback(
    (customGasFee: string, customStorageLimit: string) => {
      const parsedCustomGasFee = new BigNumber(customGasFee);
      const parsedCustomStorageLimit = new BigNumber(customStorageLimit);
      const currentGasFeePreset = displayedFeeOptions?.[selectedFeeOption || 'mid'];

      return {
        gasFee: parsedCustomGasFee.isPositive()
          ? parsedCustomGasFee
          : currentGasFeePreset
          ? new BigNumber(currentGasFeePreset)
          : null,
        storageLimit: parsedCustomStorageLimit.gte(0) ? parsedCustomStorageLimit : totalDefaultStorageLimit
      };
    },
    [totalDefaultStorageLimit, displayedFeeOptions, selectedFeeOption]
  );

  return {
    balancesChanges,
    balancesChangesLoading,
    form,
    tab,
    setTab,
    selectedFeeOption,
    getFeeParams,
    handleFeeOptionSelect,
    submitOperation,
    displayedFeeOptions,
    displayedFee,
    displayedStorageFee
  };
};
