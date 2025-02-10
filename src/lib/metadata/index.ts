import { useCallback, useEffect, useRef } from 'react';

import { dispatch } from 'app/store';
import {
  useEvmCollectibleMetadataSelector,
  useEvmChainCollectiblesMetadataRecordSelector,
  useEvmCollectiblesMetadataRecordSelector
} from 'app/store/evm/collectibles-metadata/selectors';
import { loadNoCategoryEvmAssetsMetadataActions } from 'app/store/evm/no-category-assets-metadata/actions';
import {
  useEvmNoCategoryAssetMetadataSelector,
  useEvmNoCategoryAssetsMetadataRecordSelector
} from 'app/store/evm/no-category-assets-metadata/selectors';
import {
  useEvmTokenMetadataSelector,
  useEvmChainTokensMetadataRecordSelector,
  useEvmTokensMetadataRecordSelector
} from 'app/store/evm/tokens-metadata/selectors';
import { loadCollectiblesMetadataAction } from 'app/store/tezos/collectibles-metadata/actions';
import {
  useAllCollectiblesMetadataSelector,
  useCollectibleMetadataSelector,
  useCollectiblesMetadataLoadingSelector
} from 'app/store/tezos/collectibles-metadata/selectors';
import { loadNoCategoryTezosAssetsMetadataAction } from 'app/store/tezos/no-category-assets-metadata/actions';
import {
  useAllNoCategoryTezosAssetsMetadataSelector,
  useNoCategoryTezosAssetMetadataSelector,
  useNoCategoryTezosAssetsMetadataLoadingSelector
} from 'app/store/tezos/no-category-assets-metadata/selectors';
import { loadTokensMetadataAction } from 'app/store/tezos/tokens-metadata/actions';
import {
  useTokenMetadataSelector,
  useTokensMetadataLoadingSelector,
  useAllTokensMetadataSelector
} from 'app/store/tezos/tokens-metadata/selectors';
import { METADATA_API_LOAD_CHUNK_SIZE } from 'lib/apis/temple';
import { isTezAsset } from 'lib/assets';
import { EVM_TOKEN_SLUG } from 'lib/assets/defaults';
import { parseChainAssetSlug } from 'lib/assets/utils';
import { isTruthy } from 'lib/utils';
import { isEvmNativeTokenSlug } from 'lib/utils/evm.utils';
import { useAllEvmChains, useAllTezosChains } from 'temple/front';
import { EvmChain, TezosChain, useEvmChainByChainId } from 'temple/front/chains';
import { isTezosDcpChainId } from 'temple/networks';
import { TempleChainKind } from 'temple/types';

import { TEZOS_METADATA, FILM_METADATA } from './defaults';
import {
  AssetMetadataBase,
  EvmAssetMetadata,
  EvmCollectibleMetadata,
  EvmNativeTokenMetadata,
  EvmTokenMetadata,
  TokenMetadata
} from './types';

export type { AssetMetadataBase, TokenMetadata } from './types';
export { isCollectible, isTezosCollectibleMetadata, getAssetSymbol, getTokenName } from './utils';

export { TEZOS_METADATA };

export const getTezosGasMetadata = (chainId: string) => (isTezosDcpChainId(chainId) ? FILM_METADATA : TEZOS_METADATA);

export const useEvmGasMetadata = (chainId: number) => useEvmTokenMetadataSelector(chainId, EVM_TOKEN_SLUG);

export const useCategorizedTezosAssetMetadata = (slug: string, tezosChainId: string): AssetMetadataBase | undefined => {
  const tokenMetadata = useTokenMetadataSelector(slug);
  const collectibleMetadata = useCollectibleMetadataSelector(slug);

  return isTezAsset(slug) ? getTezosGasMetadata(tezosChainId) : tokenMetadata || collectibleMetadata;
};

export const useGenericTezosAssetMetadata = (slug: string, tezosChainId: string): AssetMetadataBase | undefined => {
  const categorizedMetadata = useCategorizedTezosAssetMetadata(slug, tezosChainId);
  const noCategoryMetadata = useNoCategoryTezosAssetMetadataSelector(slug);

  return categorizedMetadata || noCategoryMetadata;
};

