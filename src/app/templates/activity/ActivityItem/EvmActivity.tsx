import React, { memo, useMemo } from 'react';

import { PageModal } from 'app/atoms/PageModal';
import { EvmActivity, EvmActivityAsset } from 'lib/activity';
import { isTransferActivityOperKind } from 'lib/activity/utils';
import { fromAssetSlug, toEvmAssetSlug } from 'lib/assets/utils';
import { useGetEvmChainAssetMetadata } from 'lib/metadata';
import { useBooleanState } from 'lib/ui/hooks';
import { ZERO } from 'lib/utils/numbers';
import { BasicEvmChain } from 'temple/front/chains';
import { useGetEvmActiveBlockExplorer } from 'temple/front/ready';
import { makeBlockExplorerHref } from 'temple/front/use-block-explorers';
import { TempleChainKind } from 'temple/types';

import { ActivityItemBaseAssetProp, ActivityOperationBaseComponent } from './ActivityOperationBase';
import { BundleModalContent } from './BundleModal';
import { EvmActivityOperationComponent } from './EvmActivityOperation';

interface Props {
  activity: EvmActivity;
  chain: BasicEvmChain;
  assetSlug?: string;
}

export const EvmActivityComponent = memo<Props>(({ activity, chain, assetSlug }) => {
  const { hash, operations, operationsCount, status } = activity;

  const getEvmActiveBlockExplorer = useGetEvmActiveBlockExplorer();

  const blockExplorerUrl = useMemo(() => {
    const blockExplorerBaseUrl = getEvmActiveBlockExplorer(String(chain.chainId))?.url;
    if (!blockExplorerBaseUrl) return;

    return makeBlockExplorerHref(blockExplorerBaseUrl, hash, 'tx', TempleChainKind.EVM);
  }, [getEvmActiveBlockExplorer, hash, chain.chainId]);

  if (operationsCount === 1) {
    const operation = operations.at(0);

    return (
      <EvmActivityOperationComponent
        hash={hash}
        operation={operation}
        chain={chain}
        blockExplorerUrl={blockExplorerUrl}
        status={status}
        withoutAssetIcon={Boolean(assetSlug)}
      />
    );
  }

  return (
    <EvmActivityBatchComponent
      activity={activity}
      chain={chain}
      assetSlug={assetSlug}
      blockExplorerUrl={blockExplorerUrl}
    />
  );
});

interface BatchProps {
  activity: EvmActivity;
  chain: BasicEvmChain;
  assetSlug?: string;
  blockExplorerUrl?: string;
}

const EvmActivityBatchComponent = memo<BatchProps>(({ activity, chain, assetSlug, blockExplorerUrl }) => {
  const [expanded, , , toggleExpanded] = useBooleanState(false);

  const { hash, operations, status } = activity;

  const getMetadata = useGetEvmChainAssetMetadata(chain.chainId);

  const faceSlug = useMemo(() => {
    if (assetSlug) return assetSlug;

    for (const { kind, asset } of operations) {
      if (asset?.amountSigned && Number(asset.amountSigned) !== 0 && isTransferActivityOperKind(kind)) {
        const slug = toEvmAssetSlug(asset.contract, asset.tokenId);

        const decimals = getMetadata(slug)?.decimals ?? asset.decimals;

        if (decimals != null) return slug;
      }
    }

    return;
  }, [getMetadata, operations, assetSlug]);

  const batchAsset = useMemo<ActivityItemBaseAssetProp | undefined>(() => {
    if (!faceSlug) return;

    let faceAssetBase: EvmActivityAsset | undefined;
    let faceAmount = ZERO;

    for (const { kind, asset } of operations) {
      if (
        isTransferActivityOperKind(kind) &&
        asset?.amountSigned &&
        toEvmAssetSlug(asset.contract, asset.tokenId) === faceSlug
      ) {
        faceAmount = faceAmount.plus(asset.amountSigned);
        if (!faceAssetBase) faceAssetBase = asset;
      }
    }

    const assetMetadata = getMetadata(faceSlug);

    const decimals = assetMetadata?.decimals ?? faceAssetBase?.decimals;

    if (decimals == null) return;

    const symbol = assetMetadata?.symbol || faceAssetBase?.symbol;

    const [contract, tokenId] = fromAssetSlug(faceSlug);

    return {
      ...faceAssetBase,
      contract,
      tokenId,
      amountSigned: faceAmount.toFixed(),
      decimals,
      symbol
    };
  }, [getMetadata, operations, faceSlug]);

  return (
    <>
      <ActivityOperationBaseComponent
        kind="bundle"
        hash={hash}
        chain={chain}
        asset={batchAsset}
        blockExplorerUrl={blockExplorerUrl}
        status={status}
        withoutAssetIcon={Boolean(assetSlug)}
        onClick={toggleExpanded}
      />

      <PageModal title="Bundle" opened={expanded} onRequestClose={toggleExpanded}>
        {() => (
          <BundleModalContent addedAt={activity.addedAt} blockExplorerUrl={blockExplorerUrl}>
            {operations.map((operation, j) => (
              <EvmActivityOperationComponent
                key={`${hash}-${j}`}
                hash={hash}
                operation={operation}
                chain={chain}
                blockExplorerUrl={blockExplorerUrl}
                withoutOperHashChip
              />
            ))}
          </BundleModalContent>
        )}
      </PageModal>
    </>
  );
});
