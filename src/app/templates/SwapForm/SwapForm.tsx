import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isDefined } from '@rnw-community/shared';
import { TransferParams } from '@taquito/taquito';
import { BatchWalletOperation } from '@taquito/taquito/dist/types/wallet/batch-operation';
import BigNumber from 'bignumber.js';
import classNames from 'clsx';
import { Controller, useForm } from 'react-hook-form';

import { Alert, FormSubmitButton } from 'app/atoms';
import { ReactComponent as InfoIcon } from 'app/icons/info.svg';
import { ReactComponent as ToggleIcon } from 'app/icons/toggle.svg';
import { buildSwapPageUrlQuery } from 'app/pages/Swap/utils/build-url-query';
import { dispatch, useSelector } from 'app/store';
import { loadSwapParamsAction, resetSwapParamsAction } from 'app/store/swap/actions';
import { useSwapParamsSelector, useSwapTokenSelector, useSwapTokensSelector } from 'app/store/swap/selectors';
import OperationStatus from 'app/templates/OperationStatus';
import { setTestID, useFormAnalytics } from 'lib/analytics';
import { fetchRoute3SwapParams } from 'lib/apis/route3/fetch-route3-swap-params';
import { TEZ_TOKEN_SLUG } from 'lib/assets';
import { KNOWN_TOKENS_SLUGS } from 'lib/assets/known-tokens';
import { T, t } from 'lib/i18n';
import { useCategorizedTezosAssetMetadata, useGetCategorizedAssetMetadata } from 'lib/metadata';
import {
  BURN_ADDREESS,
  ROUTING_FEE_ADDRESS,
  ROUTING_FEE_RATIO,
  ROUTING_FEE_SLIPPAGE_RATIO,
  SWAP_CASHBACK_RATIO,
  SWAP_THRESHOLD_TO_GET_CASHBACK,
  TEMPLE_TOKEN
} from 'lib/route3/constants';
import { isLiquidityBakingParamsResponse } from 'lib/route3/interfaces';
import { getPercentageRatio } from 'lib/route3/utils/get-percentage-ratio';
import { getRoute3TokenBySlug } from 'lib/route3/utils/get-route3-token-by-slug';
import { atomsToTokens, tokensToAtoms } from 'lib/temple/helpers';
import { TEZOS_MAINNET_CHAIN_ID } from 'lib/temple/types';
import useTippy from 'lib/ui/useTippy';
import { ZERO } from 'lib/utils/numbers';
import { parseTransferParamsToParamsWithKind } from 'lib/utils/parse-transfer-params';
import {
  calculateSidePaymentsFromInput,
  getRoutingFeeTransferParams,
  multiplyAtomicAmount,
  calculateOutputAmounts
} from 'lib/utils/swap.utils';
import { HistoryAction, navigate } from 'lib/woozie';
import { getTezosToolkitWithSigner, useTezosBlockLevel, useTezosMainnetChain } from 'temple/front';

import { SwapExchangeRate } from './SwapExchangeRate/SwapExchangeRate';
import { SwapFormValue, SwapInputValue, useSwapFormDefaultValue } from './SwapForm.form';
import styles from './SwapForm.module.css';
import { SwapFormSelectors, SwapFormFromInputSelectors, SwapFormToInputSelectors } from './SwapForm.selectors';
import { cashbackInfoTippyProps, feeInfoTippyProps } from './SwapForm.tippy';
import { SlippageToleranceInput } from './SwapFormInput/SlippageToleranceInput/SlippageToleranceInput';
import { slippageToleranceInputValidationFn } from './SwapFormInput/SlippageToleranceInput/SlippageToleranceInput.validation';
import { SwapFormInput } from './SwapFormInput/SwapFormInput';
import { SwapMinimumReceived } from './SwapMinimumReceived/SwapMinimumReceived';
import { useGetSwapTransferParams } from './use-swap-params';

const CASHBACK_SWAP_MAX_DEXES = 3;
// Actually, at most 2 dexes for each of underlying SIRS -> tzBTC -> X swap and SIRS -> XTZ -> X swap
const MAIN_SIRS_SWAP_MAX_DEXES = 4;
const MAIN_NON_SIRS_SWAP_MAX_DEXES = 3;

interface Props {
  publicKeyHash: string;
}

