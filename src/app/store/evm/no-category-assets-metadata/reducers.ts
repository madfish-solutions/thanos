import { createReducer, Draft } from '@reduxjs/toolkit';
import { omit, pick } from 'lodash';
import { getAddress } from 'viem';

import { fromAssetSlug, toTokenSlug } from 'lib/assets';
import { isPositiveTokenBalance, isProperCollectibleMetadata } from 'lib/utils/evm.utils';

import {
  processLoadedEvmCollectiblesMetadataAction,
  putEvmCollectiblesMetadataAction
} from '../collectibles-metadata/actions';
import { processLoadedEvmTokensMetadataAction, putEvmTokensMetadataAction } from '../tokens-metadata/actions';
import { isValidFetchedEvmMetadata } from '../tokens-metadata/utils';

import { loadNoCategoryEvmAssetsMetadataActions, refreshNoCategoryEvmAssetsMetadataActions } from './actions';
import {
  NoCategoryAssetMetadata,
  NoCategoryEvmAssetsMetadataState,
  noCategoryEvmAssetsMetadataInitialState
} from './state';

export const noCategoryEvmAssetsMetadataReducer = createReducer<NoCategoryEvmAssetsMetadataState>(
  noCategoryEvmAssetsMetadataInitialState,
  builder => {
    builder.addCase(loadNoCategoryEvmAssetsMetadataActions.submit, state => {
      state.metadataLoading = true;
    });

    builder.addCase(
      loadNoCategoryEvmAssetsMetadataActions.success,
      (state, { payload: { records, associatedAccountPkh, poolsAreEmpty } }) => {
        for (const chainId in records) {
          for (const slug in records[chainId]) {
            const [address, id] = fromAssetSlug(slug);
            const rawMetadata = records[chainId][slug];
            if (!rawMetadata || !id) continue;

            if (!state.metadataRecord[chainId]) {
              state.metadataRecord[chainId] = {};
            }
            state.metadataRecord[chainId][slug] = rawMetadata;
            state.contractsChainIds[address] = Number(chainId);
            if (!state.accountToAssetAssociations[associatedAccountPkh]) {
              state.accountToAssetAssociations[associatedAccountPkh] = [];
            }
            state.accountToAssetAssociations[associatedAccountPkh].push(slug);
          }
        }
        state.metadataLoading = !poolsAreEmpty;
      }
    );

    builder.addCase(refreshNoCategoryEvmAssetsMetadataActions.submit, state => {
      state.metadataLoading = true;
    });

    builder.addCase(refreshNoCategoryEvmAssetsMetadataActions.success, (state, { payload }) => {
      const { records, poolsAreEmpty } = payload;
      const keysToRefresh = ['artifactUri', 'displayUri'] as const;

      for (const chainId in records) {
        for (const slug in records[chainId]) {
          const current = state.metadataRecord[chainId]?.[slug];
          const newMetadata = records[chainId][slug];
          if (!current || !newMetadata) continue;

          state.metadataRecord[chainId][slug] = {
            ...omit(current, keysToRefresh),
            ...pick(newMetadata, keysToRefresh)
          } as (typeof state.metadataRecord)[number][string];
        }
      }
      state.metadataLoading = !poolsAreEmpty;
    });

    builder.addCase(processLoadedEvmCollectiblesMetadataAction, (state, { payload }) => {
      const { chainId, data } = payload;
      const chainTokensMetadata = state.metadataRecord[chainId];

      if (!chainTokensMetadata) {
        return;
      }

      data.items.forEach(contract =>
        contract.nft_data.forEach(collectible => {
          if (!isProperCollectibleMetadata(collectible)) return;

          const slug = toTokenSlug(getAddress(contract.contract_address), collectible.token_id);
          delete chainTokensMetadata[slug];
        })
      );
    });

    const handlePutCategorizedAssetsMetadataAction = (
      state: Draft<NoCategoryEvmAssetsMetadataState>,
      { payload }: { payload: { chainId: number; records: StringRecord<NoCategoryAssetMetadata | undefined> } }
    ) => {
      const { chainId, records } = payload;
      const chainTokensMetadata = state.metadataRecord[chainId];

      if (!chainTokensMetadata) {
        return;
      }

      for (const slug in records) {
        if (records[slug]) {
          delete chainTokensMetadata[slug];
        }
      }
    };

    builder.addCase(putEvmCollectiblesMetadataAction, handlePutCategorizedAssetsMetadataAction);

    builder.addCase(processLoadedEvmTokensMetadataAction, (state, { payload }) => {
      const { chainId, data } = payload;
      const chainTokensMetadata = state.metadataRecord[chainId];

      if (!chainTokensMetadata) {
        return;
      }

      data.items.forEach(item => {
        if (item.native_token || !isPositiveTokenBalance(item)) return;

        const contractAddress = getAddress(item.contract_address);
        const slug = toTokenSlug(contractAddress);

        if (!chainTokensMetadata[slug] && isValidFetchedEvmMetadata(item)) {
          delete chainTokensMetadata[slug];
        }
      });
    });

    builder.addCase(putEvmTokensMetadataAction, handlePutCategorizedAssetsMetadataAction);
  }
);