export const useEvmCategorizedAssetMetadata = (slug: string, evmChainId: number): EvmAssetMetadata | undefined => {
  const network = useEvmChainByChainId(evmChainId);
  const tokenMetadata = useEvmTokenMetadataSelector(evmChainId, slug);
  const collectibleMetadata = useEvmCollectibleMetadataSelector(evmChainId, slug);

  return isEvmNativeTokenSlug(slug) ? network?.currency : tokenMetadata || collectibleMetadata;
};

export const useEvmGenericAssetMetadata = (slug: string, evmChainId: number): EvmAssetMetadata | undefined => {
  const categorizedAssetMetadata = useEvmCategorizedAssetMetadata(slug, evmChainId);
  const noCategoryAssetMetadata = useEvmNoCategoryAssetMetadataSelector(evmChainId, slug);

  return categorizedAssetMetadata || noCategoryAssetMetadata;
};

export const useGetEvmChainAssetMetadata = (chainId: number) => {
  const network = useEvmChainByChainId(chainId);
  const tokensMetadatas = useEvmChainTokensMetadataRecordSelector(chainId);
  const collectiblesMetadatas = useEvmChainCollectiblesMetadataRecordSelector(chainId);

  return useCallback<EvmAssetMetadataGetter>(
    (slug: string) => {
      if (isEvmNativeTokenSlug(slug)) return network?.currency;

      return tokensMetadatas?.[slug] || collectiblesMetadatas?.[slug];
    },
    [tokensMetadatas, collectiblesMetadatas, network]
  );
};

const useGetEvmGenericAssetMetadata = () => {
  const allEvmChains = useAllEvmChains();
  const tokensMetadatas = useEvmTokensMetadataRecordSelector();
  const collectiblesMetadatas = useEvmCollectiblesMetadataRecordSelector();
  const noCategoryMetadatas = useEvmNoCategoryAssetsMetadataRecordSelector();

  return useCallback(
    (slug: string, chainId: number): EvmAssetMetadata | undefined => {
      if (isEvmNativeTokenSlug(slug)) return allEvmChains[chainId]?.currency;

      return (
        tokensMetadatas[chainId]?.[slug] ||
        collectiblesMetadatas[chainId]?.[slug] ||
        noCategoryMetadatas[chainId]?.[slug]
      );
    },
    [allEvmChains, tokensMetadatas, collectiblesMetadatas, noCategoryMetadatas]
  );
};

type EvmAssetMetadataGetter = (
  slug: string
) => EvmNativeTokenMetadata | EvmTokenMetadata | EvmCollectibleMetadata | undefined;

type TokenMetadataGetter = (slug: string) => TokenMetadata | undefined;

export const useGetTokenMetadata = () => {
  const allMeta = useAllTokensMetadataSelector();

  return useCallback<TokenMetadataGetter>(slug => allMeta[slug], [allMeta]);
};

export const useGetChainTokenOrGasMetadata = (tezosChainId: string) => {
  const getTokenMetadata = useGetTokenMetadata();

  return useCallback(
    (slug: string): AssetMetadataBase | undefined =>
      isTezAsset(slug) ? getTezosGasMetadata(tezosChainId) : getTokenMetadata(slug),
    [getTokenMetadata, tezosChainId]
  );
};

export const useGetTokenOrGasMetadata = () => {
  const getTokenMetadata = useGetTokenMetadata();

  return useCallback(
    (chainId: string, slug: string): AssetMetadataBase | undefined =>
      isTezAsset(slug) ? getTezosGasMetadata(chainId) : getTokenMetadata(slug),
    [getTokenMetadata]
  );
};

export const useGetCollectibleMetadata = () => {
  const allMeta = useAllCollectiblesMetadataSelector();

  return useCallback<TokenMetadataGetter>(slug => allMeta.get(slug), [allMeta]);
};

export const useGetNoCategoryAssetMetadata = () => {
  const allMeta = useAllNoCategoryTezosAssetsMetadataSelector();

  return useCallback<TokenMetadataGetter>(slug => allMeta[slug], [allMeta]);
};

