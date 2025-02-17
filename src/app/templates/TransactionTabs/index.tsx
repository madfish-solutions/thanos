import React, { ReactNode, useCallback, useEffect, useRef } from 'react';

import { SubmitHandler, useFormContext } from 'react-hook-form-v7';

import { Loader } from 'app/atoms';
import SegmentedControl from 'app/atoms/SegmentedControl';
import { OneOfChains } from 'temple/front';
import { TempleChainKind } from 'temple/types';

import { AdvancedTab } from './tabs/advanced';
import { DetailsTab } from './tabs/details';
import { ErrorTab } from './tabs/error';
import { FeeTab } from './tabs/fee';
import { DisplayedFeeOptions, FeeOptionLabel, Tab, TxParamsFormData } from './types';

export interface TransactionTabsProps<T extends TxParamsFormData> {
  network: OneOfChains;
  nativeAssetSlug: string;
  selectedTab: Tab;
  setSelectedTab: SyncFn<Tab>;
  selectedFeeOption: FeeOptionLabel | nullish;
  latestSubmitError: string | nullish;
  onFeeOptionSelect: SyncFn<FeeOptionLabel>;
  onSubmit: SubmitHandler<T>;
  displayedFee?: string;
  displayedStorageFee?: string;
  displayedFeeOptions?: DisplayedFeeOptions;
  estimationError?: string | nullish;
  formId: string;
  tabsName: string;
  destinationName: ReactNode;
  destinationValue: ReactNode;
}

export const TransactionTabs = <T extends TxParamsFormData>({
  network,
  nativeAssetSlug,
  selectedTab,
  setSelectedTab,
  selectedFeeOption,
  latestSubmitError,
  onFeeOptionSelect,
  onSubmit,
  displayedFee,
  displayedStorageFee,
  displayedFeeOptions,
  estimationError,
  formId,
  tabsName,
  destinationName,
  destinationValue
}: TransactionTabsProps<T>) => {
  const { handleSubmit } = useFormContext<T>();
  const errorTabRef = useRef<HTMLDivElement>(null);
  const isEvm = network.kind === TempleChainKind.EVM;
  const goToFeeTab = useCallback(() => setSelectedTab('fee'), [setSelectedTab]);

  const error = latestSubmitError || estimationError;
  const prevErrorRef = useRef<string | nullish>(null);
  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      setSelectedTab('error');
    }

    prevErrorRef.current = error;
  }, [error, setSelectedTab]);

  return (
    <>
      <SegmentedControl<Tab>
        name={tabsName}
        activeSegment={selectedTab}
        setActiveSegment={setSelectedTab}
        controlRef={useRef<HTMLDivElement>(null)}
        className="mt-6 mb-4"
        segments={[
          {
            label: 'Details',
            value: 'details',
            ref: useRef<HTMLDivElement>(null)
          },
          {
            label: 'Fee',
            value: 'fee',
            ref: useRef<HTMLDivElement>(null)
          },
          {
            label: 'Advanced',
            value: 'advanced',
            ref: useRef<HTMLDivElement>(null)
          },
          ...(latestSubmitError || estimationError
            ? [
                {
                  label: 'Error',
                  value: 'error' as const,
                  ref: errorTabRef
                }
              ]
            : [])
        ]}
      />

      <form id={formId} className="flex-1 flex flex-col" onSubmit={handleSubmit(onSubmit)}>
        {!displayedFeeOptions && !estimationError ? (
          <div className="flex justify-center my-10">
            <Loader size="M" trackVariant="dark" className="text-primary" />
          </div>
        ) : (
          (() => {
            switch (selectedTab) {
              case 'fee':
                return (
                  <FeeTab
                    network={network}
                    assetSlug={nativeAssetSlug}
                    displayedFeeOptions={displayedFeeOptions}
                    selectedOption={selectedFeeOption}
                    onOptionSelect={onFeeOptionSelect}
                  />
                );
              case 'advanced':
                return <AdvancedTab isEvm={isEvm} />;
              case 'error':
                return <ErrorTab isEvm={isEvm} submitError={latestSubmitError} estimationError={estimationError} />;
              default:
                return (
                  <DetailsTab
                    network={network}
                    assetSlug={nativeAssetSlug}
                    displayedFee={displayedFee}
                    displayedStorageFee={displayedStorageFee}
                    goToFeeTab={goToFeeTab}
                    destinationName={destinationName}
                    destinationValue={destinationValue}
                  />
                );
            }
          })()
        )}
      </form>
    </>
  );
};
