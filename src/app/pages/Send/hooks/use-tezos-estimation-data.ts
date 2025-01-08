import { useCallback } from 'react';

import { Estimate, getRevealFee, TezosToolkit } from '@taquito/taquito';
import BigNumber from 'bignumber.js';

import { toastError } from 'app/toaster';
import { isTezAsset, toPenny } from 'lib/assets';
import { toTransferParams } from 'lib/assets/contract.utils';
import { TEZOS_BLOCK_DURATION } from 'lib/fixed-times';
import { AssetMetadataBase } from 'lib/metadata';
import { useTypedSWR } from 'lib/swr';
import { mutezToTz } from 'lib/temple/helpers';
import { tezosManagerKeyHasManager } from 'lib/tezos';
import { checkZeroBalance } from 'lib/utils/check-zero-balance';
import { AccountForTezos } from 'temple/accounts';

import { estimateTezosMaxFee } from '../form/utils';

export interface TezosEstimationData {
  baseFee: BigNumber;
  estimates: Estimate;
}

export const useTezosEstimationData = (
  to: string,
  tezos: TezosToolkit,
  chainId: string,
  account: AccountForTezos,
  accountPkh: string,
  assetSlug: string,
  balance: BigNumber,
  tezBalance: BigNumber,
  assetMetadata: AssetMetadataBase,
  toFilled?: boolean
) => {
  const estimate = useCallback(async (): Promise<TezosEstimationData | undefined> => {
    try {
      const isTez = isTezAsset(assetSlug);

      checkZeroBalance(balance, tezBalance, isTez);

      const [transferParams, manager] = await Promise.all([
        toTransferParams(tezos, assetSlug, assetMetadata, accountPkh, to, toPenny(assetMetadata)),
        tezos.rpc.getManagerKey(account.ownerAddress || accountPkh)
      ]);

      const estmtnMax = await estimateTezosMaxFee(account, isTez, tezos, to, balance, transferParams, manager);

      let estimatedBaseFee = mutezToTz(estmtnMax.burnFeeMutez + estmtnMax.suggestedFeeMutez);
      if (!tezosManagerKeyHasManager(manager)) {
        estimatedBaseFee = estimatedBaseFee.plus(mutezToTz(getRevealFee(to)));
      }

      if (isTez ? estimatedBaseFee.isGreaterThanOrEqualTo(balance) : estimatedBaseFee.isGreaterThan(tezBalance)) {
        toastError('Not enough funds');
        return;
      }

      return {
        baseFee: estimatedBaseFee,
        estimates: estmtnMax
      };
    } catch (err: any) {
      console.error(err);

      return undefined;
    }
  }, [tezBalance, balance, assetMetadata, to, assetSlug, tezos, accountPkh, account]);

  return useTypedSWR(
    () => (toFilled ? ['tezos-estimation-data', assetSlug, chainId, accountPkh, to] : null),
    estimate,
    {
      shouldRetryOnError: false,
      focusThrottleInterval: 10_000,
      dedupingInterval: TEZOS_BLOCK_DURATION
    }
  );
};
