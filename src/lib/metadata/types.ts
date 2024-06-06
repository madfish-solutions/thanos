import { NftCollectionAttribute } from '../apis/temple/endpoints/evm/api.interfaces';
import { EVM_TOKEN_SLUG } from '../assets/defaults';
import { EvmAssetStandard } from '../evm/types';

export enum TezosTokenStandardsEnum {
  Fa2 = 'fa2',
  Fa12 = 'fa12'
}

export interface AssetMetadataBase {
  name: string;
  symbol: string;
  decimals: number;
  thumbnailUri?: string;
}

export interface TokenMetadata extends AssetMetadataBase {
  address: string;
  id: string;
  standard?: TezosTokenStandardsEnum;
  displayUri?: string;
  artifactUri?: string;
}

export type MetadataRecords = Record<string, TokenMetadata>;

/**
 * Maps are up to 2000 times faster to read from than arrays.
 * Be sure to convert to a serializible value before persisting.
 */
export type MetadataMap = Map<string, TokenMetadata>;

export interface EvmTokenMetadata {
  standard: EvmAssetStandard;
  address: typeof EVM_TOKEN_SLUG | HexString;
  /** contract name (for nft contract refers to collection name) */
  name?: string;
  /** contract symbol (for nft contract refers to collection symbol) */
  symbol?: string;
  /** contract decimals (could be available only for ERC20 tokens and native currency) */
  decimals?: number;
}

export interface EvmNativeTokenMetadata extends Required<EvmTokenMetadata> {
  standard: EvmAssetStandard.NATIVE;
  address: typeof EVM_TOKEN_SLUG;
}

export interface EvmCollectibleMetadata extends EvmTokenMetadata {
  tokenId: string;
  metadataUri: string;
  image: string;
  collectibleName: string;
  description: string;
  attributes?: NftCollectionAttribute[];
  externalUrl?: string;
  animationUrl?: string;
  originalOwner?: string;
}
