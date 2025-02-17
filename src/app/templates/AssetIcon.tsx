import React, { memo } from 'react';

import clsx from 'clsx';

import { IdenticonInitials } from 'app/atoms/Identicon';
import { EvmNetworkLogo, TezosNetworkLogo } from 'app/atoms/NetworkLogo';
import { ReactComponent as CollectiblePlaceholderSvg } from 'app/icons/collectible-placeholder.svg';
import { getAssetSymbol, isEvmCollectibleMetadata, isTezosCollectibleMetadata } from 'lib/metadata/utils';
import { useEvmChainByChainId, useTezosChainByChainId } from 'temple/front/chains';

import { TezosAssetImage, TezosAssetImageProps, EvmAssetImage, EvmAssetImageProps } from './AssetImage';

export const TezosAssetIcon = memo<TezosAssetImageProps>(props => (
  <TezosAssetImage Loader={TezosAssetIconPlaceholder} Fallback={TezosAssetIconPlaceholder} {...props} />
));

export const TezosAssetIconPlaceholder: TezosAssetImageProps['Fallback'] = memo(
  ({ metadata, size, className, style }) =>
    metadata && isTezosCollectibleMetadata(metadata) ? (
      <CollectiblePlaceholderSvg className={className} style={style} width={size} height={size} />
    ) : (
      <IdenticonInitials
        value={getAssetSymbol(metadata)}
        className={className}
        style={style}
        width={size}
        height={size}
      />
    )
);

const ICON_DEFAULT_SIZE = 40;
const ASSET_IMAGE_DEFAULT_SIZE = 30;
const NETWORK_IMAGE_DEFAULT_SIZE = 16;

export const TezosTokenIconWithNetwork = memo<TezosAssetImageProps>(({ tezosChainId, className, style, ...props }) => {
  const network = useTezosChainByChainId(tezosChainId);

  return (
    <div
      className={clsx('flex items-center justify-center relative', className)}
      style={{ width: ICON_DEFAULT_SIZE, height: ICON_DEFAULT_SIZE, ...style }}
    >
      <TezosAssetIcon tezosChainId={tezosChainId} size={ASSET_IMAGE_DEFAULT_SIZE} className="rounded-full" {...props} />

      {network && (
        <TezosNetworkLogo
          size={NETWORK_IMAGE_DEFAULT_SIZE}
          chainId={network.chainId}
          className="absolute bottom-0 right-0"
          withTooltip
        />
      )}
    </div>
  );
});

export const EvmAssetIcon = memo<EvmAssetImageProps>(props => (
  <EvmAssetImage Loader={EvmAssetIconPlaceholder} Fallback={EvmAssetIconPlaceholder} {...props} />
));

export const EvmAssetIconPlaceholder: EvmAssetImageProps['Fallback'] = memo(({ metadata, size, className, style }) =>
  metadata && isEvmCollectibleMetadata(metadata) ? (
    <CollectiblePlaceholderSvg className={className} style={style} width={size} height={size} />
  ) : (
    <IdenticonInitials
      value={getAssetSymbol(metadata)}
      className={className}
      style={style}
      width={size}
      height={size}
    />
  )
);

export const EvmAssetIconWithNetwork = memo<EvmAssetImageProps>(({ evmChainId, className, style, ...props }) => {
  const network = useEvmChainByChainId(evmChainId);

  return (
    <div
      className={clsx('flex items-center justify-center relative', className)}
      style={{ width: ICON_DEFAULT_SIZE, height: ICON_DEFAULT_SIZE, ...style }}
    >
      <EvmAssetIcon evmChainId={evmChainId} size={ASSET_IMAGE_DEFAULT_SIZE} className="rounded-full" {...props} />

      {network && (
        <EvmNetworkLogo
          chainId={network.chainId}
          size={NETWORK_IMAGE_DEFAULT_SIZE}
          className="absolute bottom-0 right-0"
          withTooltip
        />
      )}
    </div>
  );
});
