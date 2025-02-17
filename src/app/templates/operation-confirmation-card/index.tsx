import React, { FC, PropsWithChildren, ReactNode, memo, useMemo } from 'react';

import clsx from 'clsx';

import { T, t } from 'lib/i18n';
import useTippy, { UseTippyOptions } from 'lib/ui/useTippy';
import { EvmChain, TezosChain } from 'temple/front';
import { TempleChainKind } from 'temple/types';

import { EvmAssetIcon, EvmAssetIconPlaceholder, TezosAssetIcon, TezosAssetIconPlaceholder } from '../AssetIcon';
import { ShortenedTextWithTooltip } from '../shortened-text-with-tooltip';

import { ReactComponent as UnknownToken } from './unknown-token.svg';

const CollectibleIconFallback = memo<{ size?: number }>(({ size = 24 }) => (
  <UnknownToken style={{ width: size, height: size }} />
));

interface OperationConfirmationCardProps {
  title: ReactNode | ReactNode[];
}

export const OperationConfirmationCard: FC<PropsWithChildren<OperationConfirmationCardProps>> = ({
  title,
  children
}) => (
  <div className="bg-white p-4 shadow-bottom rounded-lg flex flex-col gap-3">
    <p className="text-font-description-bold text-grey-1">{title}</p>
    <div className="flex flex-col gap-2">{children}</div>
  </div>
);

export enum OperationConfirmationCardRowVariant {
  Token = 'Token',
  Collectible = 'Collectibles',
  AllCollectibles = 'AllCollectibles'
}

interface OperationConfirmationCardRowProps {
  chain: Pick<TezosChain, 'chainId' | 'kind'> | Pick<EvmChain, 'chainId' | 'kind'>;
  assetSlug: string;
  variant: OperationConfirmationCardRowVariant;
  amountClassName?: string;
  volume: string;
  symbol?: string;
  rightContent?: ReactNode;
}

const unknownTokenTippyOptions: UseTippyOptions = {
  trigger: 'mouseenter',
  hideOnClick: false,
  animation: 'shift-away-subtle',
  content: t('unknownToken')
};

export const OperationConfirmationCardRow = memo<OperationConfirmationCardRowProps>(
  ({ chain, assetSlug, variant, amountClassName, volume, symbol, rightContent }) => {
    const allCollectibles = variant === OperationConfirmationCardRowVariant.AllCollectibles;
    const isCollectible = allCollectibles || variant === OperationConfirmationCardRowVariant.Collectible;
    const tippyRef = useTippy<HTMLSpanElement>(unknownTokenTippyOptions);

    const icon = useMemo(
      () =>
        chain.kind === TempleChainKind.EVM ? (
          <EvmAssetIcon
            evmChainId={chain.chainId}
            assetSlug={assetSlug}
            size={allCollectibles ? 36 : 24}
            Fallback={isCollectible ? CollectibleIconFallback : EvmAssetIconPlaceholder}
          />
        ) : (
          <TezosAssetIcon
            tezosChainId={chain.chainId}
            assetSlug={assetSlug}
            size={allCollectibles ? 36 : 24}
            Fallback={isCollectible ? CollectibleIconFallback : TezosAssetIconPlaceholder}
          />
        ),
      [allCollectibles, assetSlug, chain.chainId, chain.kind, isCollectible]
    );

    return (
      <div className={clsx('flex items-center', allCollectibles ? 'gap-2' : 'gap-1')}>
        {icon}
        <div className={clsx('flex flex-1 gap-1 items-center text-font-num-bold-16 min-w-0', amountClassName)}>
          {isCollectible ? (
            <>
              <span>{volume}</span>
              <ShortenedTextWithTooltip>{symbol ?? t('unknownToken')}</ShortenedTextWithTooltip>
            </>
          ) : (
            <>
              <ShortenedTextWithTooltip>{volume}</ShortenedTextWithTooltip>
              <span className="whitespace-nowrap">
                {symbol ??
                  (isCollectible ? (
                    <T id="unknownToken" />
                  ) : (
                    <span ref={tippyRef}>
                      <T id="unknownTokenAcronym" />
                    </span>
                  ))}
              </span>
            </>
          )}
        </div>
        {rightContent}
      </div>
    );
  }
);
