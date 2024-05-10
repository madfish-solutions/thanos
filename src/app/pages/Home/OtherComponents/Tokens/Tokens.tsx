import React, { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SyncSpinner, Divider, Checkbox } from 'app/atoms';
import DropdownWrapper from 'app/atoms/DropdownWrapper';
import { IconButton } from 'app/atoms/IconButton';
import { useLoadPartnersPromo } from 'app/hooks/use-load-partners-promo';
import { useTokensListingLogic } from 'app/hooks/use-tokens-listing-logic';
import { ReactComponent as EditingIcon } from 'app/icons/editing.svg';
import { ReactComponent as FiltersIcon } from 'app/icons/filteroff.svg';
import { ReactComponent as SearchIcon } from 'app/icons/search.svg';
import { ContentContainer, StickyBar } from 'app/layouts/containers';
import { useAreAssetsLoading, useMainnetTokensScamlistSelector } from 'app/store/assets/selectors';
import { useTokensMetadataLoadingSelector } from 'app/store/tokens-metadata/selectors';
import { useChainSelectController, ChainSelect, ChainsDropdown } from 'app/templates/ChainSelect';
import { ChainSelectController } from 'app/templates/ChainSelect/controller';
import { ButtonForManageDropdown } from 'app/templates/ManageDropdown';
import { PartnersPromotion, PartnersPromotionVariant } from 'app/templates/partners-promotion';
import { SearchBarField } from 'app/templates/SearchField';
import { setTestID } from 'lib/analytics';
import { OptimalPromoVariantEnum } from 'lib/apis/optimal';
import { TEZ_TOKEN_SLUG, TEMPLE_TOKEN_SLUG } from 'lib/assets';
import { useEnabledAccountTokensSlugs } from 'lib/assets/hooks';
import { T, t } from 'lib/i18n';
import { TEZOS_MAINNET_CHAIN_ID } from 'lib/temple/types';
import { useLocalStorage } from 'lib/ui/local-storage';
import Popper, { PopperRenderProps } from 'lib/ui/Popper';
import { Link, navigate } from 'lib/woozie';
import { UNDER_DEVELOPMENT_MSG } from 'temple/evm/under_dev_msg';
import { useAccountAddressForTezos } from 'temple/front';
import { TezosNetworkEssentials } from 'temple/networks';

import { HomeSelectors } from '../../Home.selectors';
import { AssetsSelectors } from '../Assets.selectors';

import { ListItem } from './components/ListItem';
import { UpdateAppBanner } from './components/UpdateAppBanner';
import { toExploreAssetLink } from './utils';

const LOCAL_STORAGE_TOGGLE_KEY = 'tokens-list:hide-zero-balances';
const svgIconClassName = 'w-4 h-4 stroke-current fill-current text-gray-600';

export const TokensTab = memo(() => {
  const chainSelectController = useChainSelectController();
  const network = chainSelectController.value;

  const accountTezAddress = useAccountAddressForTezos();

  if (network.kind === 'tezos' && accountTezAddress)
    return (
      <TezosTokensTab
        network={network}
        publicKeyHash={accountTezAddress}
        chainSelectController={chainSelectController}
      />
    );

  return (
    <ContentContainer className="mt-3">
      <div className="flex items-center mb-4">
        <div className="flex-1 text-xl">Change network:</div>

        <ChainSelect controller={chainSelectController} />
      </div>

      <span className="text-center">{UNDER_DEVELOPMENT_MSG}</span>
    </ContentContainer>
  );
});

interface TezosTokensTabProps {
  network: TezosNetworkEssentials;
  publicKeyHash: string;
  chainSelectController: ChainSelectController;
}

