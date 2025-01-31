import React, { memo, useCallback, useEffect, useState } from 'react';

import { ToggleSwitch } from 'app/atoms';
import { ActionModalBodyContainer, ActionModalButton, ActionModalButtonsContainer } from 'app/atoms/action-modal';
import { ActionsButtonsBox } from 'app/atoms/PageModal/actions-buttons-box';
import { SettingsCellSingle } from 'app/atoms/SettingsCell';
import { SettingsCellGroup } from 'app/atoms/SettingsCellGroup';
import { StyledButton } from 'app/atoms/StyledButton';
import PageLayout from 'app/layouts/PageLayout';
import { MAIN_CHAINS_IDS } from 'lib/constants';
import { T, t } from 'lib/i18n';
import { useBooleanState } from 'lib/ui/hooks';
import { HistoryAction, navigate } from 'lib/woozie';
import { OneOfChains, useAllEvmChains, useAllTezosChains } from 'temple/front';
import { BlockExplorer } from 'temple/front/use-block-explorers';
import { StoredEvmNetwork, StoredTezosNetwork } from 'temple/networks';
import { TempleChainKind } from 'temple/types';

import { ManageUrlEntitiesView } from './manage-url-entities-view';
import { ChainSettingsSelectors } from './selectors';
import { ShortenedEntityNameActionModal } from './shortened-entity-name-action-modal';
import { useChainOperations } from './use-chain-operations';

interface ChainSettingsProps {
  chainKind: TempleChainKind;
  chainId: string;
}

interface ChainExistentSettingsProps {
  chain: OneOfChains;
  bottomEdgeIsVisible: boolean;
}

const rpcUrlFn = (item: { rpcBaseURL: string }) => item.rpcBaseURL;
const explorerUrlFn = (item: { url: string }) => item.url;

