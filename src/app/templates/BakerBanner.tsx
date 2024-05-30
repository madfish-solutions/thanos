import React, { FC, memo, useMemo } from 'react';

import BigNumber from 'bignumber.js';
import clsx from 'clsx';

import { Identicon, Name, Money, HashChip, Divider } from 'app/atoms';
import { useAppEnv } from 'app/env';
import { BakingSectionSelectors } from 'app/pages/Home/OtherComponents/BakingSection/selectors';
import { toLocalFormat, T } from 'lib/i18n';
import { HELP_UKRAINE_BAKER_ADDRESS, RECOMMENDED_BAKER_ADDRESS } from 'lib/known-bakers';
import { TEZOS_METADATA } from 'lib/metadata';
import { useRetryableSWR } from 'lib/swr';
import { useRelevantAccounts, useAccount, useNetwork, useKnownBaker, useTezos, useOnBlock } from 'lib/temple/front';
import { atomsToTokens } from 'lib/temple/helpers';
import { TempleAccount } from 'lib/temple/types';

import { OpenInExplorerChip } from './OpenInExplorerChip';

interface Props {
  bakerPkh: string;
  hideAddress?: boolean;
  showBakerTag?: boolean;
  className?: string;
  HeaderRight?: React.ComponentType;
}

export const BakerCard = memo<Props>(({ bakerPkh, hideAddress, showBakerTag, className, HeaderRight }) => {
  const allAccounts = useRelevantAccounts();
  const account = useAccount();
  const { fullPage } = useAppEnv();
  const { data: baker } = useKnownBaker(bakerPkh);

  const bakerAcc = useMemo(
    () => allAccounts.find(acc => acc.publicKeyHash === bakerPkh) ?? null,
    [allAccounts, bakerPkh]
  );

  const isRecommendedBaker = bakerPkh === RECOMMENDED_BAKER_ADDRESS;
  const isHelpUkraineBaker = bakerPkh === HELP_UKRAINE_BAKER_ADDRESS;
  const withBakerTag = showBakerTag && (isRecommendedBaker || isHelpUkraineBaker);

  if (!baker)
    return (
      <BakerHeader HeaderRight={HeaderRight} className={className}>
        <Identicon type="bottts" hash={bakerPkh} size={40} className="shadow-xs" />

        {bakerAcc ? (
          <BakerName>
            <SelfBakerNameValue bakerAcc={bakerAcc} accountPkh={account.publicKeyHash} />
          </BakerName>
        ) : (
          <UnknownBakerName bakerPkh={bakerPkh} />
        )}
      </BakerHeader>
    );

  return (
    <div className={clsx('flex flex-col gap-y-4 text-gray-700', className)}>
      <BakerHeader HeaderRight={HeaderRight}>
        <img src={baker.logo} alt={baker.name} className="flex-shrink-0 w-8 h-8 bg-white rounded shadow-xs" />

        <BakerName>{baker.name}</BakerName>

        {withBakerTag && <BakerTag recommended={isRecommendedBaker} />}

        {!hideAddress && <OpenInExplorerChip hash={baker.address} type="account" small alternativeDesign />}
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
            <Money>{(baker.stakingBalance / 1000).toFixed(0)}</Money>K
          </span>
        </div>

        <div className="flex flex-col gap-y-1">
          <T id="space" />:
          <span className="font-medium leading-none text-blue-750">
            <Money>{(baker.freeSpace / 1000).toFixed(0)}</Money>K
          </span>
        </div>

        <div className="flex flex-col gap-y-1">
          <T id="fee" />:
          <span className="font-medium leading-none text-blue-750">
            {toLocalFormat(new BigNumber(baker.fee).times(100), {
              decimalPlaces: 2
            })}
            %
          </span>
        </div>

        <div className="flex flex-col gap-y-1">
          <T id="minAmount" />:
          <span className="font-medium leading-none text-blue-750">
            <Money smallFractionFont={false}>{baker.minDelegation}</Money> {TEZOS_METADATA.symbol}
          </span>
        </div>
      </div>
    </div>
  );
});

export const BAKER_BANNER_CLASSNAME = 'p-4 rounded-lg border';

interface BakerBannerProps {
  bakerPkh: string;
  ActionButton?: React.ComponentType<PropComponentProps>;
  HeaderRight?: React.ComponentType<PropComponentProps>;
  allowDisplayZeroStake?: boolean;
}

interface PropComponentProps {
  /** Atomic value */
  staked: number;
}

export const BakerBanner = memo<BakerBannerProps>(({ bakerPkh, ActionButton, HeaderRight, allowDisplayZeroStake }) => {
  const acc = useAccount();
  const tezos = useTezos();

  const { data: stakedData, mutate } = useRetryableSWR(
    ['delegate-stake', 'get-staked', tezos.checksum],
    () => tezos.rpc.getStakedBalance(acc.publicKeyHash),
    { revalidateOnFocus: false }
  );

  useOnBlock(() => void mutate());

  console.log('STAKED DATA:', stakedData?.toString());

  const staked = stakedData && stakedData.gt(0) ? atomsToTokens(stakedData, TEZOS_METADATA.decimals) : null;
  const stakedAtomic = stakedData?.toNumber() || 0;

  const displayingStaked = allowDisplayZeroStake || staked?.gt(0);

  const HeaderRightWithProps = useMemo<FC | undefined>(
    () => HeaderRight && (() => <HeaderRight staked={stakedAtomic} />),
    [HeaderRight, stakedAtomic]
  );

  return (
    <div className={clsx(BAKER_BANNER_CLASSNAME, 'flex flex-col gap-y-4')}>
      <BakerCard bakerPkh={bakerPkh} HeaderRight={HeaderRightWithProps} />

      {(ActionButton || displayingStaked) && <Divider />}

      {displayingStaked && (
        <div className="text-sm text-blue-750">
          <span className="mr-1">Staked:</span>

          <span className="font-semibold">
            {staked ? (
              <Money smallFractionFont={false} cryptoDecimals={TEZOS_METADATA.decimals}>
                {staked}
              </Money>
            ) : (
              '0.00'
            )}

            {' ' + TEZOS_METADATA.symbol}
          </span>
        </div>
      )}

      {ActionButton && <ActionButton staked={stakedAtomic} />}
    </div>
  );
});

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
  bakerAcc: TempleAccount;
  accountPkh: string;
}> = ({ bakerAcc, accountPkh }) => (
  <>
    {bakerAcc.name}

    {bakerAcc.publicKeyHash === accountPkh && (
      <>
        {' '}
        <span className="font-light opacity-75">
          <T id="selfComment" />
        </span>
      </>
    )}
  </>
);

const UnknownBakerName: React.FC<{
  bakerPkh: string;
}> = ({ bakerPkh }) => {
  const network = useNetwork();

  if (network.type === 'dcp')
    return (
      <div className="flex gap-x-1">
        <HashChip bgShade={200} rounded="base" hash={bakerPkh} small textShade={700} />

        <OpenInExplorerChip hash={bakerPkh} type="account" small alternativeDesign />
      </div>
    );

  return (
    <div className="flex flex-col gap-y-1 items-start">
      <BakerName>
        <T id="unknownBakerTitle" />
      </BakerName>

      <HashChip bgShade={200} rounded="base" hash={bakerPkh} small textShade={700} />
    </div>
  );
};

const BakerTag: FC<{ recommended: boolean }> = ({ recommended }) => (
  <div className="flex-shrink-0 font-medium text-xs leading-none px-2 py-1 bg-blue-500 text-white rounded-full">
    <T id={recommended ? 'recommended' : 'helpUkraine'} />
  </div>
);