const TezosTokensTab: FC<TezosTokensTabProps> = ({ network, publicKeyHash, chainSelectController }) => {
  const chainId = network.chainId;

  const assetsAreLoading = useAreAssetsLoading('tokens');
  const metadatasLoading = useTokensMetadataLoadingSelector();
  const isSyncing = assetsAreLoading || metadatasLoading;

  const slugs = useEnabledAccountTokensSlugs(publicKeyHash, chainId);

  const [isZeroBalancesHidden, setIsZeroBalancesHidden] = useLocalStorage(LOCAL_STORAGE_TOGGLE_KEY, false);

  const toggleHideZeroBalances = useCallback(
    () => void setIsZeroBalancesHidden(val => !val),
    [setIsZeroBalancesHidden]
  );

  const leadingAssets = useMemo(
    () => (chainId === TEZOS_MAINNET_CHAIN_ID ? [TEZ_TOKEN_SLUG, TEMPLE_TOKEN_SLUG] : [TEZ_TOKEN_SLUG]),
    [chainId]
  );

  const mainnetTokensScamSlugsRecord = useMainnetTokensScamlistSelector();

  const { filteredAssets, searchValue, setSearchValue } = useTokensListingLogic(
    chainId,
    publicKeyHash,
    slugs,
    isZeroBalancesHidden,
    leadingAssets
  );

  const [searchFocused, setSearchFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchValueExist = useMemo(() => Boolean(searchValue), [searchValue]);

  const activeAssetSlug = useMemo(() => {
    return searchFocused && searchValueExist && filteredAssets[activeIndex] ? filteredAssets[activeIndex] : null;
  }, [filteredAssets, searchFocused, searchValueExist, activeIndex]);

  const tokensView = useMemo<JSX.Element[]>(() => {
    const tokensJsx = filteredAssets.map(assetSlug => (
      <ListItem
        network={network}
        key={assetSlug}
        publicKeyHash={publicKeyHash}
        assetSlug={assetSlug}
        scam={mainnetTokensScamSlugsRecord[assetSlug]}
        active={activeAssetSlug ? assetSlug === activeAssetSlug : false}
      />
    ));

    const promoJsx = (
      <PartnersPromotion
        id="promo-token-item"
        key="promo-token-item"
        variant={PartnersPromotionVariant.Text}
        pageName="Token page"
      />
    );

    if (filteredAssets.length < 5) {
      tokensJsx.push(promoJsx);
    } else {
      tokensJsx.splice(1, 0, promoJsx);
    }

    return tokensJsx;
  }, [network, filteredAssets, activeAssetSlug, publicKeyHash, mainnetTokensScamSlugsRecord]);

  useLoadPartnersPromo(OptimalPromoVariantEnum.Token);

  useEffect(() => {
    if (activeIndex !== 0 && activeIndex >= filteredAssets.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, filteredAssets.length]);

  const handleSearchFieldFocus = useCallback(() => void setSearchFocused(true), [setSearchFocused]);
  const handleSearchFieldBlur = useCallback(() => void setSearchFocused(false), [setSearchFocused]);

  useEffect(() => {
    if (!activeAssetSlug) return;

    const handleKeyup = (evt: KeyboardEvent) => {
      switch (evt.key) {
        case 'Enter':
          navigate(toExploreAssetLink(chainId, activeAssetSlug));
          break;

        case 'ArrowDown':
          setActiveIndex(i => i + 1);
          break;

        case 'ArrowUp':
          setActiveIndex(i => (i > 0 ? i - 1 : 0));
          break;
      }
    };

    window.addEventListener('keyup', handleKeyup);
    return () => window.removeEventListener('keyup', handleKeyup);
  }, [activeAssetSlug, chainId, setActiveIndex]);

  const stickyBarRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <StickyBar ref={stickyBarRef}>
        <SearchBarField
          value={searchValue}
          onValueChange={setSearchValue}
          onFocus={handleSearchFieldFocus}
          onBlur={handleSearchFieldBlur}
          testID={AssetsSelectors.searchAssetsInputTokens}
        />

        <Popper
          placement="bottom-end"
          strategy="fixed"
          popup={props => <ChainsDropdown controller={chainSelectController} {...props} />}
        >
          {({ ref, opened, toggleOpened }) => (
            <IconButton Icon={FiltersIcon} ref={ref} active={opened} onClick={toggleOpened} />
          )}
        </Popper>

        <Popper
          placement="bottom-end"
          strategy="fixed"
          popup={props => (
            <ManageButtonDropdown
              {...props}
              isZeroBalancesHidden={isZeroBalancesHidden}
              toggleHideZeroBalances={toggleHideZeroBalances}
            />
          )}
        >
          {({ ref, opened, toggleOpened }) => (
            <ButtonForManageDropdown
              ref={ref}
              opened={opened}
              tooltip={t('manageAssetsList')}
              onClick={toggleOpened}
              testID={AssetsSelectors.manageButton}
              testIDProperties={{ listOf: 'Tokens' }}
            />
          )}
        </Popper>
      </StickyBar>

      <ContentContainer>
        <UpdateAppBanner stickyBarRef={stickyBarRef} />

        {filteredAssets.length === 0 ? (
          <div className="my-8 flex flex-col items-center justify-center text-gray-500">
            <p className="mb-2 flex items-center justify-center text-gray-600 text-base font-light">
              {searchValueExist && <SearchIcon className="w-5 h-auto mr-1 stroke-current fill-current" />}

              <span {...setTestID(HomeSelectors.emptyStateText)}>
                <T id="noAssetsFound" />
              </span>
            </p>

            <p className="text-center text-xs font-light">
              <T
                id="ifYouDontSeeYourAsset"
                substitutions={[
                  <b>
                    <T id="manage" />
                  </b>
                ]}
              />
            </p>
          </div>
        ) : (
          tokensView
        )}

        {isSyncing && <SyncSpinner className="mt-4" />}
      </ContentContainer>
    </>
  );
};

interface ManageButtonDropdownProps extends PopperRenderProps {
  isZeroBalancesHidden: boolean;
  toggleHideZeroBalances: EmptyFn;
}

const ManageButtonDropdown: FC<ManageButtonDropdownProps> = ({
  opened,
  isZeroBalancesHidden,
  toggleHideZeroBalances
}) => {
  const buttonClassName = 'flex items-center px-3 py-2.5 rounded hover:bg-gray-200 cursor-pointer';

  return (
    <DropdownWrapper
      opened={opened}
      className="origin-top-right mt-1 p-2 flex flex-col min-w-40"
      style={{ border: 'unset', marginTop: '0.25rem' }}
    >
      <Link
        to={`/manage-assets`}
        className={buttonClassName}
        testID={AssetsSelectors.dropdownManageButton}
        testIDProperties={{ listOf: 'Tokens' }}
      >
        <EditingIcon className={svgIconClassName} />
        <span className="text-sm text-gray-600 ml-2 leading-5">
          <T id="manage" />
        </span>
      </Link>

      <Divider className="my-2" />

      <label className={buttonClassName}>
        <Checkbox
          overrideClassNames="h-4 w-4 rounded"
          checked={isZeroBalancesHidden}
          onChange={toggleHideZeroBalances}
          testID={AssetsSelectors.dropdownHideZeroBalancesCheckbox}
        />
        <span className="text-sm text-gray-600 ml-2 leading-5">
          <T id="hideZeroBalance" />
        </span>
      </label>
    </DropdownWrapper>
  );
};
