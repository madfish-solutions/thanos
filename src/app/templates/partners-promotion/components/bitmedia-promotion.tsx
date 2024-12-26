import React, { FC, useEffect, useMemo, useRef, useState } from 'react';

import { AdsProviderTitle } from 'lib/ads';
import { EnvVars } from 'lib/env';

import { SingleProviderPromotionProps } from '../types';

import { ImagePromotionView } from './image-promotion-view';

enum AdFrameMessageType {
  Resize = 'resize',
  Ready = 'ready',
  Click = 'click',
  Error = 'error'
}

interface AdFrameMessageBase {
  type: AdFrameMessageType;
}

interface ImageCreativeSet {
  image: {
    url: string;
    height: number;
    width: number;
  };
}

interface ReadyAdMessage extends AdFrameMessageBase {
  type: AdFrameMessageType.Ready;
  ad: { cta_url: string; creative_set?: ImageCreativeSet };
}

interface ErrorAdMessage extends AdFrameMessageBase {
  type: AdFrameMessageType.Error;
  reason?: string;
}

type AdFrameMessage = ReadyAdMessage | ErrorAdMessage;

export const BitmediaPromotion: FC<Omit<SingleProviderPromotionProps, 'variant'>> = ({
  isVisible,
  pageName,
  onAdRectSeen,
  onClose,
  onReady,
  onError
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [adHref, setAdHref] = useState<string>('');
  const [backgroundAssetUrl, setBackgroundAssetUrl] = useState<string | undefined>();

  const source = useMemo(() => getAdsTwUrl('Bitmedia', EnvVars.BITMEDIA_SMALL_PLACEMENT_SLUG, 320, 50), []);

  const handleIframeMessages = (e: MessageEvent<any>) => {
    if (e.source !== iframeRef.current?.contentWindow) return;

    const message: AdFrameMessage = JSON.parse(e.data);

    switch (message.type) {
      case AdFrameMessageType.Ready:
        if (!message.ad) break;
        const { cta_url: ctaUrl, creative_set: creativeSet } = message.ad;
        setAdHref(ctaUrl);
        if (creativeSet) setBackgroundAssetUrl(creativeSet.image.url);
        onReady();
        break;
      case AdFrameMessageType.Error:
        onError();
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleIframeMessages);

    return () => window.removeEventListener('message', handleIframeMessages);
  }, []);

  return (
    <ImagePromotionView
      onClose={onClose}
      isVisible={isVisible}
      href={adHref}
      providerTitle={AdsProviderTitle.Bitmedia}
      pageName={pageName}
      onAdRectSeen={onAdRectSeen}
      backgroundAssetType="image"
      backgroundAssetUrl={backgroundAssetUrl}
    >
      <iframe ref={iframeRef} title="bitmedia-ad" style={{ width: 320, height: 50 }} src={source} />
    </ImagePromotionView>
  );
};

const getAdsTwUrl = (providerName: string, slug: string, width: number, height: number) => {
  const url = new URL(EnvVars.HYPELAB_ADS_WINDOW_URL);
  url.searchParams.set('ap', providerName.toLowerCase());
  url.searchParams.set('w', String(width));
  url.searchParams.set('h', String(height));
  url.searchParams.set('p', slug);

  return url.toString();
};
