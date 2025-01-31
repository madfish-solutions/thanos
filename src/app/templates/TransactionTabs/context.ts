import { useState } from 'react';

import constate from 'constate';

import { EvmEstimationData } from 'temple/evm/estimate';

import { EvmFeeOptions, TezosEstimationData } from './types';

type ExtendedEvmEstimationData = EvmEstimationData & {
  feeOptions: EvmFeeOptions;
};

export const [EvmEstimationDataProvider, useEvmEstimationDataState] = constate(() => {
  const [data, setData] = useState<ExtendedEvmEstimationData | nullish>(null);

  return { data, setData };
});

export const [TezosEstimationDataProvider, useTezosEstimationDataState] = constate(() => {
  const [data, setData] = useState<TezosEstimationData | nullish>(null);

  return { data, setData };
});
