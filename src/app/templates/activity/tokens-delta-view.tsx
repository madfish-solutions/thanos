import React, { memo, useMemo } from 'react';

import { isDefined } from '@rnw-community/shared';
import { TokenDelta } from '@temple-wallet/transactions-parser';
import BigNumber from 'bignumber.js';
import classNames from 'clsx';

import Money from 'app/atoms/Money';
import { AssetIcon } from 'app/templates/AssetIcon';
import { useManyAssetsFiatCurrencyPrices, useFiatCurrency } from 'lib/fiat-currency';
import { t } from 'lib/i18n';
import { getAssetSymbol, isCollectible, useManyAssetsMetadata } from 'lib/metadata';
import { atomsToTokens } from 'lib/temple/helpers';

interface Props {
  tokensDeltas: TokenDelta[] | TokenDelta;
  shouldShowNFTCard: boolean;
  isTotal: boolean;
}

const ZERO = new BigNumber(0);
const MAX_DISPLAYED_NFT_CHARS = 15;

export const TokensDeltaView = memo<Props>(({ tokensDeltas, shouldShowNFTCard, isTotal }) => {
  const { selectedFiatCurrency } = useFiatCurrency();
  const validatedTokensDeltas = useMemo(
    () => (Array.isArray(tokensDeltas) ? tokensDeltas : [tokensDeltas]),
    [tokensDeltas]
  );
  const assetsSlugs = useMemo(() => validatedTokensDeltas.map(({ tokenSlug }) => tokenSlug), [tokensDeltas]);
  const assetsMetadata = useManyAssetsMetadata(assetsSlugs);
  const fiatCurrencyPrices = useManyAssetsFiatCurrencyPrices(assetsSlugs);
  const assetsSymbolsOrNames = useMemo(
    () =>
      assetsMetadata.map(metadata => {
        if (isDefined(metadata) && isCollectible(metadata)) {
          const { name } = metadata;

          return name.length > MAX_DISPLAYED_NFT_CHARS ? `${name.slice(0, MAX_DISPLAYED_NFT_CHARS)}…` : name;
        }

        return getAssetSymbol(metadata, true);
      }),
    [assetsMetadata]
  );

  const firstAssetSlug = assetsSlugs[0];
  const firstAtomicDiff = validatedTokensDeltas[0]?.atomicAmount ?? ZERO;
  const firstAssetMetadata = assetsMetadata[0];
  const firstAssetSymbolOrName = assetsSymbolsOrNames[0];
  const firstDiff = useMemo(
    () => atomsToTokens(firstAtomicDiff, firstAssetMetadata?.decimals ?? 0),
    [firstAtomicDiff, firstAssetMetadata]
  );
  const totalFiatAmount = useMemo(
    () =>
      validatedTokensDeltas
        .reduce(
          (acc, { atomicAmount }, index) =>
            acc.plus(
              atomsToTokens(atomicAmount, assetsMetadata[index]?.decimals ?? 0).times(fiatCurrencyPrices[index] ?? 0)
            ),
          new BigNumber(0)
        )
        .abs(),
    [tokensDeltas, fiatCurrencyPrices, assetsMetadata]
  );

  const conditionalDiffClassName = classNames(
    firstDiff.gt(0) ? 'text-green-500' : 'text-red-700',
    isTotal ? 'text-sm leading-tight' : 'text-xs leading-none'
  );
  const sign = firstDiff.gt(0) ? '+' : '-';
  const tokensCount = validatedTokensDeltas.length;

  if (tokensCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-row items-center">
      <div className="flex flex-1 flex-col items-right">
        <div className={classNames('inline-flex text-right font-medium', conditionalDiffClassName)}>
          {tokensCount === 1 && (
            <span>
              {sign}{' '}
              <Money forceUseFormattingThreshold smallFractionFont={false}>
                {firstDiff.abs()}
              </Money>{' '}
              {firstAssetSymbolOrName}
            </span>
          )}
          {tokensCount === 2 && `${sign} ${assetsSymbolsOrNames.join(t('listSeparation'))}`}
          {tokensCount > 2 && `${sign} ${t('tokenAndSeveralOthers', [firstAssetSymbolOrName, tokensCount - 1])}`}
        </div>
        <div className="text-gray-500 text-xs leading-5 text-right">
          <Money fiat smallFractionFont={false}>
            {totalFiatAmount}
          </Money>{' '}
          {selectedFiatCurrency.symbol}
        </div>
      </div>
      {/* TODO: implement plugs for broken images and audio only NFTs, and handle many other cases */}
      {shouldShowNFTCard && isDefined(firstAssetMetadata) && isCollectible(firstAssetMetadata) && (
        <AssetIcon assetSlug={firstAssetSlug} className="ml-2 rounded-lg border border-gray-300 w-9 h-9" size={36} />
      )}
    </div>
  );
});