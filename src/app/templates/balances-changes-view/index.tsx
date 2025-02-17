import React, { ReactNode, memo, useMemo } from 'react';

import { T } from 'lib/i18n';
import {
  AssetMetadataBase,
  TokenMetadata as TezosCollectibleMetadata,
  useGetEvmChainCollectibleMetadata,
  useGetEvmChainTokenOrGasMetadata,
  useGetChainTokenOrGasMetadata as useGetTezosChainTokenOrGasMetadata,
  useGetCollectibleMetadata as useGetTezosCollectibleMetadata
} from 'lib/metadata';
import { EvmCollectibleMetadata, EvmNativeTokenMetadata, EvmTokenMetadata } from 'lib/metadata/types';
import { EvmChain, OneOfChains, TezosChain } from 'temple/front';
import { TempleChainKind } from 'temple/types';

import { EvmAssetIcon, EvmAssetIconPlaceholder, TezosAssetIcon, TezosAssetIconPlaceholder } from '../AssetIcon';

import { BalancesChangesViewLayout, BalancesChangesViewRowProps, BalancesChangesViewRowVariant } from './layout';
import { BalancesChangesViewProps } from './types';
import { ReactComponent as UnknownToken } from './unknown-token.svg';

function BalancesChangesViewHOC<
  C extends OneOfChains,
  TM extends EvmTokenMetadata | EvmNativeTokenMetadata | AssetMetadataBase,
  CM extends EvmCollectibleMetadata | TezosCollectibleMetadata
>(
  useTokenOrGasMetadataGetter: (chainId: C['chainId']) => (assetSlug: string) => TM | undefined,
  useCollectibleMetadataGetter: (chainId: C['chainId']) => (assetSlug: string) => CM | undefined,
  renderIcon: (chainId: C['chainId'], assetSlug: string, size: number, isCollectible: boolean) => ReactNode
) {
  return memo<BalancesChangesViewProps<C>>(({ balancesChanges, chain }) => {
    const { chainId, kind: chainKind } = chain;
    const getTokenOrGasMetadata = useTokenOrGasMetadataGetter(chainId);
    const getCollectibleMetadata = useCollectibleMetadataGetter(chainId);

    const allAssetsAreCollectibles = useMemo(
      () =>
        Object.entries(balancesChanges).every(([slug, { isNft }]) => Boolean(getCollectibleMetadata(slug)) || isNft),
      [balancesChanges, getCollectibleMetadata]
    );

    const rows = useMemo<BalancesChangesViewRowProps[]>(
      () =>
        Object.entries(balancesChanges).map(([assetSlug, { atomicAmount, isNft }]) => {
          const tokenOrGasMetadata = getTokenOrGasMetadata(assetSlug);
          const collectibleMetadata = getCollectibleMetadata(assetSlug);

          return {
            icon: renderIcon(
              chainId,
              assetSlug,
              allAssetsAreCollectibles ? 36 : 24,
              Boolean(collectibleMetadata || isNft)
            ),
            atomicAmount,
            decimals: (tokenOrGasMetadata ?? collectibleMetadata)?.decimals,
            symbol: collectibleMetadata
              ? ('collectibleName' in collectibleMetadata ? collectibleMetadata.collectibleName : undefined) ??
                collectibleMetadata.name ??
                collectibleMetadata.symbol
              : tokenOrGasMetadata?.symbol ?? tokenOrGasMetadata?.name,
            chainId,
            assetSlug,
            evm: chainKind === TempleChainKind.EVM,
            variant: allAssetsAreCollectibles
              ? BalancesChangesViewRowVariant.AllCollectibles
              : collectibleMetadata || isNft
              ? BalancesChangesViewRowVariant.Collectible
              : BalancesChangesViewRowVariant.Token
          };
        }),
      [balancesChanges, chainKind, chainId, getTokenOrGasMetadata, getCollectibleMetadata, allAssetsAreCollectibles]
    );

    return (
      <BalancesChangesViewLayout
        title={allAssetsAreCollectibles ? <T id="estimatedTxDetails" /> : <T id="transactionInfo" />}
        rows={rows}
      />
    );
  });
}

const CollectibleIconFallback = memo<{ size?: number }>(({ size = 24 }) => (
  <UnknownToken style={{ width: size, height: size }} />
));

const TezosBalancesChangesView = BalancesChangesViewHOC<TezosChain, AssetMetadataBase, TezosCollectibleMetadata>(
  useGetTezosChainTokenOrGasMetadata,
  useGetTezosCollectibleMetadata,
  (chainId, assetSlug, size, isCollectible) => (
    <TezosAssetIcon
      tezosChainId={chainId}
      assetSlug={assetSlug}
      size={size}
      Fallback={isCollectible ? CollectibleIconFallback : TezosAssetIconPlaceholder}
    />
  )
);
const EvmBalancesChangesView = BalancesChangesViewHOC<
  EvmChain,
  EvmTokenMetadata | EvmNativeTokenMetadata,
  EvmCollectibleMetadata
>(useGetEvmChainTokenOrGasMetadata, useGetEvmChainCollectibleMetadata, (chainId, assetSlug, size, isCollectible) => (
  <EvmAssetIcon
    evmChainId={chainId}
    assetSlug={assetSlug}
    size={size}
    Fallback={isCollectible ? CollectibleIconFallback : EvmAssetIconPlaceholder}
  />
));

export const BalancesChangesView = memo<BalancesChangesViewProps>(({ balancesChanges, chain }) => {
  if (chain.kind === TempleChainKind.Tezos) {
    return <TezosBalancesChangesView balancesChanges={balancesChanges} chain={chain} />;
  }

  return <EvmBalancesChangesView balancesChanges={balancesChanges} chain={chain} />;
});
