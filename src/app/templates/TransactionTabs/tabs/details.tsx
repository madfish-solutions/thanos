import React, { FC, ReactNode, useMemo } from 'react';

import { isDefined } from '@rnw-community/shared';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';

import { IconBase } from 'app/atoms';
import Money from 'app/atoms/Money';
import { EvmNetworkLogo, TezosNetworkLogo } from 'app/atoms/NetworkLogo';
import { ReactComponent as ChevronRightIcon } from 'app/icons/base/chevron_right.svg';
import InFiat from 'app/templates/InFiat';
import { T } from 'lib/i18n';
import { getAssetSymbol, TEZOS_METADATA } from 'lib/metadata';
import { OneOfChains } from 'temple/front/chains';
import { TempleChainKind } from 'temple/types';

interface Props {
  network: OneOfChains;
  assetSlug: string;
  goToFeeTab: EmptyFn;
  displayedFee?: string;
  displayedStorageFee?: string;
  destinationName: ReactNode;
  destinationValue: ReactNode;
}

export const DetailsTab: FC<Props> = ({
  network,
  assetSlug,
  destinationName,
  destinationValue,
  displayedFee,
  displayedStorageFee,
  goToFeeTab
}) => {
  const { kind: chainKind, chainId } = network;

  return (
    <div className="flex flex-col px-4 py-2 mb-6 rounded-lg shadow-bottom border-0.5 border-transparent">
      <div className="py-2 flex flex-row justify-between items-center border-b-0.5 border-lines">
        <p className="p-1 text-font-description text-grey-1">
          <T id="network" />
        </p>
        <div className="flex flex-row items-center">
          <span className="p-1 text-font-description-bold">{network.name}</span>
          {chainKind === TempleChainKind.EVM ? (
            <EvmNetworkLogo chainId={chainId} />
          ) : (
            <TezosNetworkLogo chainId={chainId} />
          )}
        </div>
      </div>

      {(isDefined(destinationName) || isDefined(destinationValue)) && (
        <div className="py-2 flex flex-row justify-between items-center border-b-0.5 border-lines">
          <p className="p-1 text-font-description text-grey-1">{destinationName}</p>
          {destinationValue}
        </div>
      )}

      <div
        className={clsx(
          'py-2 flex flex-row justify-between items-center',
          displayedStorageFee && 'border-b-0.5 border-lines'
        )}
      >
        <p className="p-1 text-font-description text-grey-1">
          <T id="gasFee" />
        </p>
        <div className="flex flex-row items-center">
          <FeesInfo network={network} assetSlug={assetSlug} amount={displayedFee} goToFeeTab={goToFeeTab} />
        </div>
      </div>
      {displayedStorageFee && (
        <div className="py-2 flex flex-row justify-between items-center">
          <p className="p-1 text-font-description text-grey-1">Storage Fee</p>
          <div className="flex flex-row items-center">
            <FeesInfo network={network} assetSlug={assetSlug} amount={displayedStorageFee} goToFeeTab={goToFeeTab} />
          </div>
        </div>
      )}
    </div>
  );
};

interface FeesInfoProps {
  network: OneOfChains;
  assetSlug: string;
  goToFeeTab: EmptyFn;
  amount?: string;
}

const FeesInfo: FC<FeesInfoProps> = ({ network, assetSlug, amount = '0.00', goToFeeTab }) => {
  const isEvm = network.kind === TempleChainKind.EVM;

  const nativeAssetSymbol = useMemo(() => getAssetSymbol(isEvm ? network.currency : TEZOS_METADATA), [isEvm, network]);

  return (
    <>
      <div className="p-1 text-font-num-bold-12">
        <InFiat
          chainId={network.chainId}
          assetSlug={assetSlug}
          volume={amount}
          smallFractionFont={false}
          roundingMode={BigNumber.ROUND_FLOOR}
          evm={isEvm}
        >
          {({ balance, symbol }) => (
            <span className="pr-1 border-r-1.5 border-lines">
              {symbol}
              {balance}
            </span>
          )}
        </InFiat>
        <span className="pl-1">
          <Money smallFractionFont={false} tooltipPlacement="bottom">
            {amount}
          </Money>{' '}
          {nativeAssetSymbol}
        </span>
      </div>
      <IconBase Icon={ChevronRightIcon} className="text-primary cursor-pointer" onClick={goToFeeTab} />
    </>
  );
};
