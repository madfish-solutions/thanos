import { ContractMethodObject, ContractProvider, OpKind, TezosToolkit, TransferParams, Wallet } from '@taquito/taquito';
import { BigNumber } from 'bignumber.js';

import { Route3Token } from 'lib/apis/route3/fetch-route3-tokens';
import { FEE_PER_GAS_UNIT } from 'lib/constants';
import {
  APP_ID,
  ATOMIC_INPUT_THRESHOLD_FOR_FEE_FROM_INPUT,
  LIQUIDITY_BAKING_PROXY_CONTRACT,
  ROUTE3_CONTRACT,
  ROUTING_FEE_RATIO,
  SWAP_CASHBACK_RATIO
} from 'lib/route3/constants';
import { isSwapHops, Route3LiquidityBakingHops, Route3SwapHops } from 'lib/route3/interfaces';
import { isRoute3GasToken } from 'lib/route3/utils/assets.utils';
import { mapToRoute3ExecuteHops } from 'lib/route3/utils/map-to-route3-hops';
import { loadContract } from 'lib/temple/contract';

import { getTransferPermissions } from './get-transfer-permissions';
import { ZERO } from './numbers';

const GAS_CAP_PER_INTERNAL_OPERATION = 1000;

const isSwapTransaction = (params: TransferParams) =>
  params.to === ROUTE3_CONTRACT || params.to === LIQUIDITY_BAKING_PROXY_CONTRACT;

export const getSwapTransferParams = async (
  fromRoute3Token: Route3Token,
  toRoute3Token: Route3Token,
  inputAmountAtomic: BigNumber,
  minimumReceivedAtomic: BigNumber,
  chains: Route3LiquidityBakingHops | Route3SwapHops,
  tezos: TezosToolkit,
  accountPkh: string
) => {
  const resultParams: Array<TransferParams> = [];
  let swapMethod: ContractMethodObject<Wallet | ContractProvider>;

  if (isSwapHops(chains)) {
    const swapContract = await loadContract(tezos, ROUTE3_CONTRACT, false);
    swapMethod = swapContract.methodsObject.execute({
      token_in_id: fromRoute3Token.id,
      token_out_id: toRoute3Token.id,
      min_out: minimumReceivedAtomic,
      receiver: accountPkh,
      hops: mapToRoute3ExecuteHops(chains.hops),
      app_id: APP_ID
    });
  } else {
    const liquidityBakingProxyContract = await loadContract(tezos, LIQUIDITY_BAKING_PROXY_CONTRACT, false);
    swapMethod = liquidityBakingProxyContract.methodsObject.swap({
      token_in_id: fromRoute3Token.id,
      token_out_id: toRoute3Token.id,
      tez_hops: mapToRoute3ExecuteHops(chains.xtzHops),
      tzbtc_hops: mapToRoute3ExecuteHops(chains.tzbtcHops),
      amount_in: inputAmountAtomic,
      min_out: minimumReceivedAtomic,
      receiver: accountPkh,
      app_id: APP_ID
    });
  }

  if (fromRoute3Token.symbol.toLowerCase() === 'xtz') {
    resultParams.push(
      swapMethod.toTransferParams({
        amount: inputAmountAtomic.toNumber(),
        mutez: true
      })
    );
  } else {
    resultParams.push(swapMethod.toTransferParams());
  }

  const { approve, revoke } = await getTransferPermissions(
    tezos,
    isSwapHops(chains) ? ROUTE3_CONTRACT : LIQUIDITY_BAKING_PROXY_CONTRACT,
    accountPkh,
    fromRoute3Token,
    inputAmountAtomic
  );

  resultParams.unshift(...approve);
  try {
    const estimations = await tezos.estimate.batch(
      resultParams.map(params => ({ kind: OpKind.TRANSACTION, ...params }))
    );
    estimations.forEach(({ suggestedFeeMutez, storageLimit, gasLimit }, index) => {
      const currentParams = resultParams[index];
      const approximateInternalOperationsCount = isSwapTransaction(currentParams)
        ? 1 + (isSwapHops(chains) ? chains.hops.length : chains.xtzHops.length + chains.tzbtcHops.length)
        : 1;
      const gasCap = approximateInternalOperationsCount * GAS_CAP_PER_INTERNAL_OPERATION;
      currentParams.fee = suggestedFeeMutez + Math.ceil(gasCap * FEE_PER_GAS_UNIT);
      currentParams.storageLimit = storageLimit;
      currentParams.gasLimit = gasLimit + gasCap;
    });
  } catch (e) {
    console.error(e);
    const swapOpParams = resultParams.find(isSwapTransaction)!;
    // The quotients for calculations below are taken from analyzing several estimations
    swapOpParams.fee = isSwapHops(chains)
      ? 1100 + 1400 * chains.hops.length
      : 4700 + 3900 * chains.tzbtcHops.length + 1200 * chains.xtzHops.length;
    swapOpParams.gasLimit = isSwapHops(chains)
      ? 8000 + 14000 * chains.hops.length
      : 44000 + 39000 * chains.tzbtcHops.length + 12000 * chains.xtzHops.length;
  }
  resultParams.push(...revoke);

  return resultParams;
};

