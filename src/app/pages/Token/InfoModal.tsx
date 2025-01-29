/* TODO: DRY between Tezos & EVM */

import React, { FC, memo, ReactNode, useMemo } from 'react';

import clsx from 'clsx';

import { Divider, IconBase, Money } from 'app/atoms';
import { HashChip } from 'app/atoms/HashChip';
import { EvmNetworkLogo, TezosNetworkLogo } from 'app/atoms/NetworkLogo';
import { ReactComponent as InfoFillSvg } from 'app/icons/base/InfoFill.svg';
import { fetchTokenMarketInfo } from 'lib/apis/coingecko';
import { fromAssetSlug, isFA2Token, isTezAsset } from 'lib/assets';
import { fromAssetSlugWithStandardDetect } from 'lib/assets/contract.utils';
import { useAssetFiatCurrencyPrice, useFiatCurrency, useFiatToUsdRate } from 'lib/fiat-currency';
import { t } from 'lib/i18n';
import { AssetMetadataBase, getTokenName } from 'lib/metadata';
import { EvmAssetMetadataBase } from 'lib/metadata/types';
import { useRetryableSWR, useTypedSWR } from 'lib/swr';
import useTippy, { UseTippyOptions } from 'lib/ui/useTippy';
import { isEvmNativeTokenSlug } from 'lib/utils/evm.utils';
import { useTezosChainByChainId } from 'temple/front';
import { BasicChain, OneOfChains, useEvmChainByChainId } from 'temple/front/chains';
import { getReadOnlyTezos } from 'temple/tezos';
import { TempleChainKind } from 'temple/types';

interface TezosInfoModalProps {
  assetSlug: string;
  chainId: string;
  assetMetadata: AssetMetadataBase | undefined;
}

export const TezosInfoModalContent = memo<TezosInfoModalProps>(({ assetSlug, chainId, assetMetadata }) => {
  const assetName = getTokenName(assetMetadata);

  const [contractAddress] = fromAssetSlug(assetSlug);

  const chain = useTezosChainByChainId(chainId);

  // TODO: Refactor. Maybe only detect standard?
  const { data: asset } = useRetryableSWR(
    chain ? ['asset', assetSlug, chain.rpcBaseURL] : null,
    () => fromAssetSlugWithStandardDetect(getReadOnlyTezos(chain!.rpcBaseURL), assetSlug),
    { suspense: true }
  );

  return (
    <>
      <div className="p-1 mb-1">
        <span className="text-font-description-bold">About {assetName}</span>
      </div>

      <MainInfoListBlock
        contract={contractAddress}
        tokenId={asset && isFA2Token(asset) ? asset.id : undefined}
        decimals={assetMetadata?.decimals}
        symbol={assetMetadata?.symbol}
        network={chain}
        forGasToken={isTezAsset(assetSlug)}
      />

      <div className="p-1 mb-1">
        <span className="text-font-description-bold">More Info</span>
      </div>

      <MoreInfoListBlock assetSlug={assetSlug} chainId={chainId} />
    </>
  );
});

interface EvmInfoModalProps {
  assetSlug: string;
  chainId: number;
  assetMetadata: EvmAssetMetadataBase | undefined;
}

export const EvmInfoModalContent = memo<EvmInfoModalProps>(({ assetSlug, chainId, assetMetadata }) => {
  const assetName = getTokenName(assetMetadata);

  const [contractAddress] = fromAssetSlug(assetSlug);

  const chain = useEvmChainByChainId(chainId);

  return (
    <>
      <div className="p-1 mb-1">
        <span className="text-font-description-bold">About {assetName}</span>
      </div>

      <MainInfoListBlock
        contract={contractAddress}
        decimals={assetMetadata?.decimals}
        symbol={assetMetadata?.symbol}
        network={chain}
        forGasToken={isEvmNativeTokenSlug(assetSlug)}
      />

      <div className="p-1 mb-1">
        <span className="text-font-description-bold">More Info</span>
      </div>

      <MoreInfoListBlock assetSlug={assetSlug} chainId={chainId} forEVM />
    </>
  );
});

const LIST_BLOCK_CLASSNAME = 'flex flex-col px-4 py-2 rounded-8 bg-white shadow-bottom';
const LIST_BLOCK_ITEM_DATA_SPAN_CLASSNAME = 'p-1 text-font-num-bold-12';

