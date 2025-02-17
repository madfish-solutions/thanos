import { BalancesChanges } from 'temple/types';

export const stripZeroBalancesChanges = (balancesChanges: BalancesChanges) =>
  Object.fromEntries(Object.entries(balancesChanges).filter(([, { atomicAmount }]) => !atomicAmount.isZero()));
