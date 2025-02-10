import React, { memo, useMemo } from 'react';

import { DeadEndBoundaryError } from 'app/ErrorBoundary';
import { TezosActivity } from 'lib/activity';
import { parseTezosOperationsGroup } from 'lib/activity/tezos';
import fetchTezosOperationsGroups from 'lib/activity/tezos/fetch';
import { isKnownChainId } from 'lib/apis/tzkt/api';
import { useAccountAddressForTezos, useTezosChainByChainId } from 'temple/front';
import { TempleChainKind } from 'temple/types';

import { TezosActivityComponent } from './ActivityItem';
import { ActivityListView } from './ActivityListView';
import { ActivitiesDateGroup, useGroupingByDate } from './grouping-by-date';
import { RETRY_AFTER_ERROR_TIMEOUT, useActivitiesLoadingLogic } from './loading-logic';
import { useAssetsFromActivitiesCheck } from './use-assets-from-activites-check';
import { FilterKind, getActivityFilterKind } from './utils';

interface Props {
  tezosChainId: string;
  assetSlug?: string;
  filterKind?: FilterKind;
}

export const TezosActivityList = memo<Props>(({ tezosChainId, assetSlug, filterKind }) => {
  const network = useTezosChainByChainId(tezosChainId);
  const accountAddress = useAccountAddressForTezos();

  if (!network || !accountAddress) throw new DeadEndBoundaryError();

  const { chainId, rpcBaseURL } = network;

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
  } = useActivitiesLoadingLogic<TezosActivity>(
    async (initial, signal) => {
      if (!isKnownChainId(chainId)) {
        setIsLoading(false);
        setReachedTheEnd(true);
        return;
      }

      setIsLoading(true);

      const currActivities = initial ? [] : activities;

      const olderThan = currActivities.at(-1);

      try {
        const groups = await fetchTezosOperationsGroups(chainId, rpcBaseURL, accountAddress, assetSlug, olderThan);

        if (signal.aborted) return;

        const newActivities = groups.map(group => parseTezosOperationsGroup(group, chainId, accountAddress));

        setActivities(currActivities.concat(newActivities));
        if (newActivities.length === 0) setReachedTheEnd(true);
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
    [chainId, accountAddress, assetSlug],
    undefined,
    isKnownChainId(chainId)
  );

  const displayActivities = useMemo(
    () => (filterKind ? activities.filter(act => getActivityFilterKind(act) === filterKind) : activities),
    [activities, filterKind]
  );

  const groupedActivities = useGroupingByDate(displayActivities);

  const tezosAssetsCheckConfig = useMemo(
    () => ({
      activities: displayActivities,
      tezAccountPkh: accountAddress,
      mainAsset: assetSlug ? { chainKind: TempleChainKind.Tezos, chainId, slug: assetSlug } : undefined
    }),
    [accountAddress, assetSlug, chainId, displayActivities]
  );
  useAssetsFromActivitiesCheck(tezosAssetsCheckConfig);

  const contentJsx = useMemo(
    () =>
      groupedActivities.map(([dateStr, activities]) => (
        <ActivitiesDateGroup key={dateStr} title={dateStr}>
          {activities.map(activity => (
            <TezosActivityComponent key={activity.hash} activity={activity} chain={network} assetSlug={assetSlug} />
          ))}
        </ActivitiesDateGroup>
      )),
    [groupedActivities, network, assetSlug]
  );

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
});
