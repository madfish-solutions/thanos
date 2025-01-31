import { useCallback, useMemo } from 'react';

import { ChainIds } from '@taquito/taquito';
import retry from 'async-retry';
import BigNumber from 'bignumber.js';
import useSWR, { unstable_serialize, useSWRConfig } from 'swr';

import { BoundaryError } from 'app/ErrorBoundary';
import { BakingBadBaker, bakingBadGetBaker, getAllBakersBakingBad } from 'lib/apis/baking-bad';
import { getAccountStatsFromTzkt, isKnownChainId, TzktRewardsEntry, TzktAccountType } from 'lib/apis/tzkt';
import { t } from 'lib/i18n';
import { useRetryableSWR } from 'lib/swr';
import { getOnlineStatus } from 'lib/ui/get-online-status';
import { TezosNetworkEssentials } from 'temple/networks';
import { getReadOnlyTezos } from 'temple/tezos';

function getDelegateCacheKey(
  rpcUrl: string,
  address: string,
  chainId: string | nullish,
  shouldPreventErrorPropagation: boolean
) {
  return ['delegate', rpcUrl, address, chainId, shouldPreventErrorPropagation];
}

export function useDelegate(
  address: string,
  network: TezosNetworkEssentials,
  suspense = true,
  shouldPreventErrorPropagation = true
) {
  const { rpcBaseURL, chainId } = network;

  const { cache: swrCache } = useSWRConfig();

  const resetDelegateCache = useCallback(() => {
    swrCache.delete(
      unstable_serialize(getDelegateCacheKey(rpcBaseURL, address, chainId, shouldPreventErrorPropagation))
    );
  }, [address, rpcBaseURL, chainId, swrCache, shouldPreventErrorPropagation]);

  const getDelegate = useCallback(async () => {
    try {
      const tezos = getReadOnlyTezos(rpcBaseURL);

      return await retry(
        async () => {
          const freshChainId = chainId ?? (await tezos.rpc.getChainId());
          if (freshChainId && isKnownChainId(freshChainId)) {
            try {
              const accountStats = await getAccountStatsFromTzkt(address, freshChainId);

              switch (accountStats.type) {
                case TzktAccountType.Empty:
                  return null;
                case TzktAccountType.User:
                case TzktAccountType.Contract:
                  return accountStats.delegate?.address ?? null;
              }
            } catch (e) {
              console.error(e);
            }
          }

          return await tezos.rpc.getDelegate(address);
        },
        { retries: 3, minTimeout: 3000, maxTimeout: 5000 }
      );
    } catch (e) {
      if (shouldPreventErrorPropagation) {
        return null;
      }

      throw new BoundaryError(
        getOnlineStatus() ? t('errorGettingBakerAddressMessageOnline') : t('errorGettingBakerAddressMessage'),
        resetDelegateCache
      );
    }
  }, [chainId, rpcBaseURL, address, shouldPreventErrorPropagation, resetDelegateCache]);

  return useSWR(getDelegateCacheKey(rpcBaseURL, address, chainId, shouldPreventErrorPropagation), getDelegate, {
    dedupingInterval: 20_000,
    suspense
  });
}

export type Baker = BakingBadBaker & {
  logo?: string;
};

export function useKnownBaker(address: string | null, chainId: string, suspense = true) {
  const isMainnet = chainId === ChainIds.MAINNET;

  const fetchBaker = useCallback(async (): Promise<Baker | null> => {
    if (!address) return null;
    try {
      const bakingBadBaker = await bakingBadGetBaker({ address });

      if (bakingBadBaker) {
        return {
          ...bakingBadBaker,
          logo: `https://services.tzkt.io/v1/avatars/${bakingBadBaker.address}`
        };
      }

      return null;
    } catch (_err) {
      return null;
    }
  }, [address]);

  return useRetryableSWR(isMainnet && address ? ['baker', address] : null, fetchBaker, {
    refreshInterval: 120_000,
    dedupingInterval: 60_000,
    suspense
  });
}

