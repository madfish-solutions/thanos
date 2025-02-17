import { Estimate } from '@taquito/taquito';

import { SerializedEstimate } from 'lib/temple/types';

export const serializeEstimate = (e: Estimate): SerializedEstimate => ({
  opSize: e.opSize,
  // @ts-expect-error: accessing private property
  minimalFeePerStorageByteMutez: e.minimalFeePerStorageByteMutez,
  burnFeeMutez: e.burnFeeMutez,
  consumedMilligas: e.consumedMilligas,
  gasLimit: e.gasLimit,
  minimalFeeMutez: e.minimalFeeMutez,
  storageLimit: e.storageLimit,
  suggestedFeeMutez: e.suggestedFeeMutez,
  totalCost: e.totalCost,
  usingBaseFeeMutez: e.usingBaseFeeMutez
});
