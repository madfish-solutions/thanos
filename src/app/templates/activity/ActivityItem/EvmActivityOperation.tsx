import React, { memo, useMemo } from 'react';

import { ActivityOperKindEnum, EvmOperation, ActivityStatus } from 'lib/activity';
import { toEvmAssetSlug } from 'lib/assets/utils';
import { useEvmGenericAssetMetadata } from 'lib/metadata';
import { BasicEvmChain } from 'temple/front/chains';

import { getActivityOperTransferType } from '../utils';

import { ActivityItemBaseAssetProp, ActivityOperationBaseComponent } from './ActivityOperationBase';
import { OperAddressChip } from './AddressChip';

interface Props {
  hash: string;
  operation?: EvmOperation;
  chain: BasicEvmChain;
  blockExplorerUrl?: string;
  status?: ActivityStatus;
  withoutAssetIcon?: boolean;
  withoutOperHashChip?: boolean;
}

export const EvmActivityOperationComponent = memo<Props>(
  ({ hash, operation, chain, blockExplorerUrl, status, withoutAssetIcon, withoutOperHashChip }) => {
    const assetBase = operation?.asset;
    const assetSlug = assetBase?.contract ? toEvmAssetSlug(assetBase.contract) : undefined;

    const assetMetadata = useEvmGenericAssetMetadata(assetSlug ?? '', chain.chainId);

    const asset = useMemo(() => {
      if (!assetBase) return;

      const decimals = assetBase.amountSigned === null ? NaN : assetMetadata?.decimals ?? assetBase.decimals;

      if (decimals == null) return;

      const symbol = assetMetadata?.symbol || assetBase.symbol;

      const asset: ActivityItemBaseAssetProp = {
        ...assetBase,
        decimals,
        symbol
      };

      return asset;
    }, [assetMetadata, assetBase]);

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
        blockExplorerUrl={blockExplorerUrl}
        status={status}
        withoutAssetIcon={withoutAssetIcon}
        addressChip={addressChip}
      />
    );
  }
);
