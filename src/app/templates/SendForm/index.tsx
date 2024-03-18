import React, { memo, Suspense, useCallback, useMemo, useState } from 'react';

import type { WalletOperation } from '@taquito/taquito';
import { isEqual } from 'lodash';

import AssetSelect from 'app/templates/AssetSelect';
import OperationStatus from 'app/templates/OperationStatus';
import { AnalyticsEventCategory, useAnalytics } from 'lib/analytics';
import { TEZ_TOKEN_SLUG } from 'lib/assets';
import { useEnabledAccountTokensSlugs } from 'lib/assets/hooks';
import { useTokensSortPredicate } from 'lib/assets/use-sorting';
import { t } from 'lib/i18n';
import { useMemoWithCompare, useSafeState } from 'lib/ui/hooks';
import { HistoryAction, navigate } from 'lib/woozie';
import { useTezos } from 'temple/front';

import AddContactModal from './AddContactModal';
import { Form } from './Form';
import { SendFormSelectors } from './selectors';
import { SpinnerSection } from './SpinnerSection';

interface Props {
  assetSlug?: string | null;
  publicKeyHash: string;
}

const SendForm = memo<Props>(({ assetSlug = TEZ_TOKEN_SLUG, publicKeyHash }) => {
  const tokensSlugs = useEnabledAccountTokensSlugs(publicKeyHash);

  const tokensSortPredicate = useTokensSortPredicate(publicKeyHash);

  const assetsSlugs = useMemoWithCompare<string[]>(
    () => {
      const sortedSlugs = Array.from(tokensSlugs).sort(tokensSortPredicate);

      if (!assetSlug || assetSlug === TEZ_TOKEN_SLUG) return [TEZ_TOKEN_SLUG, ...sortedSlugs];

      return sortedSlugs.some(s => s === assetSlug)
        ? [TEZ_TOKEN_SLUG, ...sortedSlugs]
        : [TEZ_TOKEN_SLUG, assetSlug, ...sortedSlugs];
    },
    [tokensSortPredicate, tokensSlugs, assetSlug],
    isEqual
  );

  const selectedAsset = assetSlug ?? TEZ_TOKEN_SLUG;

  const tezos = useTezos();
  const [operation, setOperation] = useSafeState<WalletOperation | null>(null, tezos.checksum);
  const [addContactModalAddress, setAddContactModalAddress] = useState<string | null>(null);
  const { trackEvent } = useAnalytics();

  const handleAssetChange = useCallback(
    (aSlug: string) => {
      trackEvent(SendFormSelectors.assetItemButton, AnalyticsEventCategory.ButtonPress);
      navigate(`/send/${aSlug}`, HistoryAction.Replace);
    },
    [trackEvent]
  );

  const handleAddContactRequested = useCallback(
    (address: string) => {
      setAddContactModalAddress(address);
    },
    [setAddContactModalAddress]
  );

  const closeContactModal = useCallback(() => {
    setAddContactModalAddress(null);
  }, [setAddContactModalAddress]);

  const testIDs = useMemo(
    () => ({
      main: SendFormSelectors.assetDropDown,
      select: SendFormSelectors.assetDropDownSelect,
      searchInput: SendFormSelectors.assetDropDownSearchInput
    }),
    []
  );

  return (
    <>
      {operation && <OperationStatus typeTitle={t('transaction')} operation={operation} className="mb-8" />}

      <AssetSelect
        accountPkh={publicKeyHash}
        value={selectedAsset}
        slugs={assetsSlugs}
        publicKeyHash={publicKeyHash}
        onChange={handleAssetChange}
        className="mb-6"
        testIDs={testIDs}
      />

      <Suspense fallback={<SpinnerSection />}>
        <Form assetSlug={selectedAsset} setOperation={setOperation} onAddContactRequested={handleAddContactRequested} />
      </Suspense>

      <AddContactModal address={addContactModalAddress} onClose={closeContactModal} />
    </>
  );
});

export default SendForm;
