import BigNumber from 'bignumber.js';

import { FeeOptionLabel } from './types';

export const validateNonZero = (value: string, fieldName: string) =>
  value !== '0' || `${fieldName} should be more than 0`;

const TezosFeeOptions: Record<FeeOptionLabel, number> = {
  slow: 1e-4,
  mid: 1.5e-4,
  fast: 2e-4
};

export const getTezosFeeOption = (option: FeeOptionLabel, baseFee: BigNumber) =>
  baseFee.plus(TezosFeeOptions[option]).toString();