export function useKnownBakers(chainId: string, suspense = true) {
  const isMainnet = chainId === ChainIds.MAINNET;

  const { data: bakers } = useRetryableSWR(isMainnet ? 'all-bakers' : null, getAllBakersBakingBad, {
    refreshInterval: 120_000,
    dedupingInterval: 60_000,
    suspense
  });

  return useMemo(() => (bakers && bakers.length > 1 ? bakers : null), [bakers]);
}

type RewardsStatsCalculationParams = {
  rewardsEntry: TzktRewardsEntry;
  bakerDetails: Baker | null | undefined;
  currentCycle: number | undefined;
} & Record<
  | 'fallbackRewardPerOwnBlock'
  | 'fallbackRewardPerEndorsement'
  | 'fallbackRewardPerFutureBlock'
  | 'fallbackRewardPerFutureEndorsement',
  BigNumber
>;

function getBakingEfficiency({ rewardsEntry }: RewardsStatsCalculationParams) {
  const {
    ownBlockRewards,
    extraBlockRewards,
    futureBlockRewards,
    endorsementRewards,
    futureEndorsementRewards,
    ownBlocks,
    futureBlocks,
    futureEndorsements,
    endorsements,
    ownBlockFees,
    extraBlockFees,
    revelationRewards,
    doubleBakingRewards,
    doubleEndorsingRewards,
    missedEndorsementRewards,
    missedExtraBlockRewards,
    missedExtraBlockFees,
    missedOwnBlockFees,
    missedOwnBlockRewards
  } = rewardsEntry;
  const totalFutureRewards = new BigNumber(futureEndorsementRewards).plus(futureBlockRewards);
  const totalCurrentRewards = new BigNumber(extraBlockRewards)
    .plus(ownBlockRewards)
    .plus(endorsementRewards)
    .plus(doubleEndorsingRewards)
    .plus(ownBlockFees)
    .plus(extraBlockFees)
    .plus(revelationRewards)
    .plus(doubleBakingRewards);
  const totalRewards = totalFutureRewards.plus(totalCurrentRewards);

  const fullEfficiencyIncome = new BigNumber(4e7)
    .multipliedBy(new BigNumber(ownBlocks).plus(futureBlocks))
    .plus(new BigNumber(1.25e6).multipliedBy(new BigNumber(endorsements).plus(futureEndorsements)));
  const totalLost = new BigNumber(missedEndorsementRewards)
    .plus(missedExtraBlockFees)
    .plus(missedExtraBlockRewards)
    .plus(missedOwnBlockFees)
    .plus(missedOwnBlockRewards);
  const totalGain = totalRewards.minus(totalLost).minus(fullEfficiencyIncome);
  return new BigNumber(1).plus(totalGain.div(fullEfficiencyIncome));
}

type CycleStatus = 'unlocked' | 'locked' | 'future' | 'inProgress';

