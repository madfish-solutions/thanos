import React, { FC, memo, useMemo } from 'react';

import clsx from 'clsx';
import type { Placement } from 'tippy.js';

import BinanceSmartChainIconSrc from 'app/icons/networks/bsc.svg?url';
import EthereumIconSrc from 'app/icons/networks/ethereum.svg?url';
import OptimismIconSrc from 'app/icons/networks/optimism.svg?url';
import PolygonIconSrc from 'app/icons/networks/polygon.svg?url';
import { t } from 'lib/i18n';
import { getEvmNativeAssetIcon } from 'lib/images-uri';
import { TEZOS_MAINNET_CHAIN_ID } from 'lib/temple/types';
import useTippy, { UseTippyOptions } from 'lib/ui/useTippy';
import { useTezosChainByChainId } from 'temple/front';
import { useEvmChainByChainId } from 'temple/front/chains';

import { IdenticonInitials } from './Identicon';
import { TezNetworkLogo } from './NetworksLogos';

const logosRecord: Record<number, string> = {
  1: EthereumIconSrc,
  56: BinanceSmartChainIconSrc,
  137: PolygonIconSrc,
  10: OptimismIconSrc
};

interface TezosNetworkLogoProps {
  chainId: string;
  size?: number;
  className?: string;
  withTooltip?: boolean;
  tooltipPlacement?: Placement;
}

export const TezosNetworkLogo = memo<TezosNetworkLogoProps>(
  ({ chainId, size = 24, className, withTooltip, tooltipPlacement }) => {
    const chain = useTezosChainByChainId(chainId);
    const networkName = useMemo(() => (chain?.nameI18nKey ? t(chain.nameI18nKey) : chain?.name), [chain]);

    const withoutTooltipClassName = withTooltip ? undefined : className;

    const logoJsx =
      chainId === TEZOS_MAINNET_CHAIN_ID ? (
        <TezNetworkLogo size={size} className={withoutTooltipClassName} />
      ) : (
        <NetworkLogoFallback networkName={networkName} size={size} className={withoutTooltipClassName} />
      );

    return withTooltip ? (
      <WithTooltipWrap title={networkName ?? 'Unknown Network'} className={className} placement={tooltipPlacement}>
        {logoJsx}
      </WithTooltipWrap>
    ) : (
      logoJsx
    );
  }
);

interface EvmNetworkLogoProps {
  chainId: number;
  size?: number;
  chainName?: string;
  className?: string;
  imgClassName?: string;
  withTooltip?: boolean;
  tooltipPlacement?: Placement;
}

export const EvmNetworkLogo = memo<EvmNetworkLogoProps>(
  ({ chainId, size = 24, chainName, className, imgClassName, withTooltip, tooltipPlacement }) => {
    const source = useMemo(() => logosRecord[chainId] || getEvmNativeAssetIcon(chainId, size * 2), [chainId, size]);

    const chain = useEvmChainByChainId(chainId);
    const networkName = useMemo(
      () => chainName || (chain?.nameI18nKey ? t(chain.nameI18nKey) : chain?.name),
      [chainName, chain]
    );

    const withoutTooltipClassName = withTooltip ? undefined : className;

    const logoJsx = source ? (
      <img
        src={source}
        alt={networkName}
        width={size}
        height={size}
        className={clsx('border border-lines bg-white rounded-full', withoutTooltipClassName, imgClassName)}
      />
    ) : (
      <NetworkLogoFallback networkName={networkName} size={size} className={withoutTooltipClassName} />
    );

    return withTooltip ? (
      <WithTooltipWrap title={networkName} className={className} placement={tooltipPlacement}>
        {logoJsx}
      </WithTooltipWrap>
    ) : (
      logoJsx
    );
  }
);
interface NetworkLogoFallbackProps {
  networkName?: string;
  size?: number;
  className?: string;
}

const NetworkLogoFallback = memo<NetworkLogoFallbackProps>(({ networkName, size = 24, className }) => (
  <div
    style={{ width: size, height: size }}
    className={clsx('p-px border border-grey-4 bg-white rounded-full overflow-hidden', className)}
  >
    <IdenticonInitials value={networkName?.at(0) ?? '?'} className="w-full h-full rounded-full" />
  </div>
));

interface WithTooltipWrapProps {
  title?: string;
  className?: string;
  placement?: Placement;
}

const WithTooltipWrap: FC<PropsWithChildren<WithTooltipWrapProps>> = ({
  className,
  title,
  placement = 'bottom-start',
  children
}) => {
  const tippyProps = useMemo<UseTippyOptions>(
    () => ({
      trigger: 'mouseenter',
      hideOnClick: false,
      content: title ?? 'Unknown Network',
      animation: 'shift-away-subtle',
      placement
    }),
    [title, placement]
  );

  const networkIconRef = useTippy<HTMLDivElement>(tippyProps);

  return (
    <div ref={networkIconRef} className={className}>
      {children}
    </div>
  );
};
