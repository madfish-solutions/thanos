import { createAction } from '@reduxjs/toolkit';

import type { FetchedMetadataRecord } from 'lib/metadata/fetch';
import { createActions } from 'lib/store';

export const putNoCategoryAssetsMetadataAction = createAction<{
  records: FetchedMetadataRecord;
  associatedAccountPkh: string;
  chainId: string;
  resetLoading?: boolean;
}>('tezos/no-category-assets-metadata/PUT_MULTIPLE');

export const loadNoCategoryTezosAssetsMetadataAction = createAction<{
  associatedAccountPkh: string;
  rpcUrl: string;
  chainId: string;
  slugs: string[];
}>('tezos/no-category-assets-metadata/LOAD');

export const setNoCategoryAssetsMetadataLoadingAction = createAction<boolean>(
  'tezos/no-category-assets-metadata/SET_LOADING'
);

export const refreshNoCategoryTezosAssetsMetadataActions = createActions<
  { associatedAccountPkh: string; rpcUrls: StringRecord },
  FetchedMetadataRecord
>('tezos/no-category-assets-metadata/REFRESH_MULTIPLE');
