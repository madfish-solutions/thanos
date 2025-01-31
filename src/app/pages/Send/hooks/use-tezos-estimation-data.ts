import { useCallback } from 'react';

import { getRevealFee, TezosToolkit } from '@taquito/taquito';
import BigNumber from 'bignumber.js';

import { TezosEstimationData } from 'app/templates/TransactionTabs/types';
import { toastError } from 'app/toaster';
import { isTezAsset, toPenny } from 'lib/assets';
import { toTransferParams } from 'lib/assets/contract.utils';
import { TEZOS_BLOCK_DURATION } from 'lib/fixed-times';
import { AssetMetadataBase } from 'lib/metadata';
import { useTypedSWR } from 'lib/swr';
import { mutezToTz } from 'lib/temple/helpers';
import { tezosManagerKeyHasManager } from 'lib/tezos';
import { checkZeroBalance } from 'lib/utils/check-zero-balance';
import { ZERO } from 'lib/utils/numbers';
import { serializeEstimate } from 'lib/utils/serialize-estimate';
import { AccountForTezos } from 'temple/accounts';

import { estimateTezosMaxFee } from '../form/utils';

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
      const from = account.ownerAddress || accountPkh;

      checkZeroBalance(balance, tezBalance, isTez);

      const [transferParams, manager] = await Promise.all([
        toTransferParams(tezos, assetSlug, assetMetadata, accountPkh, to, toPenny(assetMetadata)),
        tezos.rpc.getManagerKey(from)
      ]);

      const estmtnMax = await estimateTezosMaxFee(account, isTez, tezos, from, to, balance, transferParams, manager);

      const revealFeeMutez = tezosManagerKeyHasManager(manager) ? ZERO : mutezToTz(getRevealFee(from));
      const estimatedBaseFee = mutezToTz(estmtnMax.burnFeeMutez + estmtnMax.suggestedFeeMutez).plus(revealFeeMutez);

      if (isTez ? estimatedBaseFee.isGreaterThanOrEqualTo(balance) : estimatedBaseFee.isGreaterThan(tezBalance)) {
        toastError('Not enough funds');
        return;
      }

      return {
        baseFee: estimatedBaseFee,
        gasFee: mutezToTz(estmtnMax.suggestedFeeMutez).plus(revealFeeMutez),
        revealFee: revealFeeMutez,
        estimates: [serializeEstimate(estmtnMax)]
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
