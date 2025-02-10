import { useCallback } from 'react';

import BigNumber from 'bignumber.js';
import { FeeValuesEIP1559, FeeValuesLegacy, TransactionRequest } from 'viem';

import { toastError } from 'app/toaster';
import { isNativeTokenAddress } from 'lib/apis/temple/endpoints/evm/api.utils';
import { useEvmCategorizedAssetMetadata } from 'lib/metadata';
import { useTypedSWR } from 'lib/swr';
import { getReadOnlyEvmForNetwork } from 'temple/evm';
import { EvmChain } from 'temple/front';

import { buildBasicEvmSendParams } from '../build-basic-evm-send-params';

import { checkZeroBalance } from './utils';

interface EvmEstimationDataBase {
  estimatedFee: bigint;
  data: HexString;
  type: NonNullable<TransactionRequest['type']>;
  gas: bigint;
  nonce: number;
}

interface LegacyEvmEstimationData extends EvmEstimationDataBase, FeeValuesLegacy {
  type: 'legacy' | 'eip2930';
}

interface Eip1559EvmEstimationData extends EvmEstimationDataBase, FeeValuesEIP1559 {
  type: 'eip1559' | 'eip7702';
}

export type EvmEstimationData = LegacyEvmEstimationData | Eip1559EvmEstimationData;

export const useEvmEstimationData = (
  to: HexString,
  assetSlug: string,
  accountPkh: HexString,
  network: EvmChain,
  balance: BigNumber,
  ethBalance: BigNumber,
  toFilled?: boolean,
  amount?: string
) => {
  const assetMetadata = useEvmCategorizedAssetMetadata(assetSlug, network.chainId);

  const estimate = useCallback(async (): Promise<EvmEstimationData | undefined> => {
    try {
      if (!assetMetadata) {
        throw new Error('Asset metadata not found');
      }

      const isNativeToken = isNativeTokenAddress(network.chainId, assetSlug);

      checkZeroBalance(balance, ethBalance, isNativeToken);

      const publicClient = getReadOnlyEvmForNetwork(network);

      const transaction = await publicClient.prepareTransactionRequest({
        ...buildBasicEvmSendParams(accountPkh, to, assetMetadata, amount),
        account: accountPkh
      });

      switch (transaction.type) {
        case 'legacy':
        case 'eip2930':
          return {
            estimatedFee: transaction.gas * transaction.gasPrice,
            data: transaction.data || '0x',
            type: transaction.type,
            gas: transaction.gas,
            gasPrice: transaction.gasPrice,
            nonce: transaction.nonce
          };
        case 'eip1559':
        case 'eip7702':
          return {
            estimatedFee: transaction.gas * transaction.maxFeePerGas,
            data: transaction.data || '0x',
            type: transaction.type,
            gas: transaction.gas,
            maxFeePerGas: transaction.maxFeePerGas,
            maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
            nonce: transaction.nonce
          };
        default:
          throw new Error('Unsupported transaction type');
      }
    } catch (err: any) {
      console.warn(err);
      toastError(err.details || err.message);

      return undefined;
    }
  }, [network, assetSlug, balance, ethBalance, accountPkh, to, amount, assetMetadata]);

  return useTypedSWR(
    toFilled ? ['evm-estimation-data', network.chainId, assetSlug, accountPkh, to, amount] : null,
    estimate,
    {
      shouldRetryOnError: false,
      focusThrottleInterval: 10_000,
      dedupingInterval: 10_000
    }
  );
};
