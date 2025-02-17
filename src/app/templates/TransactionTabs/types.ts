import BigNumber from 'bignumber.js';
import { FeeValues, FeeValuesEIP1559, FeeValuesLegacy } from 'viem';

import { SerializedEstimate } from 'lib/temple/types';

export interface EvmTxParamsFormData {
  gasPrice: string;
  gasLimit: string;
  nonce: string;
  data: string;
  rawTransaction: string;
}

export interface TezosTxParamsFormData {
  gasFee: string;
  storageLimit: string;
  raw: object;
  bytes: string;
}

export type TxParamsFormData = EvmTxParamsFormData | TezosTxParamsFormData;

export interface TezosEstimationData {
  baseFee: BigNumber;
  gasFee: BigNumber;
  revealFee: BigNumber;
  estimates: SerializedEstimate[];
}

export type FeeOptionLabel = 'slow' | 'mid' | 'fast';

export interface DisplayedFeeOptions {
  slow: string;
  mid: string;
  fast: string;
}

type EvmFeeOptionType = 'legacy' | 'eip1559';

interface EvmFeeOptionsBase {
  type: EvmFeeOptionType;
  displayed: DisplayedFeeOptions;
  gasPrice: Record<FeeOptionLabel, FeeValues>;
}

interface EvmLegacyFeeOptions extends EvmFeeOptionsBase {
  type: 'legacy';
  gasPrice: Record<FeeOptionLabel, FeeValuesLegacy>;
}

interface EvmEip1559FeeOptions extends EvmFeeOptionsBase {
  type: 'eip1559';
  gasPrice: Record<FeeOptionLabel, FeeValuesEIP1559>;
}

export type EvmFeeOptions = EvmLegacyFeeOptions | EvmEip1559FeeOptions;

export type Tab = 'details' | 'fee' | 'advanced' | 'error';
