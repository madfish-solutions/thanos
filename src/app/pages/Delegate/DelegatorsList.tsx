import React, { FC, useMemo } from 'react';

import clsx from 'clsx';

import { Button } from 'app/atoms';
import { ReactComponent as ChevronRightIcon } from 'app/icons/chevron-right.svg';
import { useUserTestingGroupNameSelector } from 'app/store/ab-testing/selectors';
import { BakerCard, BAKER_BANNER_CLASSNAME } from 'app/templates/BakerBanner';
import { ABTestGroup } from 'lib/apis/temple';
import { T, t } from 'lib/i18n';
import { HELP_UKRAINE_BAKER_ADDRESS, RECOMMENDED_BAKER_ADDRESS } from 'lib/known-bakers';
import { useKnownBakers } from 'lib/temple/front';
import { Link, useLocation } from 'lib/woozie';

import { DelegateFormSelectors } from './selectors';

const SORT_BAKERS_BY_KEY = 'sort_bakers_by';

export const KnownDelegatorsList: React.FC<{ setValue: any; triggerValidation: any }> = ({
  setValue,
  triggerValidation
}) => {
  const knownBakers = useKnownBakers();
  const { search } = useLocation();
  const testGroupName = useUserTestingGroupNameSelector();

  const bakerSortTypes = useMemo(
    () => [
      {
        key: 'rank',
        title: t('rank'),
        testID: DelegateFormSelectors.sortBakerByRankTab
      },
      {
        key: 'fee',
        title: t('fee'),
        testID: DelegateFormSelectors.sortBakerByFeeTab
      },
      {
        key: 'space',
        title: t('space'),
        testID: DelegateFormSelectors.sortBakerBySpaceTab
      },
      {
        key: 'staking',
        title: t('staking'),
        testID: DelegateFormSelectors.sortBakerByStakingTab
      },
      {
        key: 'min-amount',
        title: t('minAmount'),
        testID: DelegateFormSelectors.sortBakerByMinAmountTab
      }
    ],
    []
  );

  const sortBakersBy = useMemo(() => {
    const usp = new URLSearchParams(search);
    const val = usp.get(SORT_BAKERS_BY_KEY);
    return bakerSortTypes.find(({ key }) => key === val) ?? bakerSortTypes[0];
  }, [search, bakerSortTypes]);

  const baseSortedKnownBakers = useMemo(() => {
    if (!knownBakers) return null;

    const toSort = Array.from(knownBakers);
    switch (sortBakersBy.key) {
      case 'fee':
        return toSort.sort((a, b) => a.delegation.fee - b.delegation.fee);

      case 'space':
        return toSort.sort((a, b) => b.delegation.freeSpace - a.delegation.freeSpace);

      case 'staking':
        return toSort.sort(
          (a, b) => b.delegation.capacity - b.delegation.freeSpace - (a.delegation.capacity - a.delegation.freeSpace)
        );

      case 'min-amount':
        return toSort.sort((a, b) => a.delegation.minBalance - b.delegation.minBalance);

      case 'rank':
      default:
        return toSort;
    }
  }, [knownBakers, sortBakersBy]);

  if (!baseSortedKnownBakers) return null;

  const sponsoredBakers = baseSortedKnownBakers.filter(
    baker => baker.address === RECOMMENDED_BAKER_ADDRESS || baker.address === HELP_UKRAINE_BAKER_ADDRESS
  );

  const sortedKnownBakers = [
    ...sponsoredBakers,
    ...baseSortedKnownBakers.filter(
      baker => baker.address !== RECOMMENDED_BAKER_ADDRESS && baker.address !== HELP_UKRAINE_BAKER_ADDRESS
    )
  ];

  return (
    <div className="pb-6 flex flex-col">
      <h2 className="leading-tight flex flex-col">
        <span className="text-base font-semibold text-gray-700">
          <T id="recommendedBakers" />
        </span>

        <span className="mt-1 text-xs font-light text-gray-600 max-w-9/10">
          <T
            id="recommendedBakersDescription"
            substitutions={[
              <a
                href="https://tzkt.io/bakers"
                key="link"
                target="_blank"
                rel="noopener noreferrer"
                className="font-normal underline"
              >
                TZKT
              </a>
            ]}
          />
        </span>
      </h2>

      <div className="mt-4 flex items-center">
        <span className="mr-1 text-xs text-gray-500">
          <T id="sortBy" />
        </span>

        {bakerSortTypes.map(({ key, title, testID }, i, arr) => {
          const first = i === 0;
          const last = i === arr.length - 1;
          const selected = sortBakersBy.key === key;

          return (
            <Link
              key={key}
              to={{
                pathname: '/delegate',
                search: `${SORT_BAKERS_BY_KEY}=${key}`
              }}
              replace
              className={clsx(
                'border px-2 py-px text-xs text-gray-600',
                first ? 'rounded rounded-r-none' : last ? 'rounded rounded-l-none border-l-0' : 'border-l-0',
                selected && 'bg-gray-100'
              )}
              testID={testID}
            >
              {title}
            </Link>
          );
        })}

        <div className="flex-1" />
      </div>

      <div className="mt-3 flex flex-col gap-y-3">
        {sortedKnownBakers.map(baker => {
          const handleBakerClick = () => {
            setValue('to', baker.address);
            triggerValidation('to');
            window.scrollTo(0, 0);
          };

          let testId = DelegateFormSelectors.knownBakerItemButton;
          let className = clsx(
            BAKER_BANNER_CLASSNAME,
            'hover:bg-gray-100 focus:bg-gray-100',
            'transition ease-in-out duration-200',
            'focus:outline-none',
            'opacity-90 hover:opacity-100'
          );

          if (baker.address === RECOMMENDED_BAKER_ADDRESS) {
            testId = DelegateFormSelectors.knownBakerItemAButton;
            if (testGroupName === ABTestGroup.B) {
              testId = DelegateFormSelectors.knownBakerItemBButton;
              className += 'bg-orange-100';
            }
          }

          return (
            <Button
              key={baker.address}
              type="button"
              className={className}
              onClick={handleBakerClick}
              testID={testId}
              testIDProperties={{ bakerAddress: baker.address, abTestingCategory: testGroupName }}
            >
              <BakerCard
                bakerPkh={baker.address}
                hideAddress
                showBakerTag
                className="w-full"
                HeaderRight={BakerBannerHeaderRight}
              />
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const BakerBannerHeaderRight: FC = () => <ChevronRightIcon className="h-6 w-6 stroke-current text-gray-500" />;
