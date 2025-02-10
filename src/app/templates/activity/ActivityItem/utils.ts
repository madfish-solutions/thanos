import { useCallback } from 'react';

import { TezosOperation } from 'lib/activity';
import { isTransferActivityOperKind } from 'lib/activity/utils';
import { useGetChainTokenOrGasMetadata, useGetNoCategoryAssetMetadata } from 'lib/metadata';

export const getBatchActivityFaceSlugsCandidates = (operations: TezosOperation[]) =>
  operations
    .filter((op): op is TezosOperation & { assetSlug: string } => {
      const { kind, assetSlug, amountSigned } = op;

      return Boolean(assetSlug && amountSigned) && Number(amountSigned) !== 0 && isTransferActivityOperKind(kind);
    })
    .map(op => op.assetSlug);

export const useGetAssetMetadataForTezosBatch = (chainId: string) => {
  const getTokenOrGasMetadata = useGetChainTokenOrGasMetadata(chainId);
  const getNoCategoryAssetMetadata = useGetNoCategoryAssetMetadata();

  return useCallback(
    (assetSlug: string) => getTokenOrGasMetadata(assetSlug) ?? getNoCategoryAssetMetadata(assetSlug),
    [getNoCategoryAssetMetadata, getTokenOrGasMetadata]
  );
};
