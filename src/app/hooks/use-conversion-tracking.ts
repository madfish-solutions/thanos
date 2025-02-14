import { useEffect } from 'react';

import { dispatch } from 'app/store';
import { setConversionTrackedAction } from 'app/store/settings/actions';
import { useIsConversionTrackedSelector } from 'app/store/settings/selectors';
import { AnalyticsEventCategory, useAnalytics } from 'lib/analytics';

export const useConversionTracking = () => {
  const { trackEvent } = useAnalytics();

  const isConversionTracked = useIsConversionTrackedSelector();

  useEffect(() => {
    if (isConversionTracked) {
      return undefined;
    }

    const conversionIframeListener = (event: MessageEvent<any>) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (data.type !== 'trackLink') {
          return;
        }

        dispatch(setConversionTrackedAction());
        window.removeEventListener('message', conversionIframeListener);

        if (data.link) {
          const { linkId, name } = data.link;

          trackEvent('Conversion Info', AnalyticsEventCategory.General, {
            conversionId: linkId,
            conversionName: name
          });
        }
      } catch {}
    };

    window.addEventListener('message', conversionIframeListener);

    return () => window.removeEventListener('message', conversionIframeListener);
  }, [isConversionTracked, trackEvent]);
};
