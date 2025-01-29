import type { ReactNode } from 'react';

import { TempleChainKind } from 'temple/types';

export const toExploreAssetLink = (
  isCollectible: boolean,
  chainKind: TempleChainKind,
  chainId: number | string,
  assetSlug: string
) => `/${isCollectible ? 'collectible' : 'token'}/${chainKind}/${chainId}/${assetSlug}`;

export const getTokensViewWithPromo = (tokensJsx: ReactNode[], promoJsx: ReactNode, slugsCount = tokensJsx.length) => {
  if (!promoJsx) return tokensJsx;

  if (slugsCount < 5) {
    tokensJsx.push(promoJsx);
  } else {
    tokensJsx.splice(2, 0, promoJsx);
  }

  return tokensJsx;
};