export const useGetCategorizedAssetMetadata = (tezosChainId: string) => {
  const getTokenOrGasMetadata = useGetChainTokenOrGasMetadata(tezosChainId);
  const getCollectibleMetadata = useGetCollectibleMetadata();

  return useCallback(
    (slug: string) => getTokenOrGasMetadata(slug) || getCollectibleMetadata(slug),
    [getTokenOrGasMetadata, getCollectibleMetadata]
  );
};

/**
 * @param slugsToCheck // Memoize
 */
export const useTezosTokensMetadataPresenceCheck = (rpcBaseURL: string, slugsToCheck?: string[]) => {
  const metadataLoading = useTokensMetadataLoadingSelector();
  const getMetadata = useGetTokenMetadata();

  useTezosChainAssetsMetadataPresenceCheck(rpcBaseURL, false, metadataLoading, getMetadata, slugsToCheck);
};

/**
 * @param slugsToCheck // Memoize
 */
export const useTezosChainCollectiblesMetadataPresenceCheck = (rpcBaseURL: string, slugsToCheck?: string[]) => {
  const metadataLoading = useCollectiblesMetadataLoadingSelector();
  const getMetadata = useGetCollectibleMetadata();

  useTezosChainAssetsMetadataPresenceCheck(rpcBaseURL, true, metadataLoading, getMetadata, slugsToCheck);
};

export const useTezosCollectiblesMetadataPresenceCheck = (chainSlugsToCheck?: string[]) => {
  const metadataLoading = useCollectiblesMetadataLoadingSelector();
  const getMetadata = useGetCollectibleMetadata();

  useTezosAssetsMetadataPresenceCheck(true, metadataLoading, getMetadata, chainSlugsToCheck);
};

export const useTezosGenericAssetsMetadataCheck = (
  chainSlugsToCheck: string[] | undefined,
  associatedAccountPkh: string | undefined
) => {
  const tokensMetadataLoading = useTokensMetadataLoadingSelector();
  const collectiblesMetadataLoading = useCollectiblesMetadataLoadingSelector();
  const noCategoryAssetsMetadataLoading = useNoCategoryTezosAssetsMetadataLoadingSelector();
  const getCollectibleMetadata = useGetCollectibleMetadata();
  const getTokenMetadata = useGetTokenMetadata();
  const getNoCategoryAssetMetadata = useGetNoCategoryAssetMetadata();

  const getAssetMetadata = useCallback<TokenMetadataGetter>(
    slug => getCollectibleMetadata(slug) || getTokenMetadata(slug) || getNoCategoryAssetMetadata(slug),
    [getCollectibleMetadata, getNoCategoryAssetMetadata, getTokenMetadata]
  );

  useTezosAssetsMetadataPresenceCheck(
    undefined,
    tokensMetadataLoading || collectiblesMetadataLoading || noCategoryAssetsMetadataLoading,
    getAssetMetadata,
    chainSlugsToCheck,
    associatedAccountPkh
  );
};

const useTezosChainAssetsMetadataPresenceCheck = (
  rpcBaseURL: string,
  ofCollectibles: boolean,
  metadataLoading: boolean,
  getMetadata: TokenMetadataGetter,
  slugsToCheck?: string[]
) => {
  const checkedRef = useRef<string[]>([]);

  useEffect(() => {
    if (metadataLoading || !slugsToCheck?.length) return;

    const missingChunk = slugsToCheck
      .filter(
        slug =>
          !isTezAsset(slug) &&
          !isTruthy(getMetadata(slug)) &&
          // In case fetched metadata is `null` & won't save
          !checkedRef.current.includes(slug)
      )
      .slice(0, METADATA_API_LOAD_CHUNK_SIZE);

    if (missingChunk.length > 0) {
      checkedRef.current = [...checkedRef.current, ...missingChunk];

      dispatch(
        (ofCollectibles ? loadCollectiblesMetadataAction : loadTokensMetadataAction)({
          rpcUrl: rpcBaseURL,
          slugs: missingChunk
        })
      );
    }
  }, [ofCollectibles, slugsToCheck, getMetadata, metadataLoading, rpcBaseURL]);
};

