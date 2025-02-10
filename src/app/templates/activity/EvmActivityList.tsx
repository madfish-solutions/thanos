import React, { FC, useMemo } from 'react';

import { DeadEndBoundaryError } from 'app/ErrorBoundary';
import { EvmActivity } from 'lib/activity';
import { getEvmActivities } from 'lib/activity/evm/fetch';
import { useAccountAddressForEvm } from 'temple/front';
import { useEvmChainByChainId } from 'temple/front/chains';
import { TempleChainKind } from 'temple/types';

import { EvmActivityComponent } from './ActivityItem';
import { ActivityListView } from './ActivityListView';
import { ActivitiesDateGroup, useGroupingByDate } from './grouping-by-date';
import { RETRY_AFTER_ERROR_TIMEOUT, useActivitiesLoadingLogic } from './loading-logic';
import { useAssetsFromActivitiesCheck } from './use-assets-from-activites-check';
import { FilterKind, getActivityFilterKind } from './utils';

interface Props {
  chainId: number;
  assetSlug?: string;
  filterKind?: FilterKind;
}

export const EvmActivityList: FC<Props> = ({ chainId, assetSlug, filterKind }) => {
  const network = useEvmChainByChainId(chainId);
  const accountAddress = useAccountAddressForEvm();

  if (!network || !accountAddress) throw new DeadEndBoundaryError();

  const {
    activities,
    isLoading,
    reachedTheEnd,
    error,
    setActivities,
    setIsLoading,
    setReachedTheEnd,
    setError,
    loadNext
  } = useActivitiesLoadingLogic<EvmActivity>(
    async (initial, signal) => {
      setIsLoading(true);

      const currActivities = initial ? [] : activities;

      const olderThanBlockHeight = currActivities.at(-1)?.blockHeight;

      try {
        const newActivities = await getEvmActivities(chainId, accountAddress, assetSlug, olderThanBlockHeight, signal);

        if (signal.aborted) return;

        if (newActivities.length) setActivities(currActivities.concat(newActivities));
        else setReachedTheEnd(true);
      } catch (error) {
        if (signal.aborted) return;

        console.error(error);

        setError(error);

        setTimeout(() => {
          if (!signal.aborted) setError(null);
        }, RETRY_AFTER_ERROR_TIMEOUT);
      }

      setIsLoading(false);
    },
    [chainId, accountAddress, assetSlug]
  );

  const displayActivities = useMemo(
    () => (filterKind ? activities.filter(a => getActivityFilterKind(a) === filterKind) : activities),
    [activities, filterKind]
  );

  const groupedActivities = useGroupingByDate(displayActivities);

  const contentJsx = useMemo(
    () =>
      groupedActivities.map(([dateStr, activities]) => (
        <ActivitiesDateGroup key={dateStr} title={dateStr}>
          {activities.map(activity => (
            <EvmActivityComponent key={activity.hash} activity={activity} chain={network} assetSlug={assetSlug} />
          ))}
        </ActivitiesDateGroup>
      )),
    [groupedActivities, network, assetSlug]
  );

  const evmAssetsCheckConfig = useMemo(
    () => ({
      activities: displayActivities,
      evmAccountPkh: accountAddress,
      mainAsset: assetSlug ? { chainKind: TempleChainKind.EVM, chainId, slug: assetSlug } : undefined
    }),
    [accountAddress, assetSlug, chainId, displayActivities]
  );
  useAssetsFromActivitiesCheck(evmAssetsCheckConfig);

  return (
    <ActivityListView
      activitiesNumber={displayActivities.length}
      isSyncing={isLoading}
      reachedTheEnd={reachedTheEnd || Boolean(error)}
      loadNext={loadNext}
    >
      {contentJsx}
    </ActivityListView>
  );
};
