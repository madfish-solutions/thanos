import React, { memo, useCallback, useEffect, useMemo } from 'react';

import { CaptionAlert } from 'app/atoms';
import { HashChip } from 'app/atoms/HashChip';
import { EvmNetworkLogo } from 'app/atoms/NetworkLogo';
import Spinner from 'app/atoms/Spinner/Spinner';
import { EvmAssetIconWithNetwork } from 'app/templates/AssetIcon';
import { fetchEvmTokenMetadataFromChain } from 'lib/evm/on-chain/metadata';
import { EvmAssetStandard } from 'lib/evm/types';
import { T } from 'lib/i18n';
import { EvmTokenMetadata } from 'lib/metadata/types';
import { useTypedSWR } from 'lib/swr';
import { EvmAssetToAddMetadata } from 'lib/temple/types';
import { useEvmChainByChainId } from 'temple/front/chains';

import { useAddAsset } from './context';

interface Props {
  metadata: EvmAssetToAddMetadata;
}

export const AddAssetView = memo<Props>(({ metadata }) => {
  const { errorMessage, setErrorMessage, setAssetMetadata } = useAddAsset();

  const network = useEvmChainByChainId(metadata.chainId);

  const loadAssetMetadata = useCallback(() => {
    if (!network) {
      setErrorMessage('Network is not supported.');

      return;
    }

    return fetchEvmTokenMetadataFromChain(network, metadata.address);
  }, [metadata.address, network, setErrorMessage]);

  const { data: metadataResponse, isValidating: isChainMetadataLoading } = useTypedSWR(
    ['add-dApp-asset', metadata.chainId, metadata.address],
    loadAssetMetadata,
    {
      shouldRetryOnError: false,
      focusThrottleInterval: 10_000,
      dedupingInterval: 10_000
    }
  );

  const chainMetadata = useMemo<EvmTokenMetadata>(
    () => ({ ...metadataResponse, address: metadata.address, standard: EvmAssetStandard.ERC20 }),
    [metadataResponse, metadata.address]
  );

  useEffect(() => {
    if (!isChainMetadataLoading && !metadataResponse) setErrorMessage('Failed to load asset metadata.');
    if (metadataResponse) {
      setErrorMessage(null);
      setAssetMetadata(chainMetadata);
    }
  }, [metadataResponse, isChainMetadataLoading, setAssetMetadata, chainMetadata, setErrorMessage]);

  if (!metadataResponse && isChainMetadataLoading) {
    return (
      <div className="flex justify-center my-20">
        <Spinner theme="gray" className="w-20" />
      </div>
    );
  }

  const name = chainMetadata?.name ?? metadata.name ?? 'Unknown Asset';
  const symbol = chainMetadata?.symbol ?? metadata.symbol ?? '???';
  const decimals = chainMetadata?.decimals ?? metadata.decimals ?? 0;

  return (
    <div className="flex flex-col gap-6 mb-6">
      <div className="flex flex-col justify-center items-center text-center">
        <EvmAssetIconWithNetwork metadata={chainMetadata} evmChainId={metadata.chainId} assetSlug={metadata.address} />

        <span className="text-font-medium-bold mt-2">{symbol}</span>
        <span className="text-font-description text-grey-1">{name}</span>
      </div>

      <div className="flex flex-col gap-4">
        {errorMessage && <CaptionAlert type="error" message={errorMessage} className="items-center" />}

        <div className="flex flex-col px-4 py-2 rounded-8 shadow-bottom border-0.5 border-transparent">
          {network && (
            <div className="py-2 flex flex-row justify-between items-center border-b-0.5 border-lines">
              <p className="p-1 text-font-description text-grey-1">
                <T id="network" />
              </p>

              <div className="flex flex-row items-center">
                <span className="p-1 text-font-num-bold-12">{network.name}</span>
                <EvmNetworkLogo chainId={network.chainId} chainName={network.name} size={16} />
              </div>
            </div>
          )}

          <div className="py-2 flex flex-row justify-between items-center border-b-0.5 border-lines">
            <p className="p-1 text-font-description text-grey-1">
              <T id="contractAddress" />
            </p>
            <HashChip hash={metadata.address} />
          </div>

          <div className="py-2 flex flex-row justify-between items-center">
            <p className="p-1 text-font-description text-grey-1">
              <T id="decimals" />
            </p>
            <p className="p-1 text-font-num-bold-12">{decimals}</p>
          </div>
        </div>
      </div>
    </div>
  );
});
