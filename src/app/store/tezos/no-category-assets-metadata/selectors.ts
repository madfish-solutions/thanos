import type { TokenMetadata } from 'lib/metadata';

import { useSelector } from '../../root-state.selector';

export const useNoCategoryTezosAssetMetadataSelector = (slug: string): TokenMetadata | undefined =>
  useSelector(({ noCategoryAssetMetadata }) => noCategoryAssetMetadata.metadataRecord[slug]);

export const useAllNoCategoryTezosAssetsMetadataSelector = () =>
  useSelector(({ noCategoryAssetMetadata }) => noCategoryAssetMetadata.metadataRecord);

export const useNoCategoryTezosAssetsMetadataLoadingSelector = () =>
  useSelector(({ noCategoryAssetMetadata }) => noCategoryAssetMetadata.metadataLoading);
