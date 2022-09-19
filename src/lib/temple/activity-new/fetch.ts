import { detectTokenStandard } from 'lib/temple/assets/tokenStandard';
import { ReactiveTezosToolkit } from 'lib/temple/front';
import type { TempleAccount } from 'lib/temple/types';
import type { TzktApiChainId } from 'lib/tzkt/api';
import * as TZKT from 'lib/tzkt/api';
import type { TzktOperation } from 'lib/tzkt/types';

import { Activity, OperGroup, operGroupToActivity } from './utils';

////
const TEZ_TOKEN_SLUG = 'tez';
const LIQUIDITY_BAKING_DEX_ADDRESS = 'KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5';

////

/**
 * @return activities[number].operations // not necessarily sorted new-to-old
 */
export default async function fetchActivities(
  chainId: TzktApiChainId,
  account: TempleAccount,
  assetSlug: string | undefined,
  pseudoLimit: number,
  tezos: ReactiveTezosToolkit,
  olderThan?: Activity
): Promise<Activity[]> {
  const { publicKeyHash: accAddress } = account;

  const operations = await fetchOperations(chainId, account, assetSlug, pseudoLimit, tezos, olderThan);

  const groups = await _fetchOperGroupsForOperations(chainId, operations, olderThan);

  return groups.map(group => operGroupToActivity(group));
}

////

/**
 * Returned items are sorted new-to-old.
 *
 * @arg pseudoLimit // Is pseudo, because, number of returned activities is not guarantied to equal to it.
 * 	It can also be smaller, even when older items are available (they can be fetched later).
 */
async function fetchOperations(
  chainId: TzktApiChainId,
  account: TempleAccount,
  assetSlug: string | undefined,
  pseudoLimit: number,
  tezos: ReactiveTezosToolkit,
  olderThan?: Activity
): Promise<TzktOperation[]> {
  const { publicKeyHash: accAddress } = account;

  if (assetSlug) {
    const [contractAddress, tokenId] = (assetSlug ?? '').split('_');

    if (assetSlug === TEZ_TOKEN_SLUG) {
      return await fetchOperations_TEZ(chainId, accAddress, pseudoLimit, olderThan);
    } else if (assetSlug === LIQUIDITY_BAKING_DEX_ADDRESS) {
      return await fetchOperations_Contract(chainId, accAddress, pseudoLimit, olderThan);
    } else {
      const tokenType = await detectTokenStandard(tezos, contractAddress);

      if (tokenType === 'fa1.2') {
        return await fetchOperations_Token_Fa_1_2(chainId, accAddress, contractAddress, pseudoLimit, olderThan);
      } else if (tokenType === 'fa2') {
        return await fetchOperations_Token_Fa_2(chainId, accAddress, contractAddress, tokenId, pseudoLimit, olderThan);
      }
    }
  }

  return await fetchOperations_Any(chainId, accAddress, pseudoLimit, olderThan);
}

async function fetchOperations_TEZ(
  chainId: TzktApiChainId,
  accountAddress: string,
  pseudoLimit: number,
  olderThan?: Activity
) {
  const olderThanId = olderThan?.tzktOperations[olderThan.tzktOperations.length - 1]?.id;

  return await TZKT.fetchGetAccountOperations(chainId, accountAddress, {
    type: 'transaction',
    lastId: olderThanId,
    limit: pseudoLimit,
    sort: 1,
    'parameter.null': true
  });
}

async function fetchOperations_Contract(
  chainId: TzktApiChainId,
  accountAddress: string,
  pseudoLimit: number,
  olderThan?: Activity
) {
  const olderThanLevel = olderThan?.tzktOperations[olderThan.tzktOperations.length - 1]?.level;

  return await TZKT.fetchGetAccountOperations(chainId, accountAddress, {
    type: 'transaction',
    limit: pseudoLimit,
    sort: 1,
    initiator: accountAddress,
    entrypoint: 'mintOrBurn',
    'level.lt': olderThanLevel
  });
}

async function fetchOperations_Token_Fa_1_2(
  chainId: TzktApiChainId,
  accountAddress: string,
  contractAddress: string,
  pseudoLimit: number,
  olderThan?: Activity
) {
  const olderThanLevel = olderThan?.tzktOperations[olderThan.tzktOperations.length - 1]?.level;

  return await TZKT.fetchGetOperationsTransactions(chainId, {
    limit: pseudoLimit,
    entrypoint: 'transfer',
    'sort.desc': 'level',
    target: contractAddress,
    'parameter.in': `[{"from":"${accountAddress}"},{"to":"${accountAddress}"}]`,
    'level.lt': olderThanLevel
  });
}

