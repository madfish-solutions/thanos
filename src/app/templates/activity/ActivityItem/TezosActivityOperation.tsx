import React, { memo, useMemo } from 'react';

import { ActivityOperKindEnum, TezosOperation, ActivityStatus } from 'lib/activity';
import { fromAssetSlug } from 'lib/assets';
import { AssetMetadataBase, isTezosCollectibleMetadata, useGenericTezosAssetMetadata } from 'lib/metadata';
import { BasicTezosChain } from 'temple/front/chains';

import { getActivityOperTransferType } from '../utils';

import { ActivityItemBaseAssetProp, ActivityOperationBaseComponent } from './ActivityOperationBase';
import { OperAddressChip } from './AddressChip';

interface Props {
  hash: string;
  operation?: TezosOperation;
  chain: BasicTezosChain;
  status?: ActivityStatus;
  blockExplorerUrl: string | nullish;
  withoutAssetIcon?: boolean;
  withoutOperHashChip?: boolean;
}

export const TezosActivityOperationComponent = memo<Props>(
  ({ hash, operation, chain, blockExplorerUrl, status, withoutAssetIcon, withoutOperHashChip }) => {
    const assetSlug = operation?.assetSlug;
    const assetMetadata = useGenericTezosAssetMetadata(assetSlug ?? '', chain.chainId);

    const asset = useMemo(
      () => (assetSlug ? buildTezosOperationAsset(assetSlug, assetMetadata, operation.amountSigned) : undefined),
      [assetMetadata, operation, assetSlug]
    );

    const addressChip = useMemo(
      () => (withoutOperHashChip && operation ? <OperAddressChip operation={operation} /> : null),
      [operation, withoutOperHashChip]
    );

    return (
      <ActivityOperationBaseComponent
        kind={operation?.kind ?? ActivityOperKindEnum.interaction}
        transferType={getActivityOperTransferType(operation)}
        hash={hash}
        chain={chain}
        asset={asset}
        status={status}
        blockExplorerUrl={blockExplorerUrl ?? undefined}
        withoutAssetIcon={withoutAssetIcon}
        addressChip={addressChip}
      />
    );
  }
);

export function buildTezosOperationAsset(
  assetSlug: string,
  assetMetadata: AssetMetadataBase | undefined,
  amountSigned: string | nullish
): ActivityItemBaseAssetProp | undefined {
  const [contract, tokenId] = fromAssetSlug(assetSlug);

  const decimals = amountSigned === null ? NaN : assetMetadata?.decimals;
  if (decimals == null) return;

  return {
    contract,
    tokenId,
    amountSigned,
    decimals,
    symbol: assetMetadata?.symbol,
    nft: assetMetadata ? isTezosCollectibleMetadata(assetMetadata) : undefined
  };
}
