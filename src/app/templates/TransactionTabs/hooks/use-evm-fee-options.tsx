import { pick, transform } from 'lodash';
import { FeeValues, formatEther } from 'viem';

import { useMemoWithCompare } from 'lib/ui/hooks';
import { EvmEstimationData } from 'temple/evm/estimate';
import { getGasPriceStep } from 'temple/evm/utils';

import { EvmFeeOptions, FeeOptionLabel } from '../types';

const generateOptions = <T extends FeeValues, U extends string>(
  type: U,
  estimatedValues: T,
  gas: bigint,
  getDisplayedGasPrice: (fees: T) => bigint
) => {
  const stepsQuotients = { slow: -1, mid: 0, fast: 1 };

  const gasPrice = transform<Record<FeeOptionLabel, number>, Record<FeeOptionLabel, T>>(
    stepsQuotients,
    (optionsAcc, stepsQuotient, key) => {
      optionsAcc[key] = transform<T, T>(
        estimatedValues,
        (optionAcc, value, key) => {
          if (typeof value === 'bigint') {
            const step = getGasPriceStep(value);
            optionAcc[key] = (value + step * BigInt(stepsQuotient)) as typeof value;
          }

          return optionAcc;
        },
        { ...estimatedValues }
      );

      return optionsAcc;
    },
    { slow: estimatedValues, mid: estimatedValues, fast: estimatedValues }
  );

  const displayed = transform<Record<FeeOptionLabel, T>, Record<FeeOptionLabel, string>>(
    gasPrice,
    (acc, fees, key) => {
      acc[key] = formatEther(gas * getDisplayedGasPrice(fees));

      return acc;
    },
    { slow: '', mid: '', fast: '' }
  );

  return { type, displayed, gasPrice };
};

export const useEvmFeeOptions = (customGasLimit: string, estimationData?: EvmEstimationData): EvmFeeOptions | null =>
  useMemoWithCompare(() => {
    if (!estimationData) return null;

    const gas = customGasLimit ? BigInt(customGasLimit) : estimationData.gas;

    switch (estimationData.type) {
      case 'legacy':
      case 'eip2930':
        return generateOptions('legacy' as const, pick(estimationData, 'gasPrice'), gas, fees => fees.gasPrice);
      case 'eip1559':
      case 'eip7702':
        return generateOptions(
          'eip1559' as const,
          pick(estimationData, 'maxFeePerGas', 'maxPriorityFeePerGas'),
          gas,
          fees => fees.maxFeePerGas
        );
      default:
        throw new Error('Unsupported transaction type');
    }
  }, [estimationData, customGasLimit]);
