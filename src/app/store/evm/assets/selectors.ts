import { EMPTY_FROZEN_OBJ } from 'lib/utils';

import { useSelector } from '../../root-state.selector';

import { AssetSlugStoredAssetRecord } from './state';

export const useEvmStoredTokensRecordSelector = () => useSelector(state => state.evmAssets.tokens);

export const useRawEvmChainAccountTokensSelector = (
  publicKeyHash: HexString,
  chainId: number
): AssetSlugStoredAssetRecord =>
  useSelector(state => state.evmAssets.tokens[publicKeyHash]?.[chainId]) ?? EMPTY_FROZEN_OBJ;

export const useEvmStoredCollectiblesRecordSelector = () => useSelector(state => state.evmAssets.collectibles);

export const useRawEvmChainAccountCollectiblesSelector = (
  publicKeyHash: HexString,
  chainId: number
): AssetSlugStoredAssetRecord =>
  useSelector(state => state.evmAssets.collectibles[publicKeyHash]?.[chainId]) ?? EMPTY_FROZEN_OBJ;