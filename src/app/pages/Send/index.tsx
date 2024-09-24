import React, { memo, Suspense, useCallback, useState } from 'react';

import { PageTitle } from 'app/atoms';
import PageLayout from 'app/layouts/PageLayout';
import { useAssetsFilterOptionsSelector } from 'app/store/assets-filter-options/selectors';
import { EVM_TOKEN_SLUG, TEZ_TOKEN_SLUG } from 'lib/assets/defaults';
import { toChainAssetSlug } from 'lib/assets/utils';
import { t } from 'lib/i18n';
import { ETHEREUM_MAINNET_CHAIN_ID, TEZOS_MAINNET_CHAIN_ID } from 'lib/temple/types';
import { useBooleanState } from 'lib/ui/hooks';
import { useAccountAddressForEvm } from 'temple/front';
import { TempleChainKind } from 'temple/types';

import { Form } from './form';
import { SendFormData } from './form/interfaces';
import { SpinnerSection } from './form/SpinnerSection';
import { ConfirmSendModal } from './modals/ConfirmSend';
import { SelectAssetModal } from './modals/SelectAsset';

interface Props {
  chainKind?: string | null;
  chainId?: string | null;
  assetSlug?: string | null;
}

const Send = memo<Props>(({ chainKind, chainId, assetSlug }) => {
  const accountEvmAddress = useAccountAddressForEvm();
  const { filterChain } = useAssetsFilterOptionsSelector();

  const [selectedChainAssetSlug, setSelectedChainAssetSlug] = useState(() => {
    if (chainKind && chainId && assetSlug) {
      return toChainAssetSlug(chainKind as TempleChainKind, chainId, assetSlug);
    }

    if (filterChain) {
      return toChainAssetSlug(
        filterChain.kind,
        filterChain.chainId,
        filterChain.kind === TempleChainKind.Tezos ? TEZ_TOKEN_SLUG : EVM_TOKEN_SLUG
      );
    }

    if (accountEvmAddress) {
      return toChainAssetSlug(TempleChainKind.EVM, ETHEREUM_MAINNET_CHAIN_ID, EVM_TOKEN_SLUG);
    }

    return toChainAssetSlug(TempleChainKind.Tezos, TEZOS_MAINNET_CHAIN_ID, TEZ_TOKEN_SLUG);
  });

  const [selectAssetModalOpened, setSelectAssetModalOpen, setSelectAssetModalClosed] = useBooleanState(false);
  const [confirmSendModalOpened, setConfirmSendModalOpen, setConfirmSendModalClosed] = useBooleanState(true);

  const [confirmData, setConfirmData] = useState<SendFormData | null>({
    amount: '0.0001',
    to: '0x2b49e966ef7033db6DC6a721AeA368ebC1d15EC1'
  });

  const handleAssetSelect = useCallback(
    (slug: string) => {
      setSelectedChainAssetSlug(slug);
      setSelectAssetModalClosed();
    },
    [setSelectAssetModalClosed]
  );

  const handleConfirm = useCallback(
    (data: SendFormData) => {
      setConfirmData(data);
      setConfirmSendModalOpen();
    },
    [setConfirmSendModalOpen]
  );

  return (
    <PageLayout
      pageTitle={<PageTitle title={t('send')} />}
      contentPadding={false}
      contentClassName="bg-background overflow-hidden"
    >
      <Suspense fallback={<SpinnerSection />}>
        <Form
          selectedChainAssetSlug={selectedChainAssetSlug}
          onConfirm={handleConfirm}
          onSelectAssetClick={setSelectAssetModalOpen}
        />
      </Suspense>

      <SelectAssetModal
        onAssetSelect={handleAssetSelect}
        opened={selectAssetModalOpened}
        onRequestClose={setSelectAssetModalClosed}
      />
      <ConfirmSendModal
        opened={confirmSendModalOpened}
        onRequestClose={setConfirmSendModalClosed}
        chainAssetSlug={'evm:11155111:eth'}
        data={confirmData}
      />
    </PageLayout>
  );
});

export default Send;
