import React, { FC, memo, useMemo } from 'react';

import BigNumber from 'bignumber.js';
import clsx from 'clsx';

import { Identicon, Name, Money, OldStyleHashChip, Divider } from 'app/atoms';
import { useAppEnv } from 'app/env';
import { useStakedAmount } from 'app/hooks/use-baking-hooks';
import { BakingSectionSelectors } from 'app/pages/Home/OtherComponents/BakingSection/selectors';
import { toLocalFormat, T, toLocalFixed } from 'lib/i18n';
import { HELP_UKRAINE_BAKER_ADDRESS, RECOMMENDED_BAKER_ADDRESS } from 'lib/known-bakers';
import { getTezosGasMetadata } from 'lib/metadata';
import { useKnownBaker } from 'lib/temple/front';
import { atomsToTokens } from 'lib/temple/helpers';
import { AccountForTezos, findAccountForTezos } from 'temple/accounts';
import { useAllAccounts, useOnTezosBlock } from 'temple/front';
import { useBlockExplorerHref } from 'temple/front/block-explorers';
import { TezosNetworkEssentials } from 'temple/networks';
import { TempleChainKind } from 'temple/types';

import { OpenInExplorerChip, OpenInExplorerChipBase } from './OpenInExplorerChip';

interface Props {
  tezosChainId: string;
  accountPkh: string;
  bakerPkh: string;
  hideAddress?: boolean;
  showBakerTag?: boolean;
  className?: string;
  HeaderRight?: React.ComponentType;
}

