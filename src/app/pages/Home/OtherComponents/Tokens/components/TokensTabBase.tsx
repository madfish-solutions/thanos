import React, { FC } from 'react';

import { SyncSpinner } from 'app/atoms';
import { FilterButton } from 'app/atoms/FilterButton';
import { IconButton } from 'app/atoms/IconButton';
import { ManageActiveTip } from 'app/atoms/ManageActiveTip';
import { SimpleInfiniteScroll } from 'app/atoms/SimpleInfiniteScroll';
import { useAssetsViewState } from 'app/hooks/use-assets-view-state';
import { useManageAssetsClickOutsideLogic } from 'app/hooks/use-manage-assets-click-outside-logic';
import { ReactComponent as ManageIcon } from 'app/icons/base/manage.svg';
import { ContentContainer, StickyBar } from 'app/layouts/containers';
import { AssetsSelectors } from 'app/pages/Home/OtherComponents/Assets.selectors';
import { AssetsFilterOptions } from 'app/templates/AssetsFilterOptions';
import { SearchBarField } from 'app/templates/SearchField';

import { EmptySection } from './EmptySection';
import { UpdateAppBanner } from './UpdateAppBanner';

interface TokensTabBaseProps {
  tokensView: JSX.Element[];
  tokensCount: number;
  searchValue: string;
  loadNextPage: EmptyFn;
  onSearchValueChange: (value: string) => void;
  isSyncing: boolean;
}

export const TokensTabBase: FC<TokensTabBaseProps> = ({
  tokensView,
  tokensCount,
  searchValue,
  loadNextPage,
  onSearchValueChange,
  isSyncing
}) => {
  const { manageActive, toggleManageActive, filtersOpened, setFiltersClosed, toggleFiltersOpened } =
    useAssetsViewState();

  const { stickyBarRef, filterButtonRef, manageButtonRef, searchInputContainerRef, containerRef } =
    useManageAssetsClickOutsideLogic();

  return (
    <>
      <StickyBar ref={stickyBarRef}>
        <SearchBarField
          ref={searchInputContainerRef}
          value={searchValue}
          onValueChange={onSearchValueChange}
          testID={AssetsSelectors.searchAssetsInputTokens}
        />

        <FilterButton ref={filterButtonRef} active={filtersOpened} onClick={toggleFiltersOpened} />

        <IconButton ref={manageButtonRef} Icon={ManageIcon} active={manageActive} onClick={toggleManageActive} />
      </StickyBar>

      {filtersOpened ? (
        <AssetsFilterOptions filterButtonRef={filterButtonRef} onRequestClose={setFiltersClosed} />
      ) : (
        <ContentContainer ref={containerRef} padding={tokensCount > 0}>
          {!manageActive && <UpdateAppBanner stickyBarRef={stickyBarRef} />}

          {tokensCount === 0 ? (
            <EmptySection />
          ) : (
            <>
              {manageActive && <ManageActiveTip />}
              <SimpleInfiniteScroll loadNext={loadNextPage}>{tokensView}</SimpleInfiniteScroll>
              {isSyncing && <SyncSpinner className="mt-4" />}
            </>
          )}
        </ContentContainer>
      )}
    </>
  );
};