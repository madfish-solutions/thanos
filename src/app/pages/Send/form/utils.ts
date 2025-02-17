import { ManagerKeyResponse } from '@taquito/rpc';
import { Estimate, getRevealFee, TezosToolkit, TransferParams } from '@taquito/taquito';
import BigNumber from 'bignumber.js';

import { transferImplicit, transferToContract } from 'lib/michelson';
import { loadContract } from 'lib/temple/contract';
import { mutezToTz, tzToMutez } from 'lib/temple/helpers';
import { TempleAccountType } from 'lib/temple/types';
import { isTezosContractAddress, tezosManagerKeyHasManager } from 'lib/tezos';
import { AccountForTezos } from 'temple/accounts';

const TEZOS_PENNY = 0.000001;

export const getMaxAmountFiat = (assetPrice: number | null, maxAmountAsset: BigNumber) =>
  assetPrice ? maxAmountAsset.times(assetPrice).decimalPlaces(2, BigNumber.ROUND_FLOOR) : new BigNumber(0);

export const getTezosMaxAmountToken = (
  accountType: TempleAccountType,
  balance: BigNumber,
  baseFee: BigNumber,
  safeFeeValue: number
) =>
  BigNumber.max(
    accountType === TempleAccountType.ManagedKT
      ? balance
      : balance
          .minus(baseFee)
          .minus(safeFeeValue ?? 0)
          .minus(TEZOS_PENNY),
    0
  );

type TransferParamsInvariant =
  | TransferParams
  | {
      to: string;
      amount: any;
    };

export const estimateTezosMaxFee = async (
  acc: AccountForTezos,
  tez: boolean,
  tezos: TezosToolkit,
  from: string,
  to: string,
  balanceBN: BigNumber,
  transferParams: TransferParamsInvariant,
  manager: ManagerKeyResponse
) => {
  let estmtnMax: Estimate;
  if (acc.type === TempleAccountType.ManagedKT) {
    const michelsonLambda = isTezosContractAddress(to) ? transferToContract : transferImplicit;

    const contract = await loadContract(tezos, acc.address);
    const transferParamsWrapper = contract.methodsObject
      .do(michelsonLambda(to, tzToMutez(balanceBN)))
      .toTransferParams();
    estmtnMax = await tezos.estimate.transfer(transferParamsWrapper);
  } else if (tez) {
    const estmtn = await tezos.estimate.transfer(transferParams);
    let amountMax = balanceBN.minus(mutezToTz(estmtn.totalCost));
    if (!tezosManagerKeyHasManager(manager)) {
      amountMax = amountMax.minus(mutezToTz(getRevealFee(from)));
    }
    estmtnMax = await tezos.estimate.transfer({
      to,
      amount: amountMax.toString() as any
    });
  } else {
    estmtnMax = await tezos.estimate.transfer(transferParams);
  }
  return estmtnMax;
};

export const getBaseFeeError = (baseFee: BigNumber | undefined, estimateBaseFeeError: any) =>
  baseFee instanceof Error ? baseFee : estimateBaseFeeError;

export const getFeeError = (estimating: boolean, feeError: any) => (!estimating ? feeError : null);