export const BakerCard = memo<Props>(
  ({ tezosChainId, accountPkh, bakerPkh, hideAddress, showBakerTag, className, HeaderRight }) => {
    const allAccounts = useAllAccounts();
    const { fullPage } = useAppEnv();
    const { data: baker } = useKnownBaker(bakerPkh, tezosChainId);
    const { symbol } = getTezosGasMetadata(tezosChainId);

    const bakerAcc = useMemo(() => findAccountForTezos(allAccounts, bakerPkh), [allAccounts, bakerPkh]);

    const isRecommendedBaker = bakerPkh === RECOMMENDED_BAKER_ADDRESS;
    const isHelpUkraineBaker = bakerPkh === HELP_UKRAINE_BAKER_ADDRESS;
    const withBakerTag = showBakerTag && (isRecommendedBaker || isHelpUkraineBaker);

    if (!baker)
      return (
        <BakerHeader HeaderRight={HeaderRight} className={className}>
          <Identicon type="botttsneutral" hash={bakerPkh} size={32} className="self-start flex-shrink-0 shadow-xs" />

          {bakerAcc ? (
            <BakerName>
              <SelfBakerNameValue bakerAcc={bakerAcc} accountPkh={accountPkh} />
            </BakerName>
          ) : (
            <UnknownBakerName bakerPkh={bakerPkh} chainId={tezosChainId} />
          )}
        </BakerHeader>
      );

    return (
      <div className={clsx('flex flex-col gap-y-4 text-gray-700', className)}>
        <BakerHeader HeaderRight={HeaderRight}>
          <img src={baker.logo} alt={baker.name} className="flex-shrink-0 w-8 h-8 bg-white rounded shadow-xs" />

          <BakerName>{baker.name}</BakerName>

          {withBakerTag && <BakerTag recommended={isRecommendedBaker} />}

          {!hideAddress && (
            <OpenInExplorerChip
              entityType="address"
              tezosChainId={tezosChainId}
              hash={baker.address}
              small
              alternativeDesign
            />
          )}
        </BakerHeader>

        <div
          className={clsx(
            'flex flex-wrap items-center text-left text-xs leading-5 whitespace-nowrap text-gray-500',
            fullPage ? 'gap-x-8' : 'justify-between'
          )}
        >
          <div className="flex flex-col gap-y-1">
            <T id="staking" />:
            <span className="font-medium leading-none text-blue-750">
              <Money>{((baker.delegation.capacity - baker.delegation.freeSpace) / 1000).toFixed(0)}</Money>K
            </span>
          </div>

          <div className="flex flex-col gap-y-1">
            <T id="space" />:
            <span className="font-medium leading-none text-blue-750">
              <Money>{(baker.delegation.freeSpace / 1000).toFixed(0)}</Money>K
            </span>
          </div>

          <div className="flex flex-col gap-y-1">
            <T id="fee" />:
            <span className="font-medium leading-none text-blue-750">
              {toLocalFormat(new BigNumber(baker.delegation.fee).times(100), {
                decimalPlaces: 2
              })}
              %
            </span>
          </div>

          <div className="flex flex-col gap-y-1">
            <T id="minAmount" />:
            <span className="font-medium leading-none text-blue-750">
              <Money smallFractionFont={false}>{baker.delegation.minBalance}</Money> {symbol}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

export const BAKER_BANNER_CLASSNAME = 'p-4 rounded-lg border';

interface BakerBannerProps {
  network: TezosNetworkEssentials;
  accountPkh: string;
  bakerPkh: string;
  ActionButton?: React.ComponentType<PropComponentProps>;
  HeaderRight?: React.ComponentType<PropComponentProps>;
  allowDisplayZeroStake?: boolean;
}

interface PropComponentProps {
  /** Atomic value */
  staked: number;
}

export const BakerBanner = memo<BakerBannerProps>(
  ({ network, accountPkh, bakerPkh, ActionButton, HeaderRight, allowDisplayZeroStake }) => {
    const { rpcBaseURL, chainId } = network;

    const { data: stakedData, mutate } = useStakedAmount(rpcBaseURL, accountPkh);

    useOnTezosBlock(rpcBaseURL, () => void mutate());

    const { symbol, decimals } = getTezosGasMetadata(chainId);

    const [staked, stakedAtomic] = useMemo(() => {
      const staked = stakedData && stakedData.gt(0) ? atomsToTokens(stakedData, decimals) : null;
      const stakedAtomic = stakedData?.toNumber() || 0;

      return [staked, stakedAtomic] as const;
    }, [stakedData, decimals]);

    const displayingStaked = allowDisplayZeroStake || staked?.gt(0);

    const HeaderRightWithProps = useMemo<FC | undefined>(
      () => HeaderRight && (() => <HeaderRight staked={stakedAtomic} />),
      [HeaderRight, stakedAtomic]
    );

    return (
      <div className={clsx(BAKER_BANNER_CLASSNAME, 'flex flex-col gap-y-4')}>
        <BakerCard
          tezosChainId={chainId}
          accountPkh={accountPkh}
          bakerPkh={bakerPkh}
          HeaderRight={HeaderRightWithProps}
        />

        {(ActionButton || displayingStaked) && <Divider />}

        {displayingStaked && (
          <div className="text-sm text-blue-750">
            <span className="mr-1">Staked:</span>

            <span className="font-semibold">
              {staked ? (
                <Money smallFractionFont={false} cryptoDecimals={decimals}>
                  {staked}
                </Money>
              ) : (
                toLocalFixed(0, 2)
              )}

              {' ' + symbol}
            </span>
          </div>
        )}

        {ActionButton && <ActionButton staked={stakedAtomic} />}
      </div>
    );
  }
);

interface BakerHeaderProps extends PropsWithChildren {
  className?: string;
  HeaderRight?: React.ComponentType;
}

const BakerHeader: React.FC<BakerHeaderProps> = ({ className, HeaderRight, children }) => (
  <div className={clsx('flex items-center gap-x-2', className)}>
    {children}

    <div className="flex-grow flex-shrink-0 min-w-16 flex justify-end">{HeaderRight && <HeaderRight />}</div>
  </div>
);

const BakerName: React.FC<PropsWithChildren> = ({ children }) => (
  <Name className="text-ulg leading-none text-gray-910" testID={BakingSectionSelectors.delegatedBakerName}>
    {children}
  </Name>
);

const SelfBakerNameValue: React.FC<{
  bakerAcc: AccountForTezos;
  accountPkh: string;
}> = ({ bakerAcc, accountPkh }) => (
  <>
    {bakerAcc.name}

    {bakerAcc.address === accountPkh && (
      <>
        {' '}
        <span className="font-light opacity-75">
          <T id="selfComment" />
        </span>
      </>
    )}
  </>
);

const UnknownBakerName = memo<{ bakerPkh: string; chainId: string }>(({ bakerPkh, chainId }) => {
  const explorerHref = useBlockExplorerHref(TempleChainKind.Tezos, chainId, 'address', bakerPkh);

  if (explorerHref)
    return (
      <div className="flex gap-x-2">
        <BakerName>
          <T id="unknownBakerTitle" />
        </BakerName>

        <OpenInExplorerChipBase href={explorerHref} small alternativeDesign />
      </div>
    );

  return (
    <div className="flex flex-col gap-y-1 items-start">
      <BakerName>
        <T id="unknownBakerTitle" />
      </BakerName>

      <OldStyleHashChip bgShade={200} rounded="base" hash={bakerPkh} small textShade={700} />
    </div>
  );
});

const BakerTag: FC<{ recommended: boolean }> = ({ recommended }) => (
  <div className="flex-shrink-0 font-medium text-xs leading-none px-2 py-1 bg-blue-500 text-white rounded-full">
    <T id={recommended ? 'recommended' : 'helpUkraine'} />
  </div>
);