export const calculateSidePaymentsFromInput = (inputAmount: BigNumber | undefined) => {
  const swapInputAtomic = (inputAmount ?? ZERO).integerValue(BigNumber.ROUND_DOWN);
  const shouldTakeFeeFromInput = swapInputAtomic.gte(ATOMIC_INPUT_THRESHOLD_FOR_FEE_FROM_INPUT);
  const inputFeeAtomic = shouldTakeFeeFromInput
    ? swapInputAtomic.times(ROUTING_FEE_RATIO).integerValue(BigNumber.ROUND_CEIL)
    : ZERO;
  const cashbackSwapInputAtomic = shouldTakeFeeFromInput
    ? swapInputAtomic.times(SWAP_CASHBACK_RATIO).integerValue()
    : ZERO;
  const swapInputMinusFeeAtomic = swapInputAtomic.minus(inputFeeAtomic);

  return {
    inputFeeAtomic,
    cashbackSwapInputAtomic,
    swapInputMinusFeeAtomic
  };
};

export const calculateOutputFeeAtomic = (inputAmount: BigNumber | undefined, outputAmount: BigNumber) => {
  const swapInputAtomic = (inputAmount ?? ZERO).integerValue(BigNumber.ROUND_DOWN);

  return swapInputAtomic.gte(ATOMIC_INPUT_THRESHOLD_FOR_FEE_FROM_INPUT)
    ? ZERO
    : outputAmount.times(ROUTING_FEE_RATIO).integerValue(BigNumber.ROUND_CEIL);
};

export const getRoutingFeeTransferParams = async (
  token: Route3Token,
  feeAmountAtomic: BigNumber,
  senderPublicKeyHash: string,
  routingFeeAddress: string,
  tezos: TezosToolkit
) => {
  if (feeAmountAtomic.lte(ZERO)) {
    return [];
  }

  if (isRoute3GasToken(token.contract)) {
    return [
      {
        amount: feeAmountAtomic.toNumber(),
        to: routingFeeAddress,
        mutez: true
      }
    ];
  }

  const assetContract = await tezos.wallet.at(token.contract);

  if (token.standard === 'fa12') {
    return [
      assetContract.methodsObject
        .transfer({ from: senderPublicKeyHash, to: routingFeeAddress, value: feeAmountAtomic })
        .toTransferParams({ mutez: true })
    ];
  }
  if (token.standard === 'fa2') {
    return [
      assetContract.methodsObject
        .transfer([
          {
            from_: senderPublicKeyHash,
            txs: [
              {
                to_: routingFeeAddress,
                token_id: token.tokenId,
                amount: feeAmountAtomic
              }
            ]
          }
        ])
        .toTransferParams({ mutez: true })
    ];
  }

  return [];
};
