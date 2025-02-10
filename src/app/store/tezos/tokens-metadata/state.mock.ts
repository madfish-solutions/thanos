import { tokenToSlug } from 'lib/assets';

import { mockFA1_2TokenMetadata, mockFA2TokenMetadata } from '../utils';

import { TokensMetadataState } from './state';

export const mockTokensMetadataState: TokensMetadataState = {
  metadataRecord: {
    [tokenToSlug(mockFA1_2TokenMetadata)]: mockFA1_2TokenMetadata,
    [tokenToSlug(mockFA2TokenMetadata)]: mockFA2TokenMetadata
  },
  metadataLoading: false
};