const MainInfoListBlock = memo<{
  contract: string;
  tokenId?: string;
  decimals?: number;
  symbol?: string;
  network?: OneOfChains | null;
  forGasToken?: boolean;
}>(({ contract, tokenId, decimals, symbol, network, forGasToken }) => {
  const networkName = useMemo(() => (network?.nameI18nKey ? t(network.nameI18nKey) : network?.name), [network]);

  return (
    <div className={clsx(LIST_BLOCK_CLASSNAME, 'mb-4')}>
      <ListBlockItem
        title="Network"
        rightSideJsx={
          <div className="flex items-center gap-x-0.5">
            <span className={LIST_BLOCK_ITEM_DATA_SPAN_CLASSNAME}>{networkName || '-'}</span>

            {!network ? null : network.kind === TempleChainKind.Tezos ? (
              <TezosNetworkLogo chainId={network.chainId} size={16} />
            ) : (
              <EvmNetworkLogo chainId={network.chainId} size={16} />
            )}
          </div>
        }
        divide={false}
      />

      <ListBlockItem
        title="Contract Address"
        rightSideJsx={forGasToken ? <ListBlockItemGasTokenContractData /> : <HashChip hash={contract} />}
      />

      <ListBlockItem
        title="Decimals"
        rightSideJsx={<span className={LIST_BLOCK_ITEM_DATA_SPAN_CLASSNAME}>{decimals ?? '-'}</span>}
      />

      {tokenId && (
        <ListBlockItem
          title="Token ID"
          rightSideJsx={<span className={LIST_BLOCK_ITEM_DATA_SPAN_CLASSNAME}>{tokenId}</span>}
        />
      )}

      {symbol && (
        <ListBlockItem
          title="Symbol"
          rightSideJsx={<span className={LIST_BLOCK_ITEM_DATA_SPAN_CLASSNAME}>{symbol}</span>}
        />
      )}
    </div>
  );
});

const MoreInfoListBlock = memo<{
  assetSlug: string;
  chainId: string | number;
  forEVM?: boolean;
}>(({ assetSlug, chainId, forEVM }) => {
  const { selectedFiatCurrency } = useFiatCurrency();
  const fiatToUsdRate = useFiatToUsdRate();

  const fiatSymbol = selectedFiatCurrency.symbol;

  const price = useAssetFiatCurrencyPrice(assetSlug, chainId, forEVM);

  const { data: assetMarketInfo } = useTypedSWR(
    ['asset-market-info', assetSlug, chainId, forEVM],
    () => {
      const chain: BasicChain = forEVM
        ? { kind: TempleChainKind.EVM, chainId: Number(chainId) }
        : { kind: TempleChainKind.Tezos, chainId: String(chainId) };

      return fetchTokenMarketInfo(assetSlug, chain);
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      refreshInterval: 60_000,
      dedupingInterval: 60_000
    }
  );

  const volume24H = useMemo(() => {
    const dollarValue = assetMarketInfo?.total_volume;

    if (dollarValue == null || fiatToUsdRate == null) return null;

    return dollarValue * fiatToUsdRate;
  }, [fiatToUsdRate, assetMarketInfo?.total_volume]);

  return (
    <div className={LIST_BLOCK_CLASSNAME}>
      <ListBlockItem
        title="Current price"
        rightSideJsx={
          <span className={LIST_BLOCK_ITEM_DATA_SPAN_CLASSNAME}>
            {!price.isZero() ? (
              <>
                <span className="mr-0.5">{fiatSymbol}</span>

                <Money smallFractionFont={false} cryptoDecimals={4}>
                  {price}
                </Money>
              </>
            ) : (
              'No value'
            )}
          </span>
        }
        divide={false}
      />

      <ListBlockItem
        title="Volume (24h)"
        rightSideJsx={
          <span className={LIST_BLOCK_ITEM_DATA_SPAN_CLASSNAME}>
            {volume24H ? (
              <>
                <span className="mr-0.5">{fiatSymbol}</span>

                <Money smallFractionFont={false}>{volume24H}</Money>
              </>
            ) : (
              'No value'
            )}
          </span>
        }
      />
    </div>
  );
});

const ListBlockItem: FC<{ title: string; rightSideJsx: ReactNode; divide?: boolean }> = ({
  title,
  rightSideJsx,
  divide = true
}) => {
  return (
    <>
      {divide && <Divider />}

      <div className="flex items-center justify-between pl-1 gap-x-2 min-h-12">
        <span className="text-font-description text-grey-1">{title}</span>

        {rightSideJsx}
      </div>
    </>
  );
};

const ListBlockItemGasTokenContractData = memo(() => {
  const basicTooltipProps = useMemo<UseTippyOptions>(
    () => ({
      trigger: 'mouseenter',
      hideOnClick: true,
      animation: 'shift-away-subtle',
      placement: 'bottom-start',
      content: 'Gas tokens don’t have contract address',
      offset: [10, 4]
    }),
    []
  );

  const tooltipWrapperRef = useTippy<HTMLDivElement>(basicTooltipProps);

  return (
    <div className="flex items-center gap-x-0.5">
      <span className={LIST_BLOCK_ITEM_DATA_SPAN_CLASSNAME}>Gas Token</span>

      <IconBase ref={tooltipWrapperRef} Icon={InfoFillSvg} className="-m-1 text-grey-2" />
    </div>
  );
});
