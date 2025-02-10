import React, { FC } from 'react';

import Money from 'app/atoms/Money';
import { TezosBalance } from 'app/templates/Balance';
import InFiat from 'app/templates/InFiat';
import { AssetMetadataBase, useCategorizedTezosAssetMetadata, getTokenName, getAssetSymbol } from 'lib/metadata';
import { TezosNetworkEssentials } from 'temple/networks';

interface Props {
  network: TezosNetworkEssentials;
  slug: string;
  metadata?: AssetMetadataBase | nullish;
  publicKeyHash: string;
}

export const AssetItemContent: FC<Props> = ({ network, slug, metadata, publicKeyHash }) => {
  if (metadata)
    return (
      <AssetItemContentComponent network={network} slug={slug} metadata={metadata} publicKeyHash={publicKeyHash} />
    );

  return <AssetItemContentWithUseMeta network={network} slug={slug} publicKeyHash={publicKeyHash} />;
};

interface AssetItemContentWithUseMetaProps {
  network: TezosNetworkEssentials;
  slug: string;
  publicKeyHash: string;
}

const AssetItemContentWithUseMeta: FC<AssetItemContentWithUseMetaProps> = ({ network, slug, publicKeyHash }) => {
  const metadata = useCategorizedTezosAssetMetadata(slug, network.chainId);

  return <AssetItemContentComponent network={network} slug={slug} metadata={metadata} publicKeyHash={publicKeyHash} />;
};

interface AssetItemContentComponentProps extends AssetItemContentWithUseMetaProps {
  metadata?: AssetMetadataBase | nullish;
}

const AssetItemContentComponent: FC<AssetItemContentComponentProps> = ({
  network,
  slug,
  metadata = null,
  publicKeyHash
}) => (
  <>
    <div className="flex flex-col items-start mr-2 leading-none">
      <span className="text-gray-910 text-lg mb-2">{getAssetSymbol(metadata)}</span>
      <span className="text-gray-600 text-xs">{getTokenName(metadata)}</span>
    </div>

    <div className="flex-1 flex flex-col items-end text-right leading-none">
      <span className="text-gray-910 text-lg mb-2">
        <TezosBalance network={network} assetSlug={slug} address={publicKeyHash}>
          {balance => (
            <Money smallFractionFont={false} tooltip={false}>
              {balance}
            </Money>
          )}
        </TezosBalance>
      </span>

      <span className="text-xs text-gray-600">
        <TezosBalance network={network} assetSlug={slug} address={publicKeyHash}>
          {volume => (
            <InFiat chainId={network.chainId} assetSlug={slug} volume={volume} smallFractionFont={false}>
              {({ balance, symbol }) => (
                <>
                  <span className="mr-1">≈</span>
                  {balance}
                  <span className="ml-1">{symbol}</span>
                </>
              )}
            </InFiat>
          )}
        </TezosBalance>
      </span>
    </div>
  </>
);