export function getRewardsStats(params: RewardsStatsCalculationParams) {
  const { rewardsEntry, bakerDetails, currentCycle } = params;
  const {
    cycle,
    balance,
    ownBlockRewards,
    extraBlockRewards,
    futureBlockRewards,
    endorsementRewards,
    futureEndorsementRewards,
    stakingBalance,
    expectedBlocks,
    expectedEndorsements,
    ownBlockFees,
    extraBlockFees,
    revelationRewards,
    doubleBakingRewards,
    doubleEndorsingRewards
  } = rewardsEntry;

  const totalFutureRewards = new BigNumber(futureEndorsementRewards).plus(futureBlockRewards);
  const totalCurrentRewards = new BigNumber(extraBlockRewards)
    .plus(endorsementRewards)
    .plus(ownBlockRewards)
    .plus(ownBlockFees)
    .plus(extraBlockFees)
    .plus(revelationRewards)
    .plus(doubleBakingRewards)
    .plus(doubleEndorsingRewards);
  const cycleStatus: CycleStatus = (() => {
    switch (true) {
      case totalFutureRewards.eq(0) && (currentCycle === undefined || cycle <= currentCycle - 6):
        return 'unlocked';
      case totalFutureRewards.eq(0):
        return 'locked';
      case totalCurrentRewards.eq(0):
        return 'future';
      default:
        return 'inProgress';
    }
  })();
  const totalRewards = totalFutureRewards.plus(totalCurrentRewards);
  const rewards = totalRewards.multipliedBy(balance).div(stakingBalance);
  let luck = expectedBlocks + expectedEndorsements > 0 ? new BigNumber(-1) : new BigNumber(0);
  if (totalFutureRewards.plus(totalCurrentRewards).gt(0)) {
    luck = calculateLuck(params, totalRewards);
  }
  const bakerFeePart = bakerDetails?.delegation.fee ?? 0;
  const bakerFee = rewards.multipliedBy(bakerFeePart);
  return {
    balance,
    rewards,
    luck,
    bakerFeePart,
    bakerFee,
    cycleStatus,
    efficiency: getBakingEfficiency(params)
  };
}

const calculateLuck = (params: RewardsStatsCalculationParams, totalRewards: BigNumber) => {
  const {
    rewardsEntry,
    fallbackRewardPerOwnBlock,
    fallbackRewardPerEndorsement,
    fallbackRewardPerFutureBlock,
    fallbackRewardPerFutureEndorsement
  } = params;
  const {
    ownBlockRewards,
    futureBlockRewards,
    endorsementRewards,
    futureEndorsementRewards,
    expectedBlocks,
    expectedEndorsements,
    ownBlocks,
    futureBlocks,
    futureEndorsements,
    endorsements
  } = rewardsEntry;
  const rewardPerOwnBlock = ownBlocks === 0 ? fallbackRewardPerOwnBlock : new BigNumber(ownBlockRewards).div(ownBlocks);
  const rewardPerEndorsement =
    endorsements === 0 ? fallbackRewardPerEndorsement : new BigNumber(endorsementRewards).div(endorsements);
  const asIfNoFutureExpectedBlockRewards = new BigNumber(expectedBlocks).multipliedBy(rewardPerOwnBlock);
  const asIfNoFutureExpectedEndorsementRewards = new BigNumber(expectedEndorsements).multipliedBy(rewardPerEndorsement);
  const asIfNoFutureExpectedRewards = asIfNoFutureExpectedBlockRewards.plus(asIfNoFutureExpectedEndorsementRewards);

  const rewardPerFutureBlock =
    futureBlocks === 0 ? fallbackRewardPerFutureBlock : new BigNumber(futureBlockRewards).div(futureBlocks);
  const rewardPerFutureEndorsement =
    futureEndorsements === 0
      ? fallbackRewardPerFutureEndorsement
      : new BigNumber(futureEndorsementRewards).div(futureEndorsements);
  const asIfNoCurrentExpectedBlockRewards = new BigNumber(expectedBlocks).multipliedBy(rewardPerFutureBlock);
  const asIfNoCurrentExpectedEndorsementRewards = new BigNumber(expectedEndorsements).multipliedBy(
    rewardPerFutureEndorsement
  );
  const asIfNoCurrentExpectedRewards = asIfNoCurrentExpectedBlockRewards.plus(asIfNoCurrentExpectedEndorsementRewards);

  const weights =
    endorsements + futureEndorsements === 0
      ? { current: ownBlocks, future: futureBlocks }
      : { current: endorsements, future: futureEndorsements };
  const totalExpectedRewards =
    weights.current + weights.future === 0
      ? new BigNumber(0)
      : asIfNoFutureExpectedRewards
          .multipliedBy(weights.current)
          .plus(asIfNoCurrentExpectedRewards.multipliedBy(weights.future))
          .div(new BigNumber(weights.current).plus(weights.future));

  return totalRewards.minus(totalExpectedRewards).div(totalExpectedRewards);
};
