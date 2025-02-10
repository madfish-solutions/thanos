import { EvmCollectibleMetadata, EvmTokenMetadata } from 'lib/metadata/types';

export type NoCategoryAssetMetadata = EvmTokenMetadata | EvmCollectibleMetadata;

export type ChainId = number;

type TokenSlugAssetMetadataRecord = StringRecord<NoCategoryAssetMetadata>;

type EvmNoCategoryAssetMetadataRecord = Record<ChainId, TokenSlugAssetMetadataRecord>;

export interface NoCategoryEvmAssetsMetadataState {
  metadataRecord: EvmNoCategoryAssetMetadataRecord;
  contractsChainIds: StringRecord<number>;
  accountToAssetAssociations: StringRecord<string[]>;
  metadataLoading: boolean;
}

export const noCategoryEvmAssetsMetadataInitialState: NoCategoryEvmAssetsMetadataState = {
  metadataRecord: {},
  contractsChainIds: {},
  accountToAssetAssociations: {},
  metadataLoading: false
};
