import { useMemo } from 'react';

import BigNumber from 'bignumber.js';

import { OperationConfirmationCardRowVariant } from 'app/templates/operation-confirmation-card';
import {
  AssetMetadataBase,
  EvmCollectibleMetadata,
  EvmNativeTokenMetadata,
  EvmTokenMetadata,
  TokenMetadata as TezosCollectibleMetadata
} from 'lib/metadata/types';
import { atomsToTokens } from 'lib/temple/helpers';
import { OneOfChains } from 'temple/front';
import { AssetsAmounts } from 'temple/types';

const DEFAULT_UNLIMITED_THRESHOLD = new BigNumber(Infinity);

export function useOperationConfirmationCardRowsPropsPart<
  C extends OneOfChains,
  TM extends EvmTokenMetadata | EvmNativeTokenMetadata | AssetMetadataBase,
  CM extends EvmCollectibleMetadata | TezosCollectibleMetadata
>(
  chain: C,
  assetsAmounts: AssetsAmounts,
  useTokenOrGasMetadataGetter: (chainId: C['chainId']) => (assetSlug: string) => TM | undefined,
  useCollectibleMetadataGetter: (chainId: C['chainId']) => (assetSlug: string) => CM | undefined,
  unlimitedAtomicAmountThreshold = DEFAULT_UNLIMITED_THRESHOLD
) {
  const getTokenOrGasMetadata = useTokenOrGasMetadataGetter(chain.chainId);
  const getCollectibleMetadata = useCollectibleMetadataGetter(chain.chainId);

  const allAssetsAreCollectibles = useMemo(
    () => Object.entries(assetsAmounts).every(([slug, { isNft }]) => Boolean(getCollectibleMetadata(slug)) || isNft),
    [assetsAmounts, getCollectibleMetadata]
  );

  return useMemo(
    () =>
      Object.entries(assetsAmounts).map(([assetSlug, { atomicAmount, isNft }]) => {
        const tokenOrGasMetadata = getTokenOrGasMetadata(assetSlug);
        const collectibleMetadata = getCollectibleMetadata(assetSlug);

        return {
          volume: atomicAmount.abs().lt(unlimitedAtomicAmountThreshold)
            ? atomsToTokens(atomicAmount, (tokenOrGasMetadata ?? collectibleMetadata)?.decimals ?? 0)
            : new BigNumber(atomicAmount.isNegative() ? -Infinity : Infinity),
          symbol: collectibleMetadata
            ? ('collectibleName' in collectibleMetadata ? collectibleMetadata.collectibleName : undefined) ??
              collectibleMetadata.name ??
              collectibleMetadata.symbol
            : tokenOrGasMetadata?.symbol ?? tokenOrGasMetadata?.name,
          chain,
          assetSlug,
          variant: allAssetsAreCollectibles
            ? OperationConfirmationCardRowVariant.AllCollectibles
            : collectibleMetadata || isNft
            ? OperationConfirmationCardRowVariant.Collectible
            : OperationConfirmationCardRowVariant.Token
        };
      }),
    [
      allAssetsAreCollectibles,
      assetsAmounts,
      chain,
      getCollectibleMetadata,
      getTokenOrGasMetadata,
      unlimitedAtomicAmountThreshold
    ]
  );
}
