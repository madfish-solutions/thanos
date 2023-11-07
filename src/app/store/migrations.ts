import type { PersistedState } from 'redux-persist';

import { toTokenSlug } from 'lib/assets';
import { isCollectible } from 'lib/metadata';

import type { RootState } from './root-state.type';

type TypedPersistedRootState = Exclude<PersistedState, undefined> & RootState;

export const MIGRATIONS = {
  '1': (persistedState: PersistedState) => {
    if (!persistedState) return persistedState;
    const typedPersistedState = persistedState as TypedPersistedRootState;
    const allTokensMetadata = typedPersistedState.tokensMetadata.metadataRecord;

    for (const slug of Object.keys(allTokensMetadata)) {
      const metadata = allTokensMetadata[slug];
      if (!metadata) {
        delete allTokensMetadata[slug];
        continue;
      }

      const tokenId = String(metadata.id);

      // Removing all metadata with broken (exponential form) tokenId.
      // Occured after stringifying large numbers for token IDs.
      if (tokenId.includes('e')) {
        delete allTokensMetadata[slug];
        continue;
      }

      delete allTokensMetadata[slug];

      if (isCollectible(metadata)) {
        typedPersistedState.collectiblesMetadata.records.push({
          ...metadata,
          id: tokenId
        });
      } else {
        const newSlug = toTokenSlug(metadata.address, tokenId);
        allTokensMetadata[newSlug] = { ...metadata, id: tokenId };
      }
    }

    return {
      ...typedPersistedState,
      tokensMetadata: { ...typedPersistedState.tokensMetadata, metadataRecord: allTokensMetadata }
    };
  }
};
