import React, { memo, useMemo } from 'react';

import { useOperationConfirmationCardRowsPropsPart } from 'app/hooks/use-operation-confirmation-card-rows-props-part';
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

import { BalancesChangesViewLayout } from './layout';
import { BalancesChangesViewProps } from './types';

function BalancesChangesViewHOC<
  C extends OneOfChains,
  TM extends EvmTokenMetadata | EvmNativeTokenMetadata | AssetMetadataBase,
  CM extends EvmCollectibleMetadata | TezosCollectibleMetadata
>(
  useTokenOrGasMetadataGetter: (chainId: C['chainId']) => (assetSlug: string) => TM | undefined,
  useCollectibleMetadataGetter: (chainId: C['chainId']) => (assetSlug: string) => CM | undefined
) {
  return memo<BalancesChangesViewProps<C>>(({ balancesChanges, chain }) => {
    const { chainId } = chain;
    const getCollectibleMetadata = useCollectibleMetadataGetter(chainId);

    const allAssetsAreCollectibles = useMemo(
      () =>
        Object.entries(balancesChanges).every(([slug, { isNft }]) => Boolean(getCollectibleMetadata(slug)) || isNft),
      [balancesChanges, getCollectibleMetadata]
    );

    const rows = useOperationConfirmationCardRowsPropsPart(
      chain,
      balancesChanges,
      useTokenOrGasMetadataGetter,
      useCollectibleMetadataGetter
    );

    return (
      <BalancesChangesViewLayout
        title={allAssetsAreCollectibles ? <T id="estimatedTxDetails" /> : <T id="transactionInfo" />}
        rows={rows}
      />
    );
  });
}

const TezosBalancesChangesView = BalancesChangesViewHOC<TezosChain, AssetMetadataBase, TezosCollectibleMetadata>(
  useGetTezosChainTokenOrGasMetadata,
  useGetTezosCollectibleMetadata
);
const EvmBalancesChangesView = BalancesChangesViewHOC<
  EvmChain,
  EvmTokenMetadata | EvmNativeTokenMetadata,
  EvmCollectibleMetadata
>(useGetEvmChainTokenOrGasMetadata, useGetEvmChainCollectibleMetadata);

export const BalancesChangesView = memo<BalancesChangesViewProps>(({ balancesChanges, chain }) => {
  if (chain.kind === TempleChainKind.Tezos) {
    return <TezosBalancesChangesView balancesChanges={balancesChanges} chain={chain} />;
  }

  return <EvmBalancesChangesView balancesChanges={balancesChanges} chain={chain} />;
});