const ChainExistentSettings = memo<ChainExistentSettingsProps>(({ chain, bottomEdgeIsVisible }) => {
  const [removeChainModalIsOpen, openRemoveChainModal, closeRemoveChainModal] = useBooleanState(false);
  const { kind: chainKind, chainId } = chain;
  const {
    setChainEnabled,
    addRpc,
    addExplorer,
    updateRpc,
    updateExplorer,
    removeRpc,
    removeBlockExplorer,
    removeChain
  } = useChainOperations(chainKind, chainId);
  const disablingIsForbidden = MAIN_CHAINS_IDS.includes(chainId);

  const handleConfirmRemoveClick = useCallback(() => {
    closeRemoveChainModal();
    removeChain()
      .then(() => navigate('/settings/networks', HistoryAction.Replace))
      .catch(console.error);
  }, [closeRemoveChainModal, removeChain]);

  return (
    <>
      <div className="w-full h-full flex flex-col p-4 gap-4">
        <SettingsCellGroup>
          <SettingsCellSingle cellName={<T id="networkEnabled" />} Component="div">
            <ToggleSwitch
              checked={!chain.disabled}
              disabled={!chain.disabled && disablingIsForbidden}
              onChange={setChainEnabled}
              testID={ChainSettingsSelectors.networkEnabledSwitch}
            />
          </SettingsCellSingle>
        </SettingsCellGroup>

        <ManageUrlEntitiesView<StoredTezosNetwork | StoredEvmNetwork>
          activeI18nKey="activeRpc"
          activeItemId={chain.rpc.id}
          title={<T id="rpcEndpoints" />}
          items={chain.allRpcs}
          editModalTitleI18nKeyBase="editSomeRpc"
          createModalTitle={t('addSomeRpc', chain.name)}
          confirmDeleteTitleI18nKeyBase="confirmDeleteRpcTitle"
          confirmDeleteDescriptionI18nKey="confirmDeleteRpcDescription"
          deleteLabelI18nKey="deleteRpc"
          successfullyAddedMessageI18nKey="rpcAdded"
          urlInputPlaceholder="https://rpc.link"
          namePlaceholder="RPC"
          getEntityUrl={rpcUrlFn}
          createEntity={addRpc}
          updateEntity={updateRpc}
          removeEntity={removeRpc}
          addButtonTestID={ChainSettingsSelectors.addRpcButton}
          itemTestID={ChainSettingsSelectors.rpcEndpointItem}
          activeSwitchTestID={ChainSettingsSelectors.activeRpcSwitch}
          activeCheckboxTestID={ChainSettingsSelectors.activeRpcCheckbox}
        />

        <ManageUrlEntitiesView<BlockExplorer>
          activeI18nKey="activeBlockExplorer"
          activeItemId={chain.activeBlockExplorer?.id ?? ''}
          title={<T id="blockExplorer" />}
          items={chain.allBlockExplorers}
          editModalTitleI18nKeyBase="editSomeBlockExplorer"
          createModalTitle={t('addSomeBlockExplorer', chain.name)}
          confirmDeleteTitleI18nKeyBase="confirmDeleteBlockExplorerTitle"
          deleteLabelI18nKey="deleteBlockExplorer"
          confirmDeleteDescriptionI18nKey="confirmDeleteBlockExplorerDescription"
          successfullyAddedMessageI18nKey="blockExplorerAdded"
          urlInputPlaceholder="https://explorer.link"
          namePlaceholder={t('blockExplorer')}
          getEntityUrl={explorerUrlFn}
          createEntity={addExplorer}
          updateEntity={updateExplorer}
          removeEntity={removeBlockExplorer}
          addButtonTestID={ChainSettingsSelectors.addExplorerButton}
          itemTestID={ChainSettingsSelectors.blockExplorerItem}
          activeSwitchTestID={ChainSettingsSelectors.activeExplorerSwitch}
          activeCheckboxTestID={ChainSettingsSelectors.activeExplorerCheckbox}
        />
      </div>
      {!chain.default && (
        <ActionsButtonsBox className="sticky left-0 bottom-0" shouldCastShadow={!bottomEdgeIsVisible}>
          <StyledButton
            size="L"
            color="red-low"
            onClick={openRemoveChainModal}
            testID={ChainSettingsSelectors.removeNetworkButton}
          >
            <T id="removeNetwork" />
          </StyledButton>
        </ActionsButtonsBox>
      )}
      {removeChainModalIsOpen && (
        <ShortenedEntityNameActionModal
          titleI18nKeyBase="removeNetworkModalTitle"
          entityName={chain.nameI18nKey ? <T id={chain.nameI18nKey} /> : chain.name}
          hasCloseButton={false}
        >
          <ActionModalBodyContainer>
            <p className="text-center text-grey-1 text-font-description">
              <T id="removeNetworkModalDescription" />
            </p>
          </ActionModalBodyContainer>
          <ActionModalButtonsContainer>
            <ActionModalButton
              color="red-low"
              onClick={closeRemoveChainModal}
              testID={ChainSettingsSelectors.cancelRemoveNetworkButton}
            >
              <T id="cancel" />
            </ActionModalButton>

            <ActionModalButton
              color="red"
              onClick={handleConfirmRemoveClick}
              testID={ChainSettingsSelectors.confirmRemoveNetworkButton}
            >
              <T id="remove" />
            </ActionModalButton>
          </ActionModalButtonsContainer>
        </ShortenedEntityNameActionModal>
      )}
    </>
  );
});

export const ChainSettings = memo<ChainSettingsProps>(props => {
  const [bottomEdgeIsVisible, setBottomEdgeIsVisible] = useState(true);
  const { chainId, chainKind } = props;
  const evmChains = useAllEvmChains();
  const tezChains = useAllTezosChains();
  // `chain` may become `undefined` when the chain is being removed
  const chain: OneOfChains | undefined = chainKind === TempleChainKind.Tezos ? tezChains[chainId] : evmChains[chainId];

  const [pageTitle, setPageTitle] = useState(() => (chain?.nameI18nKey ? <T id={chain.nameI18nKey} /> : chain?.name));
  useEffect(() => {
    if (chain) {
      setPageTitle(chain.nameI18nKey ? <T id={chain.nameI18nKey} /> : chain.name);
    }
  }, [chain]);

  return (
    <PageLayout
      contentPadding={false}
      pageTitle={<span className="truncate">{pageTitle}</span>}
      onBottomEdgeVisibilityChange={setBottomEdgeIsVisible}
      bottomEdgeThreshold={16}
    >
      {chain ? <ChainExistentSettings chain={chain} bottomEdgeIsVisible={bottomEdgeIsVisible} /> : null}
    </PageLayout>
  );
});
