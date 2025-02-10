import { Draft, createReducer } from '@reduxjs/toolkit';
import { omit, pick } from 'lodash';

import { fromAssetSlug } from 'lib/assets';
import { FetchedMetadataRecord } from 'lib/metadata/fetch';
import { buildTokenMetadataFromFetched } from 'lib/metadata/utils';

import { putCollectiblesMetadataAction } from '../collectibles-metadata/actions';
import { putTokensMetadataAction } from '../tokens-metadata/actions';

import {
  putNoCategoryAssetsMetadataAction,
  loadNoCategoryTezosAssetsMetadataAction,
  setNoCategoryAssetsMetadataLoadingAction,
  refreshNoCategoryTezosAssetsMetadataActions
} from './actions';
import { noCategoryTezosAssetsMetadataInitialState, NoCategoryTezosAssetsMetadataState } from './state';

export const noCategoryTezosAssetsMetadataReducer = createReducer<NoCategoryTezosAssetsMetadataState>(
  noCategoryTezosAssetsMetadataInitialState,
  builder => {
    builder.addCase(
      putNoCategoryAssetsMetadataAction,
      (state, { payload: { records, associatedAccountPkh, chainId, resetLoading } }) => {
        for (const slug of Object.keys(records)) {
          const [address, id] = fromAssetSlug(slug);
          const rawMetadata = records[slug];
          if (!rawMetadata || !id) continue;

          state.metadataRecord[slug] = buildTokenMetadataFromFetched(rawMetadata, address, id);
          state.contractsChainIds[address] = chainId;
          if (!state.accountToAssetAssociations[associatedAccountPkh]) {
            state.accountToAssetAssociations[associatedAccountPkh] = [];
          }
          state.accountToAssetAssociations[associatedAccountPkh].push(slug);
        }

        if (resetLoading) state.metadataLoading = false;
      }
    );

    builder.addCase(loadNoCategoryTezosAssetsMetadataAction, state => {
      state.metadataLoading = true;
    });

    builder.addCase(setNoCategoryAssetsMetadataLoadingAction, (state, { payload }) => {
      state.metadataLoading = payload;
    });

    builder.addCase(refreshNoCategoryTezosAssetsMetadataActions.success, (state, { payload }) => {
      const keysToRefresh = ['artifactUri', 'displayUri'] as const;

      for (const slug of Object.keys(payload)) {
        const current = state.metadataRecord[slug];
        if (!current) continue;

        const [address, id] = fromAssetSlug(slug);
        const rawMetadata = payload[slug];
        if (!rawMetadata || !id) continue;

        const metadata = buildTokenMetadataFromFetched(rawMetadata, address, id);

        state.metadataRecord[slug] = {
          ...omit(current, keysToRefresh),
          ...pick(metadata, keysToRefresh)
        };
      }
    });

    const handlePutTokensOrCollectibles = (
      state: Draft<NoCategoryTezosAssetsMetadataState>,
      { payload: { records } }: { payload: { records: FetchedMetadataRecord } }
    ) => {
      for (const slug in records) {
        if (records[slug]) {
          delete state.metadataRecord[slug];
        }
      }
    };

    builder.addCase(putTokensMetadataAction, handlePutTokensOrCollectibles);
    builder.addCase(putCollectiblesMetadataAction, handlePutTokensOrCollectibles);
  }
);
