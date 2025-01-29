import { useEffect } from 'react';

import { fromAssetSlug } from 'lib/assets';

import { useAnalytics } from './use-analytics.hook';

const pageRoutesWithToken = ['/send', '/token', '/collectible'];
const pageRoutesWithQueryParams = ['/swap'];

export const usePageRouterAnalytics = (pathname: string, search: string, isContextReady: boolean) => {
  const { pageEvent } = useAnalytics();

  useEffect(() => {
    if (pathname === '/' && !isContextReady) {
      return void pageEvent('/welcome', search);
    }

    if (pageRoutesWithToken.some(route => pathname.startsWith(route))) {
      const [, route = '', chainId = '', tokenSlug = 'tez'] = pathname.split('/');
      const [tokenAddress, tokenId] = fromAssetSlug(tokenSlug);

      return void pageEvent(`/${route}`, search, {
        chainId,
        tokenAddress,
        tokenId
      });
    }

    if (pageRoutesWithQueryParams.some(route => pathname.startsWith(route))) {
      const usp = new URLSearchParams(search);

      const inputAssetSlug = usp.get('from') || 'tez';
      const outputAssetSlug = usp.get('to');

      return void pageEvent(pathname, search, { inputAssetSlug, outputAssetSlug });
    }

    return void pageEvent(pathname, search);
  }, [pathname, search, isContextReady, pageEvent]);
};
