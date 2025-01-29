import React, { FC, memo, ReactNode, useMemo } from 'react';

import BigNumber from 'bignumber.js';

import Money from 'app/atoms/Money';
import { DeadEndBoundaryError } from 'app/ErrorBoundary';
import { useEvmTokenMetadataSelector } from 'app/store/evm/tokens-metadata/selectors';
import { EvmAssetIconWithNetwork, TezosTokenIconWithNetwork } from 'app/templates/AssetIcon';
import { EvmBalance, TezosBalance } from 'app/templates/Balance';
import InFiat from 'app/templates/InFiat';
import { setAnotherSelector, setTestID } from 'lib/analytics';
import { t } from 'lib/i18n';
import { getTokenName, getAssetSymbol, AssetMetadataBase } from 'lib/metadata';
import { isEvmNativeTokenSlug } from 'lib/utils/evm.utils';
import { useAccountAddressForEvm, useAccountAddressForTezos, useTezosChainByChainId } from 'temple/front';
import { OneOfChains, useEvmChainByChainId } from 'temple/front/chains';

import { TokenPageSelectors } from './selectors';
import { TokenPrice } from './TokenPrice';

interface TezosAssetBannerProps {
  tezosChainId: string;
  assetSlug: string;
  metadata: AssetMetadataBase | undefined;
}

export const TezosAssetBanner = memo<TezosAssetBannerProps>(({ tezosChainId, assetSlug, metadata: assetMetadata }) => {
  const accountTezAddress = useAccountAddressForTezos();
  const network = useTezosChainByChainId(tezosChainId);

  if (!accountTezAddress || !network) throw new DeadEndBoundaryError();

  const assetName = getTokenName(assetMetadata);
  const assetSymbol = getAssetSymbol(assetMetadata);

  return (
    <>
      <div className="flex items-center gap-x-1">
        <TezosTokenIconWithNetwork tezosChainId={tezosChainId} assetSlug={assetSlug} size={40} className="shrink-0" />

        <NamesComp assetName={assetName} network={network} />

        <TokenPrice assetSlug={assetSlug} chainId={tezosChainId} />
      </div>

      <div className="flex flex-col">
        <TezosBalance network={network} address={accountTezAddress} assetSlug={assetSlug}>
          {balance => (
            <>
              <AmountComp balance={balance} assetSymbol={assetSymbol} />

              <InFiat chainId={tezosChainId} assetSlug={assetSlug} volume={balance} smallFractionFont={false}>
                {({ balance, symbol }) => <FiatValueComp balance={balance} symbol={symbol} />}
              </InFiat>
            </>
          )}
        </TezosBalance>
      </div>
    </>
  );
});

interface EvmAssetBannerProps {
  evmChainId: number;
  assetSlug: string;
}

export const EvmAssetBanner = memo<EvmAssetBannerProps>(({ evmChainId, assetSlug }) => {
  const accountEvmAddress = useAccountAddressForEvm();
  const network = useEvmChainByChainId(evmChainId);

  if (!accountEvmAddress || !network) throw new DeadEndBoundaryError();

  const tokenMetadata = useEvmTokenMetadataSelector(evmChainId, assetSlug);

  const metadata = isEvmNativeTokenSlug(assetSlug) ? network.currency : tokenMetadata;

  const assetName = getTokenName(metadata);
  const assetSymbol = getAssetSymbol(metadata);

  return (
    <>
      <div className="flex items-center gap-x-1">
        <EvmAssetIconWithNetwork evmChainId={evmChainId} assetSlug={assetSlug} size={40} className="shrink-0" />

        <NamesComp assetName={assetName} network={network} />

        <TokenPrice assetSlug={assetSlug} chainId={evmChainId} forEVM />
      </div>

      <div className="flex flex-col">
        <EvmBalance network={network} address={accountEvmAddress} assetSlug={assetSlug}>
          {balance => (
            <>
              <AmountComp balance={balance} assetSymbol={assetSymbol} />

              <InFiat evm chainId={evmChainId} assetSlug={assetSlug} volume={balance} smallFractionFont={false}>
                {({ balance, symbol }) => <FiatValueComp balance={balance} symbol={symbol} />}
              </InFiat>
            </>
          )}
        </EvmBalance>
      </div>
    </>
  );
});

const NamesComp: FC<{ assetName: string; network: OneOfChains }> = ({ assetName, network }) => {
  const networkName = useMemo(() => (network.nameI18nKey ? t(network.nameI18nKey) : network.name), [network]);

  return (
    <div className="flex-grow flex flex-col gap-y-1 pr-6">
      <span
        className="text-font-medium-bold"
        {...setTestID(TokenPageSelectors.tokenName)}
        {...setAnotherSelector('name', assetName)}
      >
        {assetName}
      </span>

      <span className="text-font-description">{networkName}</span>
    </div>
  );
};

const AmountComp: FC<{ balance: BigNumber; assetSymbol: string }> = ({ balance, assetSymbol }) => (
  <div className="text-2xl leading-9 font-medium">
    <Money smallFractionFont={false} fiat>
      {balance}
    </Money>
    <span className="ml-1">{assetSymbol}</span>
  </div>
);

const FiatValueComp: FC<{ balance: ReactNode; symbol: string }> = ({ balance, symbol }) => (
  <div className="text-font-num-14 text-grey-1 flex">
    <span>≈</span>
    {balance}
    <span className="ml-0.5">{symbol}</span>
  </div>
);
