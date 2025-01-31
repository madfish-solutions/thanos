import React, { memo, useMemo } from 'react';

import { PageModal } from 'app/atoms/PageModal';
import { TezosActivity } from 'lib/activity';
import { isTransferActivityOperKind } from 'lib/activity/utils';
import { useGetChainTokenOrGasMetadata } from 'lib/metadata';
import { useBooleanState } from 'lib/ui/hooks';
import { ZERO } from 'lib/utils/numbers';
import { BasicTezosChain } from 'temple/front/chains';
import { useGetTezosActiveBlockExplorer } from 'temple/front/ready';
import { makeBlockExplorerHref } from 'temple/front/use-block-explorers';
import { TempleChainKind } from 'temple/types';

import { ActivityOperationBaseComponent } from './ActivityOperationBase';
import { BundleModalContent } from './BundleModal';
import { TezosActivityOperationComponent, buildTezosOperationAsset } from './TezosActivityOperation';

interface Props {
  activity: TezosActivity;
  chain: BasicTezosChain;
  assetSlug?: string;
}

export const TezosActivityComponent = memo<Props>(({ activity, chain, assetSlug }) => {
  const { hash, operations, status, operationsCount } = activity;

  const getTezosActiveBlockExplorer = useGetTezosActiveBlockExplorer();

  const blockExplorerUrl = useMemo(() => {
    const blockExplorerBaseUrl = getTezosActiveBlockExplorer(chain.chainId)?.url;
    if (!blockExplorerBaseUrl) return;

    return makeBlockExplorerHref(blockExplorerBaseUrl, hash, 'tx', TempleChainKind.Tezos);
  }, [getTezosActiveBlockExplorer, hash, chain.chainId]);

  if (operationsCount === 1) {
    const operation = operations.at(0);

    return (
      <TezosActivityOperationComponent
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
    <TezosActivityBatchComponent
      activity={activity}
      chain={chain}
      assetSlug={assetSlug}
      blockExplorerUrl={blockExplorerUrl}
    />
  );
});

interface BatchProps {
  activity: TezosActivity;
  chain: BasicTezosChain;
  assetSlug?: string;
  blockExplorerUrl?: string;
}

const TezosActivityBatchComponent = memo<BatchProps>(({ activity, chain, assetSlug, blockExplorerUrl }) => {
  const [expanded, , , toggleExpanded] = useBooleanState(false);

  const { hash, operations, status } = activity;

  const getMetadata = useGetChainTokenOrGasMetadata(chain.chainId);

  const batchAsset = useMemo(() => {
    const faceSlug =
      assetSlug ||
      operations.find(
        ({ kind, assetSlug, amountSigned }) =>
          assetSlug &&
          amountSigned &&
          Number(amountSigned) !== 0 &&
          isTransferActivityOperKind(kind) &&
          getMetadata(assetSlug)
      )?.assetSlug;

    if (!faceSlug) return;

    let faceAmount = ZERO;

    for (const { kind, assetSlug, amountSigned } of operations) {
      if (assetSlug === faceSlug && amountSigned && isTransferActivityOperKind(kind))
        faceAmount = faceAmount.plus(amountSigned);
    }

    return buildTezosOperationAsset(faceSlug, getMetadata(faceSlug), faceAmount.toFixed());
  }, [getMetadata, operations, assetSlug]);

  return (
    <>
      <ActivityOperationBaseComponent
        kind="bundle"
        hash={hash}
        chain={chain}
        asset={batchAsset}
        status={status}
        blockExplorerUrl={blockExplorerUrl}
        withoutAssetIcon={Boolean(assetSlug)}
        onClick={toggleExpanded}
      />

      <PageModal title="Bundle" opened={expanded} onRequestClose={toggleExpanded}>
        {() => (
          <BundleModalContent addedAt={activity.addedAt} blockExplorerUrl={blockExplorerUrl}>
            {operations.map((operation, j) => (
              <TezosActivityOperationComponent
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
