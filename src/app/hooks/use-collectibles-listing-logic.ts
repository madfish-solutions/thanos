import { useMemo, useState } from 'react';

import { useDebounce } from 'use-debounce';

import { useEvmBalancesLoadingSelector, useEvmCollectiblesMetadataLoadingSelector } from 'app/store/evm/selectors';
import { useAreAssetsLoading } from 'app/store/tezos/assets/selectors';
import { useCollectiblesMetadataLoadingSelector } from 'app/store/tezos/collectibles-metadata/selectors';
import { searchAssetsWithNoMeta } from 'lib/assets/search.utils';
import { useCollectiblesMetadataPresenceCheck, useGetCollectibleMetadata } from 'lib/metadata';
import { isSearchStringApplicable } from 'lib/utils/search-items';
import { createLocationState } from 'lib/woozie/location';
import { TezosNetworkEssentials } from 'temple/networks';

import {
  ITEMS_PER_PAGE,
  useCollectiblesPaginationLogic,
  useEvmCollectiblesPaginationLogic
} from './use-collectibles-pagination-logic';

export const useCollectiblesListingLogic = (network: TezosNetworkEssentials, allSlugsSorted: string[]) => {
  const {
    slugs: paginatedSlugs,
    isLoading: pageIsLoading,
    loadNext
  } = useCollectiblesPaginationLogic(allSlugsSorted, network.rpcBaseURL);

  const assetsAreLoading = useAreAssetsLoading('collectibles');
  const metadatasLoading = useCollectiblesMetadataLoadingSelector();

  const [searchValue, setSearchValue] = useState('');
  const [searchValueDebounced] = useDebounce(searchValue, 500);

  const isInSearchMode = isSearchStringApplicable(searchValueDebounced);

  const isSyncing = isInSearchMode ? assetsAreLoading || metadatasLoading : assetsAreLoading || pageIsLoading;

  // In `isInSearchMode === false` there might be a glitch after `assetsAreLoading` & before `pageIsLoading`
  // of `isSyncing === false`. Debouncing to preserve `true` for a while.
  const [isSyncingDebounced] = useDebounce(isSyncing, 500);

  const metaToCheckAndLoad = useMemo(() => {
    // Search is not paginated. This is how all needed meta is loaded
    if (isInSearchMode) return allSlugsSorted;

    // In pagination, loading meta for the following pages in advance,
    // while not required in current page
    return pageIsLoading ? undefined : allSlugsSorted.slice(paginatedSlugs.length + ITEMS_PER_PAGE * 2);
  }, [isInSearchMode, pageIsLoading, allSlugsSorted, paginatedSlugs.length]);

  useCollectiblesMetadataPresenceCheck(network.rpcBaseURL, metaToCheckAndLoad);

  const getCollectibleMeta = useGetCollectibleMetadata();

  const displayedSlugs = useMemo(
    () =>
      isInSearchMode
        ? searchAssetsWithNoMeta(searchValueDebounced, allSlugsSorted, getCollectibleMeta, slug => slug)
        : paginatedSlugs,
    [isInSearchMode, paginatedSlugs, searchValueDebounced, allSlugsSorted, getCollectibleMeta]
  );

  return {
    isInSearchMode,
    displayedSlugs,
    paginatedSlugs,
    isSyncing: isSyncing || isSyncingDebounced,
    loadNext,
    searchValue,
    setSearchValue
  };
};

export const useEvmCollectiblesListingLogic = (allSlugsSorted: string[]) => {
  const initialAmount = useMemo(() => {
    const { search } = createLocationState();
    const usp = new URLSearchParams(search);
    const amount = usp.get('amount');
    return amount ? Number(amount) : 0;
  }, []);

  const {
    slugs: paginatedSlugs,
    isLoading: pageIsLoading,
    loadNext
  } = useEvmCollectiblesPaginationLogic(allSlugsSorted, initialAmount);

  const balancesLoading = useEvmBalancesLoadingSelector();
  const metadatasLoading = useEvmCollectiblesMetadataLoadingSelector();

  const isSyncing = balancesLoading || pageIsLoading || metadatasLoading;

  return {
    paginatedSlugs,
    isSyncing,
    loadNext
  };
};
