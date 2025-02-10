import { useMemo } from 'react';

import { dispatch } from 'app/store';
import { refreshNoCategoryEvmAssetsMetadataActions } from 'app/store/evm/no-category-assets-metadata/actions';
import { NO_CATEGORY_ASSETS_METADATA_SYNC_INTERVAL } from 'lib/fixed-times';
import { useInterval } from 'lib/ui/hooks';
import { useAllEvmChains } from 'temple/front';

export const useNoCategoryEvmAssetsLoading = (publicKeyHash: HexString) => {
  const allEvmChains = useAllEvmChains();
  const rpcUrls = useMemo(
    () => Object.fromEntries(Object.entries(allEvmChains).map(([chainId, { rpcBaseURL }]) => [chainId, rpcBaseURL])),
    [allEvmChains]
  );

  useInterval(
    () => {
      dispatch(
        refreshNoCategoryEvmAssetsMetadataActions.submit({
          associatedAccountPkh: publicKeyHash,
          rpcUrls
        })
      );
    },
    [publicKeyHash, rpcUrls],
    NO_CATEGORY_ASSETS_METADATA_SYNC_INTERVAL
  );
};
