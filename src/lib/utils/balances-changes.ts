import { AssetsAmounts } from 'temple/types';

export const stripZeroBalancesChanges = (balancesChanges: AssetsAmounts) =>
  Object.fromEntries(Object.entries(balancesChanges).filter(([, { atomicAmount }]) => !atomicAmount.isZero()));
