import type { TokenMetadata } from 'lib/metadata/types';

export interface NoCategoryTezosAssetsMetadataState {
  metadataRecord: StringRecord<TokenMetadata>;
  metadataLoading: boolean;
  contractsChainIds: StringRecord;
  accountToAssetAssociations: StringRecord<string[]>;
}

export const noCategoryTezosAssetsMetadataInitialState: NoCategoryTezosAssetsMetadataState = {
  metadataRecord: {},
  metadataLoading: false,
  contractsChainIds: {},
  accountToAssetAssociations: {}
};
