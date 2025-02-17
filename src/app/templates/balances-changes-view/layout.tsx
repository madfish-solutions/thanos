import React, { ReactNode, memo, useMemo } from 'react';

import BigNumber from 'bignumber.js';

import { T, toLocalFixed } from 'lib/i18n';
import { OneOfChains } from 'temple/front';
import { TempleChainKind } from 'temple/types';

import InFiat from '../InFiat';
import {
  OperationConfirmationCardRowVariant as BalancesChangesViewRowVariant,
  OperationConfirmationCard,
  OperationConfirmationCardRow
} from '../operation-confirmation-card';

interface BalancesChangesViewRowProps {
  assetSlug: string;
  chain: OneOfChains;
  volume: BigNumber;
  symbol?: string;
  variant: BalancesChangesViewRowVariant;
}

interface BalancesChangesViewLayoutProps {
  title: ReactNode;
  rows: BalancesChangesViewRowProps[];
}

const BalancesChangesViewRow = memo<BalancesChangesViewRowProps>(({ chain, symbol, volume, assetSlug, variant }) => {
  const allCollectibles = variant === BalancesChangesViewRowVariant.AllCollectibles;
  const formattedVolume = useMemo(() => `${volume.isPositive() ? '+' : ''}${toLocalFixed(volume)}`, [volume]);

  return (
    <OperationConfirmationCardRow
      chain={chain}
      assetSlug={assetSlug}
      variant={variant}
      amountClassName={volume.isPositive() ? 'text-success' : undefined}
      volume={formattedVolume}
      symbol={symbol}
      rightContent={
        !allCollectibles && (
          <span className="text-font-num-12 text-grey-1 ml-3 whitespace-nowrap">
            <InFiat
              volume={volume}
              chainId={chain.chainId}
              assetSlug={assetSlug}
              evm={chain.kind === TempleChainKind.EVM}
              smallFractionFont={false}
            >
              {({ balance, symbol, noPrice }) =>
                noPrice ? (
                  <T id="noValue" />
                ) : (
                  <>
                    {balance} {symbol}
                  </>
                )
              }
            </InFiat>
          </span>
        )
      }
    />
  );
});

export const BalancesChangesViewLayout = memo<BalancesChangesViewLayoutProps>(({ title, rows }) => (
  <OperationConfirmationCard title={title}>
    {rows.map((props, index) => (
      <BalancesChangesViewRow key={index} {...props} />
    ))}
  </OperationConfirmationCard>
));
