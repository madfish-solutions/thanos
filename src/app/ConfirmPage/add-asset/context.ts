import { useCallback, useState } from 'react';

import constate from 'constate';

import { dispatch, persistor } from 'app/store';
import { putNewEvmTokenAction } from 'app/store/evm/assets/actions';
import { putEvmTokensMetadataAction } from 'app/store/evm/tokens-metadata/actions';
import { toTokenSlug } from 'lib/assets';
import { EvmTokenMetadata } from 'lib/metadata/types';
import { useTempleClient } from 'lib/temple/front';
import { EvmAssetToAddMetadata } from 'lib/temple/types';
import { useAccountAddressForEvm } from 'temple/front';

export const [AddAssetProvider, useAddAsset] = constate(() => {
  const { confirmDAppEvmAssetAdding } = useTempleClient();
  const accountPkh = useAccountAddressForEvm();

  const [errorMessage, setErrorMessage] = useState<string | nullish>(null);
  const [assetMetadata, setAssetMetadata] = useState<EvmTokenMetadata | nullish>(null);

  const handleConfirm = useCallback(
    async (id: string, confirmed: boolean, dAppAssetMetadata: EvmAssetToAddMetadata) => {
      if (confirmed) {
        if (assetMetadata && accountPkh) {
          const assetSlug = toTokenSlug(assetMetadata.address);

          dispatch(
            putNewEvmTokenAction({
              publicKeyHash: accountPkh,
              chainId: dAppAssetMetadata.chainId,
              assetSlug
            })
          );

          dispatch(
            putEvmTokensMetadataAction({
              chainId: dAppAssetMetadata.chainId,
              records: { [assetSlug]: assetMetadata }
            })
          );

          // ensuring the last changes to the store will be persisted before window closes
          await persistor.flush();

          confirmDAppEvmAssetAdding(id, confirmed);
        } else {
          setErrorMessage('Something’s not right. Please try again later.');
        }
      } else {
        confirmDAppEvmAssetAdding(id, confirmed);
      }
    },
    [accountPkh, assetMetadata, confirmDAppEvmAssetAdding]
  );

  return { errorMessage, setErrorMessage, assetMetadata, setAssetMetadata, handleConfirm };
});