async function fetchOperations_Token_Fa_2(
  chainId: TzktApiChainId,
  accountAddress: string,
  contractAddress: string,
  tokenId = '0',
  pseudoLimit: number,
  olderThan?: Activity
) {
  const olderThanLevel = olderThan?.tzktOperations[olderThan.tzktOperations.length - 1]?.level;

  return await TZKT.fetchGetOperationsTransactions(chainId, {
    limit: pseudoLimit,
    entrypoint: 'transfer',
    'sort.desc': 'level',
    target: contractAddress,
    'parameter.[*].in': `[{"from_":"${accountAddress}","txs":[{"token_id":"${tokenId}"}]},{"txs":[{"to_":"${accountAddress}","token_id":"${tokenId}"}]}]`,
    'level.lt': olderThanLevel
  });
}

async function fetchOperations_Any(
  chainId: TzktApiChainId,
  accountAddress: string,
  pseudoLimit: number,
  olderThan?: Activity
) {
  const limit = pseudoLimit;
  const olderThanId = olderThan?.tzktOperations[olderThan.tzktOperations.length - 1]?.id;

  const accOperations = await TZKT.fetchGetAccountOperations(chainId, accountAddress, {
    type: ['delegation', 'origination', 'transaction'],
    lastId: olderThanId,
    limit,
    sort: 1
  });

  let newerThen: string | undefined = accOperations[accOperations.length - 1]?.timestamp;

  const fa12OperationsTransactions = await TZKT.refetchOnce429(
    () =>
      fetchIncomingOperTransactions_Fa_1_2(chainId, accountAddress, newerThen ? { newerThen } : { limit }, olderThanId),
    1000
  );

  if (newerThen == null) {
    newerThen = fa12OperationsTransactions[accOperations.length - 1]?.timestamp;
  }

  const fa2OperationsTransactions = await TZKT.refetchOnce429(
    () =>
      fetchIncomingOperTransactions_Fa_2(chainId, accountAddress, newerThen ? { newerThen } : { limit }, olderThanId),
    1000
  );

  const allOperations = accOperations
    .concat(fa12OperationsTransactions, fa2OperationsTransactions)
    .sort((b, a) => a.id - b.id);

  return allOperations;
}

////

async function fetchIncomingOperTransactions_Fa_1_2(
  chainId: TzktApiChainId,
  accountAddress: string,
  endLimitation:
    | {
        limit: number;
      }
    | {
        newerThen: string;
      },
  olderThanId?: number
) {
  const bottomParams = 'limit' in endLimitation ? endLimitation : { 'timestamp.ge': endLimitation.newerThen };

  const result = TZKT.fetchGetOperationsTransactions(chainId, {
    'sender.ne': accountAddress,
    'target.ne': accountAddress,
    'initiator.ne': accountAddress,
    'parameter.to': accountAddress,
    entrypoint: 'transfer',
    lastId: olderThanId,
    ...bottomParams,
    'sort.desc': 'id'
  });

  return result;
}

async function fetchIncomingOperTransactions_Fa_2(
  chainId: TzktApiChainId,
  accountAddress: string,
  endLimitation:
    | {
        limit: number;
      }
    | {
        newerThen: string;
      },
  olderThanId?: number
) {
  const bottomParams = 'limit' in endLimitation ? endLimitation : { 'timestamp.ge': endLimitation.newerThen };

  const result = await TZKT.fetchGetOperationsTransactions(chainId, {
    'sender.ne': accountAddress,
    'target.ne': accountAddress,
    'initiator.ne': accountAddress,
    'parameter.[*].txs.[*].to_': accountAddress,
    entrypoint: 'transfer',
    lastId: olderThanId,
    ...bottomParams,
    'sort.desc': 'id'
  });

  return result;
}

//// PRIVATE

/**
 * @return groups[number].operations // sorted new-to-old
 */
async function _fetchOperGroupsForOperations(
  chainId: TzktApiChainId,
  operations: TzktOperation[],
  olderThan?: Activity
) {
  let allHashes = operations.map(d => d.hash);

  const uniqueHashes: string[] = [];
  for (const hash of allHashes) {
    if (uniqueHashes.includes(hash) === false) uniqueHashes.push(hash);
  }

  if (olderThan && uniqueHashes[0] === olderThan.hash) uniqueHashes.splice(1);

  const groups: OperGroup[] = [];
  for (const hash of uniqueHashes) {
    const operations = await TZKT.refetchOnce429(() => TZKT.fetchGetOperationsByHash(chainId, hash), 1000);
    operations.sort((b, a) => a.id - b.id);
    groups.push({
      hash,
      operations
    });
  }

  return groups;
}
