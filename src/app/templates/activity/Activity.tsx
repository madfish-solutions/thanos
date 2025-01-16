import React, { useMemo } from 'react';

import clsx from 'clsx';
import InfiniteScroll from 'react-infinite-scroll-component';

import { SyncSpinner } from 'app/atoms';
import { useAppEnv } from 'app/env';
import { ReactComponent as LayersIcon } from 'app/icons/layers.svg';
import { useShouldShowPartnersPromoSelector } from 'app/store/partners-promotion/selectors';
import { PartnersPromotion, PartnersPromotionVariant } from 'app/templates/partners-promotion';
import { TEMPLE_TOKEN_SLUG } from 'lib/assets';
import { EnvVars } from 'lib/env';
import { T } from 'lib/i18n/react';
import useActivities from 'lib/temple/activity-new/hook';
import { useAccount } from 'lib/temple/front';

import { ActivityItem } from './ActivityItem';
import { ReactivateAdsBanner } from './ReactivateAdsBanner';

const INITIAL_NUMBER = 30;
const LOAD_STEP = 30;

interface Props {
  assetSlug?: string;
}

export const ActivityComponent: React.FC<Props> = ({ assetSlug }) => {
  const { loading, reachedTheEnd, list: activities, loadMore } = useActivities(INITIAL_NUMBER, assetSlug);

  const { popup } = useAppEnv();

  const { publicKeyHash: accountAddress } = useAccount();

  const shouldShowPartnersPromo = useShouldShowPartnersPromoSelector();

  const promotion = useMemo(() => {
    if (shouldShowPartnersPromo)
      return (
        <PartnersPromotion
          id={`promo-activity-${assetSlug ?? 'all'}`}
          variant={PartnersPromotionVariant.Image}
          pageName="Activity"
          withPersonaProvider={EnvVars.PERSONA_ADS_ENABLED}
        />
      );

    return assetSlug === TEMPLE_TOKEN_SLUG ? <ReactivateAdsBanner /> : null;
  }, [shouldShowPartnersPromo, assetSlug]);

  if (activities.length === 0 && !loading && reachedTheEnd) {
    return (
      <div
        className={clsx('w-full max-w-sm mx-auto flex flex-col items-center pt-3 pb-12 text-gray-500', popup && 'px-4')}
      >
        {promotion}

        <LayersIcon className="self-center mt-6 w-16 h-auto stroke-current" />

        <h3 className="mt-2 text-sm font-light text-center">
          <T id="noOperationsFound" />
        </h3>
      </div>
    );
  }

  const retryInitialLoad = () => loadMore(INITIAL_NUMBER);
  const loadMoreActivities = () => loadMore(LOAD_STEP);

  const loadNext = activities.length === 0 ? retryInitialLoad : loadMoreActivities;

  const onScroll = loading || reachedTheEnd ? undefined : buildOnScroll(loadNext);

  return (
    <div className={clsx('w-full max-w-sm mx-auto flex flex-col gap-y-4 py-3', popup && 'px-4')}>
      {promotion}

      <InfiniteScroll
        dataLength={activities.length}
        hasMore={reachedTheEnd === false}
        next={loadNext}
        loader={loading && <SyncSpinner className="mt-4" />}
        onScroll={onScroll}
      >
        {activities.map(activity => (
          <ActivityItem key={activity.hash} address={accountAddress} activity={activity} />
        ))}
      </InfiniteScroll>
    </div>
  );
};

/**
 * Build onscroll listener to trigger next loading, when fetching data resulted in error.
 * `InfiniteScroll.props.next` won't be triggered in this case.
 */
const buildOnScroll =
  (next: EmptyFn) =>
  ({ target }: { target: EventTarget | null }) => {
    const elem: HTMLElement =
      target instanceof Document ? (target.scrollingElement! as HTMLElement) : (target as HTMLElement);
    const atBottom = 0 === elem.offsetHeight - elem.clientHeight - elem.scrollTop;
    if (atBottom) next();
  };
