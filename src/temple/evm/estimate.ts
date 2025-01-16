import {
  FeeValues,
  FeeValuesEIP1559,
  FeeValuesLegacy,
  PrepareTransactionRequestRequest,
  TransactionRequest
} from 'viem';

import { EvmChain } from 'temple/front';

import { getReadOnlyEvmForNetwork } from '.';

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

function getEstimatedFee(fees: FeeValues & { gas: bigint }): bigint;
function getEstimatedFee(fees: Partial<FeeValues & { gas: bigint }>): bigint | undefined;
function getEstimatedFee(fees: Partial<FeeValues & { gas: bigint }>): bigint | undefined {
  const gasPrice = fees.gasPrice ?? fees.maxFeePerGas;

  return fees.gas !== undefined && gasPrice !== undefined ? fees.gas * gasPrice : undefined;
}

type EstimationPayload = PrepareTransactionRequestRequest & { from?: HexString };

export const estimate = async (network: EvmChain, req: EstimationPayload): Promise<EvmEstimationData> => {
  const { gasPrice, maxFeePerGas, maxPriorityFeePerGas, ...restReqProps } = req;
  const publicClient = getReadOnlyEvmForNetwork(network);

  const transaction = await publicClient.prepareTransactionRequest(restReqProps);

  const commonProps = {
    estimatedFee: getEstimatedFee(transaction),
    data: transaction.data || '0x',
    gas: transaction.gas,
    nonce: transaction.nonce
  };

  switch (transaction.type) {
    case 'legacy':
    case 'eip2930':
      return {
        ...commonProps,
        type: transaction.type,
        gasPrice: transaction.gasPrice
      };
    case 'eip1559':
    case 'eip7702':
      return {
        ...commonProps,
        type: transaction.type,
        maxFeePerGas: transaction.maxFeePerGas,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas
      };
    default:
      throw new Error('Unsupported transaction type');
  }
};