export const SwapForm = memo<Props>(({ publicKeyHash }) => {
  const network = useTezosMainnetChain();
  const tezos = getTezosToolkitWithSigner(network.rpcBaseURL, publicKeyHash);

  const blockLevel = useTezosBlockLevel(network.rpcBaseURL);
  const prevBlockLevelRef = useRef(blockLevel);
  const getSwapParams = useGetSwapTransferParams(tezos, publicKeyHash);
  const { data: route3Tokens } = useSwapTokensSelector();
  const swapParams = useSwapParamsSelector();
  const allUsdToTokenRates = useSelector(state => state.currency.usdToTokenRates.data);
  const getTokenMetadata = useGetCategorizedAssetMetadata(TEZOS_MAINNET_CHAIN_ID);
  const prevOutputRef = useRef(swapParams.data.output);

  const formAnalytics = useFormAnalytics('SwapForm');

  const feeInfoIconRef = useTippy<HTMLSpanElement>(feeInfoTippyProps);
  const cashbackInfoIconRef = useTippy<HTMLSpanElement>(cashbackInfoTippyProps);

  const defaultValues = useSwapFormDefaultValue();
  const { handleSubmit, errors, watch, setValue, control, register, triggerValidation } = useForm<SwapFormValue>({
    defaultValues
  });
  const isValid = Object.keys(errors).length === 0;

  const inputValue = watch('input');
  const outputValue = watch('output');
  const slippageTolerance = watch('slippageTolerance');

  const fromRoute3Token = useSwapTokenSelector(inputValue.assetSlug ?? '');
  const toRoute3Token = useSwapTokenSelector(outputValue.assetSlug ?? '');

  const inputAssetMetadata = useCategorizedTezosAssetMetadata(
    inputValue.assetSlug ?? TEZ_TOKEN_SLUG,
    TEZOS_MAINNET_CHAIN_ID
  )!;
  const outputAssetMetadata = useCategorizedTezosAssetMetadata(
    outputValue.assetSlug ?? TEZ_TOKEN_SLUG,
    TEZOS_MAINNET_CHAIN_ID
  )!;

  const [error, setError] = useState<Error>();
  const [operation, setOperation] = useState<BatchWalletOperation>();
  const isSubmitButtonPressedRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAlertVisible, setIsAlertVisible] = useState(false);

  const slippageRatio = useMemo(() => getPercentageRatio(slippageTolerance ?? 0), [slippageTolerance]);
  const { outputAtomicAmountBeforeFee, minimumReceivedAtomic, outputFeeAtomicAmount } = useMemo(
    () =>
      calculateOutputAmounts(
        inputValue.amount,
        inputAssetMetadata.decimals,
        swapParams.data.output,
        outputAssetMetadata.decimals,
        slippageRatio
      ),
    [
      inputValue.amount,
      inputAssetMetadata.decimals,
      swapParams.data.output,
      outputAssetMetadata.decimals,
      slippageRatio
    ]
  );

  const hopsAreAbsent = isLiquidityBakingParamsResponse(swapParams.data)
    ? swapParams.data.tzbtcHops.length === 0 && swapParams.data.xtzHops.length === 0
    : swapParams.data.hops.length === 0;

  const atomsInputValue = useMemo(
    () => tokensToAtoms(inputValue.amount ?? ZERO, inputAssetMetadata.decimals),
    [inputAssetMetadata.decimals, inputValue.amount]
  );

  const getSwapWithFeeParams = useCallback(
    (newInputValue: SwapInputValue, newOutputValue: SwapInputValue) => {
      const { assetSlug: inputAssetSlug, amount: inputAmount } = newInputValue;
      const outputAssetSlug = newOutputValue.assetSlug;
      const inputTokenExchangeRate = inputAssetSlug ? allUsdToTokenRates[inputAssetSlug] : '0';
      const inputAmountInUsd = inputAmount?.multipliedBy(inputTokenExchangeRate) ?? ZERO;

      const isInputTokenTempleToken = inputAssetSlug === KNOWN_TOKENS_SLUGS.TEMPLE;
      const isOutputTokenTempleToken = outputAssetSlug === KNOWN_TOKENS_SLUGS.TEMPLE;
      const isSirsSwap = inputAssetSlug === KNOWN_TOKENS_SLUGS.SIRS || outputAssetSlug === KNOWN_TOKENS_SLUGS.SIRS;
      const isSwapAmountMoreThreshold = inputAmountInUsd.isGreaterThanOrEqualTo(SWAP_THRESHOLD_TO_GET_CASHBACK);
      const mainSwapMaxDexes = isSirsSwap ? MAIN_SIRS_SWAP_MAX_DEXES : MAIN_NON_SIRS_SWAP_MAX_DEXES;

      return {
        isInputTokenTempleToken,
        isOutputTokenTempleToken,
        isSwapAmountMoreThreshold,
        mainSwapMaxDexes
      };
    },
    [allUsdToTokenRates]
  );

  const dispatchLoadSwapParams = useCallback(
    (input: SwapInputValue, output: SwapInputValue) => {
      if (!input.assetSlug || !output.assetSlug) {
        return;
      }
      const inputMetadata = getTokenMetadata(input.assetSlug);

      if (!inputMetadata) {
        return;
      }

      const { swapInputMinusFeeAtomic: amount } = calculateSidePaymentsFromInput(
        tokensToAtoms(input.amount ?? ZERO, inputMetadata.decimals)
      );

      const route3FromToken = getRoute3TokenBySlug(route3Tokens, input.assetSlug);
      const route3ToToken = getRoute3TokenBySlug(route3Tokens, output.assetSlug);
      const { mainSwapMaxDexes } = getSwapWithFeeParams(input, output);

      dispatch(
        loadSwapParamsAction.submit({
          fromSymbol: route3FromToken?.symbol ?? '',
          toSymbol: route3ToToken?.symbol ?? '',
          toTokenDecimals: route3ToToken?.decimals ?? 0,
          amount: atomsToTokens(amount, route3FromToken?.decimals ?? 0).toFixed(),
          dexesLimit: mainSwapMaxDexes,
          rpcUrl: tezos.rpc.getRpcUrl()
        })
      );
    },
    [dispatch, getSwapWithFeeParams, getTokenMetadata, route3Tokens, tezos.rpc]
  );

  useEffect(() => {
    if (isDefined(fromRoute3Token) && isDefined(toRoute3Token) && prevBlockLevelRef.current !== blockLevel) {
      dispatchLoadSwapParams(inputValue, outputValue);
    }
    prevBlockLevelRef.current = blockLevel;
  }, [blockLevel, dispatchLoadSwapParams, fromRoute3Token, inputValue, outputValue, toRoute3Token]);

  useEffect(() => {
    if (Number(swapParams.data.input) > 0 && hopsAreAbsent) {
      setIsAlertVisible(true);
    } else {
      setIsAlertVisible(false);
    }
  }, [hopsAreAbsent, swapParams.data]);

  useEffect(
    () =>
      navigate(
        { pathname: '/swap', search: buildSwapPageUrlQuery(inputValue.assetSlug, outputValue.assetSlug) },
        HistoryAction.Replace
      ),
    [inputValue.assetSlug, outputValue.assetSlug]
  );

  useEffect(() => {
    const currentOutput = swapParams.data.output;

    if (currentOutput === prevOutputRef.current) {
      return;
    }

    prevOutputRef.current = currentOutput;
    if (currentOutput === undefined) {
      setValue('output', {
        assetSlug: outputValue.assetSlug,
        amount: undefined
      });
    } else {
      const { expectedReceivedAtomic } = calculateOutputAmounts(
        inputValue.amount,
        inputAssetMetadata.decimals,
        currentOutput,
        outputAssetMetadata.decimals,
        slippageRatio
      );
      setValue('output', {
        assetSlug: outputValue.assetSlug,
        amount: atomsToTokens(expectedReceivedAtomic, outputAssetMetadata.decimals)
      });
    }

    if (isSubmitButtonPressedRef.current) {
      triggerValidation();
    }
  }, [
    slippageRatio,
    swapParams.data.output,
    setValue,
    triggerValidation,
    outputValue.assetSlug,
    outputAssetMetadata.decimals,
    inputValue.amount,
    inputAssetMetadata.decimals
  ]);

  useEffect(() => {
    register('input', {
      validate: ({ assetSlug, amount }: SwapInputValue) => {
        if (!assetSlug) {
          return t('assetMustBeSelected');
        }
        if (!amount || amount.isLessThanOrEqualTo(0)) {
          return t('amountMustBePositive');
        }

        return true;
      }
    });

    register('output', {
      validate: ({ assetSlug, amount }: SwapInputValue) => {
        if (!assetSlug) {
          return t('assetMustBeSelected');
        }
        if (!amount || amount.isLessThanOrEqualTo(0)) {
          return t('amountMustBePositive');
        }

        return true;
      }
    });
  }, [register]);

  const onSubmit = async () => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);

    const analyticsProperties = {
      inputAsset: inputValue.assetSlug,
      outputAsset: outputValue.assetSlug
    };

    formAnalytics.trackSubmit(analyticsProperties);

    const {
      swapInputMinusFeeAtomic,
      inputFeeAtomic: routingFeeFromInputAtomic,
      cashbackSwapInputAtomic: cashbackSwapInputFromInAtomic
    } = calculateSidePaymentsFromInput(atomsInputValue);

    if (!fromRoute3Token || !toRoute3Token || !swapParams.data.output || !inputValue.assetSlug) {
      return;
    }

    try {
      setOperation(undefined);

      const allSwapParams: Array<TransferParams> = [];
      let routingOutputFeeTransferParams: TransferParams[] = await getRoutingFeeTransferParams(
        toRoute3Token,
        outputFeeAtomicAmount,
        publicKeyHash,
        ROUTING_FEE_ADDRESS,
        tezos
      );

      const route3SwapOpParams = await getSwapParams(
        fromRoute3Token,
        toRoute3Token,
        swapInputMinusFeeAtomic,
        outputAtomicAmountBeforeFee,
        slippageRatio,
        swapParams.data
      );

      if (route3SwapOpParams.length === 0) {
        return;
      }

      const { isInputTokenTempleToken, isOutputTokenTempleToken, isSwapAmountMoreThreshold } = getSwapWithFeeParams(
        inputValue,
        outputValue
      );

      if (isInputTokenTempleToken && isSwapAmountMoreThreshold) {
        const routingInputFeeOpParams = await getRoutingFeeTransferParams(
          fromRoute3Token,
          routingFeeFromInputAtomic.minus(cashbackSwapInputFromInAtomic),
          publicKeyHash,
          BURN_ADDREESS,
          tezos
        );
        allSwapParams.push(...routingInputFeeOpParams);
      } else if (isInputTokenTempleToken && !isSwapAmountMoreThreshold) {
        const routingFeeOpParams = await getRoutingFeeTransferParams(
          TEMPLE_TOKEN,
          routingFeeFromInputAtomic,
          publicKeyHash,
          ROUTING_FEE_ADDRESS,
          tezos
        );
        allSwapParams.push(...routingFeeOpParams);
      } else if (!isInputTokenTempleToken && isSwapAmountMoreThreshold && routingFeeFromInputAtomic.gt(0)) {
        const swapToTempleParams = await fetchRoute3SwapParams({
          fromSymbol: fromRoute3Token.symbol,
          toSymbol: TEMPLE_TOKEN.symbol,
          toTokenDecimals: TEMPLE_TOKEN.decimals,
          amount: atomsToTokens(routingFeeFromInputAtomic, fromRoute3Token.decimals).toFixed(),
          dexesLimit: CASHBACK_SWAP_MAX_DEXES,
          rpcUrl: tezos.rpc.getRpcUrl()
        });

        const templeExpectedOutputAtomic = tokensToAtoms(
          new BigNumber(swapToTempleParams.output ?? ZERO),
          TEMPLE_TOKEN.decimals
        );
        const templeMinOutputAtomic = multiplyAtomicAmount(
          templeExpectedOutputAtomic,
          ROUTING_FEE_SLIPPAGE_RATIO,
          BigNumber.ROUND_DOWN
        );

        const swapToTempleTokenOpParams = await getSwapParams(
          fromRoute3Token,
          TEMPLE_TOKEN,
          routingFeeFromInputAtomic,
          templeExpectedOutputAtomic,
          ROUTING_FEE_SLIPPAGE_RATIO,
          swapToTempleParams
        );

        allSwapParams.push(...swapToTempleTokenOpParams);

        const routingFeeOpParams = await getRoutingFeeTransferParams(
          TEMPLE_TOKEN,
          templeMinOutputAtomic.times(ROUTING_FEE_RATIO - SWAP_CASHBACK_RATIO).dividedToIntegerBy(ROUTING_FEE_RATIO),
          publicKeyHash,
          BURN_ADDREESS,
          tezos
        );
        allSwapParams.push(...routingFeeOpParams);
      } else if (!isInputTokenTempleToken && isSwapAmountMoreThreshold && isOutputTokenTempleToken) {
        routingOutputFeeTransferParams = await getRoutingFeeTransferParams(
          TEMPLE_TOKEN,
          outputFeeAtomicAmount.times(ROUTING_FEE_RATIO - SWAP_CASHBACK_RATIO).dividedToIntegerBy(ROUTING_FEE_RATIO),
          publicKeyHash,
          BURN_ADDREESS,
          tezos
        );
      } else if (!isInputTokenTempleToken && isSwapAmountMoreThreshold) {
        const swapToTempleParams = await fetchRoute3SwapParams({
          fromSymbol: toRoute3Token.symbol,
          toSymbol: TEMPLE_TOKEN.symbol,
          toTokenDecimals: TEMPLE_TOKEN.decimals,
          amount: atomsToTokens(outputFeeAtomicAmount, toRoute3Token.decimals).toFixed(),
          dexesLimit: CASHBACK_SWAP_MAX_DEXES,
          rpcUrl: tezos.rpc.getRpcUrl()
        });

        const templeExpectedOutputAtomic = tokensToAtoms(
          new BigNumber(swapToTempleParams.output ?? ZERO),
          TEMPLE_TOKEN.decimals
        );
        const templeMinOutputAtomic = multiplyAtomicAmount(
          templeExpectedOutputAtomic,
          ROUTING_FEE_SLIPPAGE_RATIO,
          BigNumber.ROUND_DOWN
        );

        const swapToTempleTokenOpParams = await getSwapParams(
          toRoute3Token,
          TEMPLE_TOKEN,
          outputFeeAtomicAmount,
          templeExpectedOutputAtomic,
          ROUTING_FEE_SLIPPAGE_RATIO,
          swapToTempleParams
        );

        const routingFeeOpParams = await getRoutingFeeTransferParams(
          TEMPLE_TOKEN,
          templeMinOutputAtomic.times(ROUTING_FEE_RATIO - SWAP_CASHBACK_RATIO).dividedToIntegerBy(ROUTING_FEE_RATIO),
          publicKeyHash,
          BURN_ADDREESS,
          tezos
        );
        routingOutputFeeTransferParams = [...swapToTempleTokenOpParams, ...routingFeeOpParams];
      } else if (!isInputTokenTempleToken && !isSwapAmountMoreThreshold) {
        const routingInputFeeOpParams = await getRoutingFeeTransferParams(
          fromRoute3Token,
          routingFeeFromInputAtomic,
          publicKeyHash,
          ROUTING_FEE_ADDRESS,
          tezos
        );
        allSwapParams.push(...routingInputFeeOpParams);
      }

      allSwapParams.push(...route3SwapOpParams, ...routingOutputFeeTransferParams);

      const opParams = allSwapParams.map(param => parseTransferParamsToParamsWithKind(param));

      const batchOperation = await tezos.wallet.batch(opParams).send();

      setError(undefined);
      formAnalytics.trackSubmitSuccess(analyticsProperties);
      setOperation(batchOperation);
    } catch (err: any) {
      console.error(err);
      if (err.message !== 'Declined') {
        setError(err);
      }
      formAnalytics.trackSubmitFail(analyticsProperties);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleErrorClose = () => setError(undefined);
  const handleOperationClose = () => setOperation(undefined);

  const handleToggleIconClick = () => {
    setValue([{ input: { assetSlug: outputValue.assetSlug } }, { output: { assetSlug: inputValue.assetSlug } }]);
    dispatch(resetSwapParamsAction());
  };

  const handleInputChange = (newInputValue: SwapInputValue) => {
    setValue('input', newInputValue);

    if (newInputValue.assetSlug === outputValue.assetSlug) {
      setValue('output', {});
    }

    dispatchLoadSwapParams(newInputValue, outputValue);
  };

  const handleOutputChange = (newOutputValue: SwapInputValue) => {
    setValue('output', newOutputValue);

    if (newOutputValue.assetSlug === inputValue.assetSlug) {
      setValue('input', {});
    }

    dispatchLoadSwapParams(inputValue, newOutputValue);
  };

  const handleSubmitButtonClick = () => (isSubmitButtonPressedRef.current = true);

  const handleCloseAlert = () => setIsAlertVisible(false);

  return (
    <form className="mb-8" onSubmit={handleSubmit(onSubmit)}>
      {isAlertVisible && (
        <Alert
          closable
          className="mb-4"
          type="error"
          description={<T id="noRoutesFound" />}
          onClose={handleCloseAlert}
        />
      )}

      {operation && (
        <OperationStatus
          network={network}
          className="mb-8"
          closable
          typeTitle={t('swapNoun')}
          operation={operation}
          onClose={handleOperationClose}
        />
      )}

      <SwapFormInput
        network={network}
        publicKeyHash={publicKeyHash}
        name="input"
        value={inputValue}
        error={errors.input?.message as string}
        label={<T id="from" />}
        onChange={handleInputChange}
        testIDs={{
          dropdown: SwapFormFromInputSelectors.dropdown,
          input: SwapFormFromInputSelectors.assetInput,
          searchInput: SwapFormFromInputSelectors.searchInput,
          assetDropDownButton: SwapFormFromInputSelectors.assetDropDownButton
        }}
        noItemsText={t('noItemsWithPositiveBalance')}
      />

      <div className="w-full my-4 flex justify-center">
        <button onClick={handleToggleIconClick} type="button" {...setTestID(SwapFormSelectors.swapPlacesButton)}>
          <ToggleIcon className="w-6 h-auto stroke-2 stroke-current text-blue-500" />
        </button>
      </div>

      <SwapFormInput
        network={network}
        publicKeyHash={publicKeyHash}
        className="mb-6"
        name="output"
        value={outputValue}
        error={errors.output?.message as string}
        label={<T id="toAsset" />}
        amountInputDisabled={true}
        onChange={handleOutputChange}
        testIDs={{
          dropdown: SwapFormToInputSelectors.dropdown,
          input: SwapFormToInputSelectors.assetInput,
          searchInput: SwapFormToInputSelectors.searchInput,
          assetDropDownButton: SwapFormToInputSelectors.assetDropDownButton
        }}
      />

      <FormSubmitButton
        className="w-full justify-center border-none mb-6"
        style={{
          padding: '10px 2rem',
          background: isValid && !isAlertVisible ? '#4299e1' : '#c2c2c2'
        }}
        loading={isSubmitting || swapParams.isLoading}
        keepChildrenWhenLoading={swapParams.isLoading}
        onClick={handleSubmitButtonClick}
        testID={SwapFormSelectors.swapButton}
      >
        <T id={swapParams.isLoading ? 'searchingTheBestRoute' : 'swap'} />
      </FormSubmitButton>

      <div className="pb-2 mb-2 w-full border-b">
        <table className={classNames('w-full text-xs text-gray-500', styles['swap-form-table'])}>
          <tbody>
            <tr>
              <td>
                <span ref={feeInfoIconRef} className="flex w-fit items-center hover:bg-gray-100 text-gray-500">
                  <T id="routingFee" />
                  &nbsp;
                  <InfoIcon className="w-3 h-auto stroke-current" />
                </span>
              </td>
              <td className="text-right text-gray-600">{ROUTING_FEE_RATIO * 100}%</td>
            </tr>
            <tr>
              <td>
                <T id="exchangeRate" />
              </td>
              <td className="text-right text-gray-600">
                <SwapExchangeRate
                  inputAmount={swapParams.data.input !== undefined ? new BigNumber(swapParams.data.input) : undefined}
                  outputAmount={
                    swapParams.data.output !== undefined ? new BigNumber(swapParams.data.output) : undefined
                  }
                  inputAssetMetadata={inputAssetMetadata}
                  outputAssetMetadata={outputAssetMetadata}
                />
              </td>
            </tr>
            <tr>
              <td>
                <T id="slippageTolerance" />
              </td>
              <td className="justify-end text-gray-600 flex">
                <Controller
                  control={control}
                  as={SlippageToleranceInput}
                  error={!!errors.slippageTolerance}
                  name="slippageTolerance"
                  rules={{ validate: slippageToleranceInputValidationFn }}
                />
              </td>
            </tr>
            <tr>
              <td>
                <T id="minimumReceived" />
              </td>
              <td className="text-right text-gray-600">
                <SwapMinimumReceived
                  minimumReceivedAmount={minimumReceivedAtomic}
                  outputAssetMetadata={outputAssetMetadata}
                />
              </td>
            </tr>
            <tr>
              <td>
                <span ref={cashbackInfoIconRef} className="flex w-fit items-center hover:bg-gray-100 text-gray-500">
                  <T id="swapCashback" />
                  &nbsp;
                  <InfoIcon className="w-3 h-auto stroke-current" />
                </span>
              </td>
              <td className="text-right text-gray-600">{SWAP_CASHBACK_RATIO * 100}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {error && (
        <Alert
          className="mb-6"
          type="error"
          title={t('error')}
          description={error.message}
          closable
          onClose={handleErrorClose}
        />
      )}

      {/* TODO: add a route display */}

      <p className="text-center text-gray-700 max-w-xs m-auto">
        <span className="mr-1">
          <T id="swapRoute3Description" />
        </span>
        <a className="underline" href="https://3route.io" target="_blank" rel="noreferrer">
          <T id="swapRoute3Link" />
        </a>
      </p>
    </form>
  );
});
