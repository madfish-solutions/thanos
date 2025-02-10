import { createActions } from 'lib/store';

import { ChainId, NoCategoryAssetMetadata } from './state';

export type AssetsMetadataInput = Record<ChainId, StringRecord<NoCategoryAssetMetadata | undefined>>;

export const loadNoCategoryEvmAssetsMetadataActions = createActions<
  {
    rpcUrl: string;
    associatedAccountPkh: HexString;
    chainId: number;
    slugs: string[];
  },
  { records: AssetsMetadataInput; associatedAccountPkh: HexString; poolsAreEmpty: boolean }
>('evm/no-category-assets-metadata/LOAD');

export const refreshNoCategoryEvmAssetsMetadataActions = createActions<
  { associatedAccountPkh: HexString; rpcUrls: Record<number, string> },
  { records: AssetsMetadataInput; poolsAreEmpty: boolean }
>('evm/no-category-assets-metadata/REFRESH_MULTIPLE');
