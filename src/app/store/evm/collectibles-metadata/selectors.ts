import { useSelector } from 'app/store/root-state.selector';
import { EvmCollectibleMetadata } from 'lib/metadata/types';

export const useEvmCollectiblesMetadataRecordSelector = () =>
  useSelector(({ evmCollectiblesMetadata }) => evmCollectiblesMetadata.metadataRecord);

export const useEvmCollectibleMetadataSelector = (
  chainId: number,
  collectibleSlug: string
): EvmCollectibleMetadata | undefined =>
  useSelector(({ evmCollectiblesMetadata }) => evmCollectiblesMetadata.metadataRecord[chainId]?.[collectibleSlug]);