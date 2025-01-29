import React, { memo, useCallback, useMemo } from 'react';

import clsx from 'clsx';

import { Button } from 'app/atoms/Button';
import { HomeSelectors } from 'app/pages/Home/selectors';
import { AnalyticsEventCategory, useAnalytics } from 'lib/analytics';
import { T } from 'lib/i18n';
import { useDelegate } from 'lib/temple/front';
import { navigate } from 'lib/woozie';
import { TezosNetworkEssentials } from 'temple/networks';

import { AssetsSelectors } from '../../../Assets.selectors';
import modStyles from '../../Tokens.module.css';

interface Props {
  network: TezosNetworkEssentials;
  pkh: string;
}

export const DelegateTezosTag = memo<Props>(({ network, pkh }) => {
  const { data: myBakerPkh } = useDelegate(pkh, network, false);
  const { trackEvent } = useAnalytics();

  const handleTagClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      trackEvent(HomeSelectors.delegateButton, AnalyticsEventCategory.ButtonPress);
      navigate({
        pathname: `/earn-tez/${network.chainId}`
      });
    },
    [network.chainId, trackEvent]
  );

  return useMemo(
    () =>
      myBakerPkh ? (
        <Button
          onClick={handleTagClick}
          className={clsx(COMMON_CLASS_NAMES, 'inline-flex items-center')}
          testID={AssetsSelectors.assetItemApyButton}
        >
          APY: 5.6%
        </Button>
      ) : (
        <Button
          onClick={handleTagClick}
          className={clsx(COMMON_CLASS_NAMES, 'uppercase')}
          testID={AssetsSelectors.assetItemDelegateButton}
        >
          <T id="notDelegated" />
        </Button>
      ),
    [handleTagClick, myBakerPkh]
  );
});

const COMMON_CLASS_NAMES = clsx('flex-shrink-0 px-1.5 py-1 bg-secondary hover:bg-secondary-hover', modStyles.tagBase);