const handleMissingSlugs = <T extends TezosChain | EvmChain>(
  chainSlugs: string[],
  chains: StringRecord<T>,
  initSlugsLoading: (rpcBaseURL: string, chainId: string, slugs: string[]) => void
) => {
  const chainIdToMissingSlugsRecord = chainSlugs.reduce<StringRecord<string[]>>((acc, chainSlug) => {
    const [_, chainId, slug] = parseChainAssetSlug(chainSlug);

    if (acc[chainId]) acc[chainId].push(slug);
    else acc[chainId] = [slug];

    return acc;
  }, {});

  Object.keys(chainIdToMissingSlugsRecord).forEach(chainId => {
    const rpcBaseURL = chains[chainId]?.rpcBaseURL;

    if (rpcBaseURL) {
      initSlugsLoading(rpcBaseURL, chainId, chainIdToMissingSlugsRecord[chainId]);
    }
  });
};

const useTezosAssetsMetadataPresenceCheck = (
  ofCollectibles: boolean | undefined,
  metadataLoading: boolean,
  getMetadata: TokenMetadataGetter,
  chainSlugsToCheck?: string[],
  associatedAccountPkh = ''
) => {
  const tezosChains = useAllTezosChains();

  const checkedRef = useRef<string[]>([]);

  useEffect(() => {
    if (metadataLoading || !chainSlugsToCheck?.length) return;

    const missingChunk = chainSlugsToCheck
      .filter(chainSlug => {
        const [_, _2, slug] = parseChainAssetSlug(chainSlug, TempleChainKind.Tezos);

        return (
          !isTezAsset(slug) &&
          !isTruthy(getMetadata(slug)) &&
          // In case fetched metadata is `null` & won't save
          !checkedRef.current.includes(slug)
        );
      })
      .slice(0, METADATA_API_LOAD_CHUNK_SIZE);

    if (missingChunk.length > 0) {
      checkedRef.current = checkedRef.current.concat(missingChunk);

      handleMissingSlugs(missingChunk, tezosChains, (rpcUrl, chainId, slugs) => {
        if (ofCollectibles === undefined) {
          dispatch(
            loadNoCategoryTezosAssetsMetadataAction({
              rpcUrl,
              slugs,
              associatedAccountPkh,
              chainId
            })
          );
        } else {
          dispatch((ofCollectibles ? loadCollectiblesMetadataAction : loadTokensMetadataAction)({ rpcUrl, slugs }));
        }
      });
    }
  }, [ofCollectibles, getMetadata, metadataLoading, chainSlugsToCheck, tezosChains, associatedAccountPkh]);
};

export const useEvmGenericAssetsMetadataCheck = (
  chainSlugsToCheck?: string[],
  associatedAccountPkh: HexString = '0x'
) => {
  const evmChains = useAllEvmChains();
  const metadataLoading = useNoCategoryTezosAssetsMetadataLoadingSelector();
  const getMetadata = useGetEvmGenericAssetMetadata();

  const checkedRef = useRef<string[]>([]);

  useEffect(() => {
    if (metadataLoading || !chainSlugsToCheck?.length) return;

    const missingSlugs = chainSlugsToCheck.filter(chainSlug => {
      const [_, chainId, slug] = parseChainAssetSlug(chainSlug, TempleChainKind.EVM);

      return !isEvmNativeTokenSlug(slug) && !getMetadata(slug, chainId) && !checkedRef.current.includes(chainSlug);
    });
    console.log('ebota 1', chainSlugsToCheck, missingSlugs);

    if (missingSlugs.length === 0) {
      return;
    }

    checkedRef.current = checkedRef.current.concat(missingSlugs);

    handleMissingSlugs(missingSlugs, evmChains, (rpcUrl, chainId, slugs) => {
      dispatch(
        loadNoCategoryEvmAssetsMetadataActions.submit({ rpcUrl, associatedAccountPkh, chainId: Number(chainId), slugs })
      );
    });
  }, [associatedAccountPkh, chainSlugsToCheck, evmChains, getMetadata, metadataLoading]);
};
