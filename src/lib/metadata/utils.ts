import { isString, pick } from 'lodash';

import type { TokenMetadataResponse, WhitelistResponseToken } from 'lib/apis/temple';
import { TEZOS_SYMBOL } from 'lib/assets';

import {
  AssetMetadataBase,
  TokenMetadata,
  TezosTokenStandardsEnum,
  EvmCollectibleMetadata,
  EvmAssetMetadataBase,
  EvmAssetMetadata
} from './types';

export function getAssetSymbol(metadata: EvmAssetMetadataBase | AssetMetadataBase | nullish, short = false) {
  if (!metadata?.symbol) return '???';
  if (!short) return metadata.symbol;

  return metadata.symbol === 'tez' ? TEZOS_SYMBOL : metadata.symbol.substring(0, 5);
}

export function getTokenName(metadata: EvmAssetMetadataBase | AssetMetadataBase | nullish) {
  return metadata?.name || 'Unknown Token';
}

export function getCollectibleName(metadata: EvmCollectibleMetadata | nullish) {
  return metadata?.collectibleName || 'Unknown Collectible';
}

export function getCollectionName(metadata: EvmCollectibleMetadata | nullish) {
  return metadata?.name || 'Unknown Collection';
}

/** Empty string for `artifactUri` counts */
export const isCollectible = (metadata: StringRecord<any>) =>
  'artifactUri' in metadata && isString(metadata.artifactUri);

export const isEvmCollectible = (metadata: EvmAssetMetadata): metadata is EvmCollectibleMetadata =>
  'tokenId' in metadata;

/**
 * @deprecated // Assertion here is not safe!
 */
export const isTezosCollectibleMetadata = (metadata: AssetMetadataBase): metadata is TokenMetadata =>
  isCollectible(metadata);

/** TODO: Better way */
export const isEvmCollectibleMetadata = (metadata: EvmAssetMetadataBase): metadata is EvmCollectibleMetadata =>
  'image' in metadata;

export const buildTokenMetadataFromFetched = (
  token: TokenMetadataResponse,
  address: string,
  id: string
): TokenMetadata => ({
  address,
  id,
  ...pick(token, ['decimals', 'thumbnailUri', 'displayUri', 'artifactUri']),
  symbol: token.symbol ?? token.name?.substring(0, 8) ?? '???',
  name: token.name ?? token.symbol ?? 'Unknown Token'
});

export const buildTokenMetadataFromWhitelist = ({
  contractAddress,
  fa2TokenId,
  type,
  metadata
}: WhitelistResponseToken): TokenMetadata => ({
  address: contractAddress,
  id: fa2TokenId ? String(fa2TokenId) : '0',
  decimals: metadata.decimals,
  symbol: metadata.symbol ?? metadata.name.substring(0, 8) ?? '???',
  name: metadata.name ?? metadata.symbol ?? 'Unknown Token',
  thumbnailUri: metadata.thumbnailUri,
  standard: type === 'FA12' ? TezosTokenStandardsEnum.Fa12 : TezosTokenStandardsEnum.Fa2
});
