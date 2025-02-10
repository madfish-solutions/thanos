import React, { memo } from 'react';

import clsx from 'clsx';

import { Button, IconBase } from 'app/atoms';
import Money from 'app/atoms/Money';
import { ReactComponent as CompactDown } from 'app/icons/base/compact_down.svg';
import { EvmAssetIconWithNetwork, TezosTokenIconWithNetwork } from 'app/templates/AssetIcon';
import { EvmBalance, TezosBalance } from 'app/templates/Balance';
import { setAnotherSelector, setTestID, TestIDProperty } from 'lib/analytics';
import { T } from 'lib/i18n';
import { getAssetSymbol, useEvmCategorizedAssetMetadata, useCategorizedTezosAssetMetadata } from 'lib/metadata';
import { EvmChain, OneOfChains, TezosChain } from 'temple/front';
import { TempleChainKind } from 'temple/types';

interface SelectAssetButtonProps extends TestIDProperty {
  selectedAssetSlug: string;
  network: OneOfChains;
  accountPkh: string | HexString;
  onClick: EmptyFn;
  className?: string;
}

export const SelectAssetButton = memo<SelectAssetButtonProps>(
  ({ selectedAssetSlug, network, accountPkh, onClick, className, testID }) => (
    <Button
      className={clsx(
        'cursor-pointer flex justify-between items-center py-1.5 px-3 rounded-lg shadow-bottom border-0.5 border-transparent hover:border-lines',
        className
      )}
      onClick={onClick}
    >
      <div
        className="flex justify-center items-center"
        {...setTestID(testID)}
        {...setAnotherSelector('slug', selectedAssetSlug)}
      >
        {network.kind === TempleChainKind.Tezos ? (
          <TezosContent network={network} accountPkh={accountPkh} assetSlug={selectedAssetSlug} />
        ) : (
          <EvmContent network={network} accountPkh={accountPkh as HexString} assetSlug={selectedAssetSlug} />
        )}
      </div>
      <IconBase Icon={CompactDown} className="text-primary" size={16} />
    </Button>
  )
);

interface TezosContentProps {
  network: TezosChain;
  accountPkh: string;
  assetSlug: string;
}

const TezosContent = memo<TezosContentProps>(({ network, accountPkh, assetSlug }) => {
  const metadata = useCategorizedTezosAssetMetadata(assetSlug, network.chainId);

  return (
    <>
      <TezosTokenIconWithNetwork tezosChainId={network.chainId} assetSlug={assetSlug} />

      <TezosBalance network={network} assetSlug={assetSlug} address={accountPkh}>
        {balance => (
          <div className="flex flex-col items-start ml-2">
            <span className="text-font-description-bold mb-0.5">{getAssetSymbol(metadata)}</span>

            <span className="text-font-num-12 text-grey-1">
              <Money smallFractionFont={false}>{balance}</Money>
              <span className="ml-0.5">
                <T id="available" />
              </span>
            </span>
          </div>
        )}
      </TezosBalance>
    </>
  );
});

interface EvmContentProps {
  network: EvmChain;
  accountPkh: HexString;
  assetSlug: string;
}

const EvmContent = memo<EvmContentProps>(({ network, accountPkh, assetSlug }) => {
  const assetMetadata = useEvmCategorizedAssetMetadata(assetSlug, network.chainId);

  return (
    <>
      <EvmAssetIconWithNetwork evmChainId={network.chainId} assetSlug={assetSlug} />

      <EvmBalance network={network} address={accountPkh} assetSlug={assetSlug}>
        {balance => (
          <div className="flex flex-col items-start ml-2">
            <span className="text-font-description-bold mb-0.5">{getAssetSymbol(assetMetadata)}</span>

            <span className="text-font-num-12 text-grey-1">
              <Money smallFractionFont={false}>{balance}</Money>
              <span className="ml-0.5">
                <T id="available" />
              </span>
            </span>
          </div>
        )}
      </EvmBalance>
    </>
  );
});
