import {
  Chain,
  FeeValues,
  FeeValuesEIP1559,
  FeeValuesLegacy,
  PrepareTransactionRequestRequest,
  TransactionRequest
} from 'viem';

import type { EvmChain } from 'temple/front';

import { SerializedBigints, toBigintRecord } from './utils';

import { getReadOnlyEvm, getReadOnlyEvmForNetwork } from '.';

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

type SerializedLegacyEvmEstimationData = SerializedBigints<LegacyEvmEstimationData>;

interface Eip1559EvmEstimationData extends EvmEstimationDataBase, FeeValuesEIP1559 {
  type: 'eip1559' | 'eip7702';
}

type SerializedEip1559EvmEstimationData = SerializedBigints<Eip1559EvmEstimationData>;

export type EvmEstimationData = LegacyEvmEstimationData | Eip1559EvmEstimationData;

export type SerializedEvmEstimationData = SerializedLegacyEvmEstimationData | SerializedEip1559EvmEstimationData;

export const deserializeEstimationData = (data: SerializedEvmEstimationData) => {
  const { estimatedFee, gas, gasPrice, maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas, ...restProps } = data;

  return {
    ...restProps,
    ...toBigintRecord({ estimatedFee, gas, gasPrice, maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas })
  } as EvmEstimationData;
};

function getEstimatedFee(fees: FeeValues & { gas: bigint }): bigint;
function getEstimatedFee(fees: Partial<FeeValues & { gas: bigint }>): bigint | undefined;
function getEstimatedFee(fees: Partial<FeeValues & { gas: bigint }>): bigint | undefined {
  const gasPrice = fees.gasPrice ?? fees.maxFeePerGas;

  return fees.gas !== undefined && gasPrice !== undefined ? fees.gas * gasPrice : undefined;
}

type EstimationPayload = PrepareTransactionRequestRequest & { account?: HexString };

export const estimate = async (
  network: EvmChain | { chain: Chain; rpcUrl: string },
  req: EstimationPayload
): Promise<EvmEstimationData> => {
  const { gasPrice, maxFeePerGas, maxPriorityFeePerGas, ...restReqProps } = req;
  const publicClient =
    'allRpcs' in network ? getReadOnlyEvmForNetwork(network) : getReadOnlyEvm(network.rpcUrl, network.chain);

  // @ts-expect-error: weird 'none of those signatures are compatible with each other' error
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
