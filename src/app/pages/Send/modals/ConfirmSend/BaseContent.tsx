import React from 'react';

import { SubmitHandler, useFormContext } from 'react-hook-form-v7';

import { HashChip } from 'app/atoms/HashChip';
import { ActionsButtonsBox } from 'app/atoms/PageModal/actions-buttons-box';
import { StyledButton } from 'app/atoms/StyledButton';
import { TransactionTabs } from 'app/templates/TransactionTabs';
import { DisplayedFeeOptions, FeeOptionLabel, Tab, TxParamsFormData } from 'app/templates/TransactionTabs/types';
import { T } from 'lib/i18n';
import { OneOfChains } from 'temple/front';

import { CurrentAccount } from './components/CurrentAccount';
import { Header } from './components/Header';

export type { Tab } from 'app/templates/TransactionTabs/types';

interface BaseContentProps<T extends TxParamsFormData> {
  network: OneOfChains;
  assetSlug: string;
  amount: string;
  recipientAddress: string;
  selectedTab: Tab;
  setSelectedTab: SyncFn<Tab>;
  selectedFeeOption: FeeOptionLabel | nullish;
  latestSubmitError: string | nullish;
  onFeeOptionSelect: SyncFn<FeeOptionLabel>;
  onSubmit: SubmitHandler<T>;
  onCancel: EmptyFn;
  displayedFee?: string;
  displayedStorageFee?: string;
  displayedFeeOptions?: DisplayedFeeOptions;
}

export const BaseContent = <T extends TxParamsFormData>({
  network,
  assetSlug,
  recipientAddress,
  amount,
  selectedFeeOption,
  selectedTab,
  latestSubmitError,
  onFeeOptionSelect,
  setSelectedTab,
  onSubmit,
  onCancel,
  displayedFee,
  displayedStorageFee,
  displayedFeeOptions
}: BaseContentProps<T>) => {
  const { formState } = useFormContext<T>();

  return (
    <>
      <div className="px-4 flex flex-col flex-1 overflow-y-scroll">
        <Header network={network} assetSlug={assetSlug} amount={amount} />

        <CurrentAccount />

        <TransactionTabs<T>
          network={network}
          nativeAssetSlug={assetSlug}
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
          selectedFeeOption={selectedFeeOption}
          latestSubmitError={latestSubmitError}
          onFeeOptionSelect={onFeeOptionSelect}
          onSubmit={onSubmit}
          displayedFee={displayedFee}
          displayedStorageFee={displayedStorageFee}
          displayedFeeOptions={displayedFeeOptions}
          formId="confirm-form"
          tabsName="confirm-send-tabs"
          destinationName={<T id="recipient" />}
          destinationValue={<HashChip hash={recipientAddress} />}
        />
      </div>

      <ActionsButtonsBox flexDirection="row" shouldChangeBottomShift={false}>
        <StyledButton size="L" className="w-full" color="primary-low" onClick={onCancel}>
          <T id="cancel" />
        </StyledButton>

        <StyledButton
          type="submit"
          form="confirm-form"
          color="primary"
          size="L"
          className="w-full"
          loading={formState.isSubmitting}
          disabled={!formState.isValid}
        >
          <T id={latestSubmitError ? 'retry' : 'confirm'} />
        </StyledButton>
      </ActionsButtonsBox>
    </>
  );
};
