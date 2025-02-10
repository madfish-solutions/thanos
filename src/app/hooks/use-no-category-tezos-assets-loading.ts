import { useMemo } from 'react';

import { dispatch } from 'app/store';
import { refreshNoCategoryTezosAssetsMetadataActions } from 'app/store/tezos/no-category-assets-metadata/actions';
import { NO_CATEGORY_ASSETS_METADATA_SYNC_INTERVAL } from 'lib/fixed-times';
import { useInterval } from 'lib/ui/hooks';
import { useAllTezosChains } from 'temple/front';

export const useNoCategoryTezosAssetsLoading = (publicKeyHash: string) => {
  const allTezosChains = useAllTezosChains();
  const rpcUrls = useMemo(
    () => Object.fromEntries(Object.entries(allTezosChains).map(([chainId, { rpcBaseURL }]) => [chainId, rpcBaseURL])),
    [allTezosChains]
  );

  useInterval(
    () => {
      dispatch(
        refreshNoCategoryTezosAssetsMetadataActions.submit({
          associatedAccountPkh: publicKeyHash,
          rpcUrls
        })
      );
    },
    [publicKeyHash, rpcUrls],
    NO_CATEGORY_ASSETS_METADATA_SYNC_INTERVAL
  );
};
