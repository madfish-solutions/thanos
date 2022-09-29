import { isKnownChainId, makeQuery, TZKT_API_BASE_URLS_MAP } from './api';
import {
  allInt32ParameterKeys,
  TzktGetOperationsParams,
  TzktGetRewardsParams,
  TzktGetRewardsResponse,
  TzktOperation,
  TzktRelatedContract,
  TzktTokenTransfer,
  TzktAccountTokenBalance
} from './types';

export { TZKT_API_BASE_URLS_MAP };

export const getOperations = makeQuery<TzktGetOperationsParams, TzktOperation[]>(
  params => `/accounts/${params.address}/operations`,
  ({ address, type, quote, from, to, ...restParams }) => ({
    type: type?.join(','),
    quote: quote?.join(','),
    'timestamp.lt': to,
    'timestamp.ge': from,
    ...restParams
  })
);

export const getFa12Transfers = makeQuery<TzktGetOperationsParams, TzktOperation[]>(
  () => `/operations/transactions`,
  ({ address, from, to, ...restParams }) => ({
    'sender.ne': address,
    'target.ne': address,
    'initiator.ne': address,
    entrypoint: 'transfer',
    'parameter.to': address,
    'timestamp.lt': to,
    'timestamp.ge': from,
    ...restParams
  })
);

export const getFa2Transfers = makeQuery<TzktGetOperationsParams, TzktOperation[]>(
  () => `/operations/transactions`,
  ({ address, from, to, ...restParams }) => ({
    'sender.ne': address,
    'target.ne': address,
    'initiator.ne': address,
    entrypoint: 'transfer',
    'parameter.[*].txs.[*].to_': address,
    'timestamp.lt': to,
    'timestamp.ge': from,
    ...restParams
  })
);

const getTokenBalances = makeQuery<TzktGetOperationsParams, TzktAccountTokenBalance[]>(
  () => `/tokens/balances`,
  ({ address, offset, limit, ...restParams }) => ({
    account: address,
    offset,
    limit,
    'sort.desc': 'balance',
    'token.metadata.artifactUri.null': true,
    ...restParams
  })
);

const getNFTBalances = makeQuery<TzktGetOperationsParams, TzktAccountTokenBalance[]>(
  () => `/tokens/balances`,
  ({ address, offset, limit, ...restParams }) => ({
    account: address,
    offset,
    limit,
    'sort.desc': 'balance',
    'token.metadata.artifactUri.null': false,
    ...restParams
  })
);

export const getTokenTransfers = makeQuery<TzktGetOperationsParams, Array<TzktTokenTransfer>>(
  () => `/tokens/transfers`,
  ({ address, limit, type, ...restParams }) => ({
    'anyof.from.to': address,
    limit,
    type: type?.join(','),
    ...restParams
  })
);

export const getTokenTransfersCount = makeQuery<TzktGetOperationsParams, number>(
  () => `/tokens/transfers/count`,
  ({ address, limit, type, ...restParams }) => ({
    'anyof.from.to': address,
    limit,
    type: type?.join(','),
    ...restParams
  })
);
const getTokenBalancesCount = makeQuery<TzktGetOperationsParams, number>(
  () => `/tokens/balances/count`,
  ({ address, ...restParams }) => ({
    account: address,
    'token.metadata.artifactUri.null': true,
    ...restParams
  })
);

const getNFTBalancesCount = makeQuery<TzktGetOperationsParams, number>(
  () => `/tokens/balances/count`,
  ({ address, ...restParams }) => ({
    account: address,
    'token.metadata.artifactUri.null': false,
    ...restParams
  })
);

type GetUserContractsParams = {
  account: string;
};

export const getOneUserContracts = makeQuery<GetUserContractsParams, TzktRelatedContract[]>(
  ({ account }) => `/accounts/${account}/contracts`,
  () => ({})
);

export const getDelegatorRewards = makeQuery<TzktGetRewardsParams, TzktGetRewardsResponse>(
  ({ address }) => `/rewards/delegators/${address}`,
  ({ cycle = {}, sort, quote, ...restParams }) => ({
    ...allInt32ParameterKeys.reduce(
      (cycleParams, key) => ({
        ...cycleParams,
        [`cycle.${key}`]: cycle[key]
      }),
      {}
    ),
    ...(sort ? { [`sort.${sort}`]: 'cycle' } : {}),
    quote: quote?.join(','),
    ...restParams
  })
);

export const TZKT_FETCH_QUERY_SIZE = 20;

export const fetchTokenBalancesCount = async (chainId: string, address: string) => {
  if (!isKnownChainId(chainId)) {
    return 0;
  }

  const count = await getTokenBalancesCount(chainId, {
    address
  });

  return count;
};

export const fetchTokenBalances = async (chainId: string, address: string, page = 0) => {
  if (!isKnownChainId(chainId)) {
    return [];
  }

  const balances = await getTokenBalances(chainId, {
    address,
    limit: TZKT_FETCH_QUERY_SIZE,
    offset: page * TZKT_FETCH_QUERY_SIZE
  });

  return balances;
};

export const fetchNFTBalancesCount = async (chainId: string, address: string) => {
  if (!isKnownChainId(chainId)) {
    return 0;
  }

  const count = await getNFTBalancesCount(chainId, {
    address
  });

  return count;
};

export const fetchNFTBalances = async (chainId: string, address: string, page = 0) => {
  if (!isKnownChainId(chainId)) {
    return [];
  }

  const balances = await getNFTBalances(chainId, {
    address,
    limit: TZKT_FETCH_QUERY_SIZE,
    offset: page * TZKT_FETCH_QUERY_SIZE
  });

  return balances;
};
