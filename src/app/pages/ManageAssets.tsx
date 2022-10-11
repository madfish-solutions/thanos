import React, { FC, memo, useCallback } from 'react';

import classNames from 'clsx';

import Checkbox from 'app/atoms/Checkbox';
import { ReactComponent as AddIcon } from 'app/icons/add-to-list.svg';
import { ReactComponent as CloseIcon } from 'app/icons/close.svg';
import { ReactComponent as ControlCentreIcon } from 'app/icons/control-centre.svg';
import { ReactComponent as SearchIcon } from 'app/icons/search.svg';
import PageLayout from 'app/layouts/PageLayout';
import { ManageAssetsSelectors } from 'app/pages/ManageAssets.selectors';
import { AssetIcon } from 'app/templates/AssetIcon';
import SearchAssetField from 'app/templates/SearchAssetField';
import { T, t } from 'lib/i18n/react';
import { AssetTypesEnum, setTokenStatus } from 'lib/temple/assets';
import { useAccount, useChainId, useAssetMetadata, useAvailableAssets, useFilteredAssets } from 'lib/temple/front';
import { getAssetName, getAssetSymbol } from 'lib/temple/metadata';
import { ITokenStatus, ITokenType } from 'lib/temple/repo';
import { useConfirm } from 'lib/ui/dialog';
import { Link } from 'lib/woozie';

import styles from './ManageAssets.module.css';

interface Props {
  assetType: string;
}

const ManageAssets: FC<Props> = ({ assetType }) => (
  <PageLayout
    pageTitle={
      <>
        <ControlCentreIcon className="w-auto h-4 mr-1 stroke-current" />
        <T id={assetType === AssetTypesEnum.Collectibles ? 'manageCollectibles' : 'manageTokens'} />
      </>
    }
  >
    <ManageAssetsContent assetType={assetType} />
  </PageLayout>
);

export default ManageAssets;

const ManageAssetsContent: FC<Props> = ({ assetType }) => {
  const chainId = useChainId(true)!;
  const account = useAccount();
  const address = account.publicKeyHash;

  const { availableAssets, assetsStatuses, isLoading, mutate } = useAvailableAssets(
    assetType === AssetTypesEnum.Collectibles ? AssetTypesEnum.Collectibles : AssetTypesEnum.Tokens
  );
  const { filteredAssets, searchValue, setSearchValue } = useFilteredAssets(availableAssets);

  const confirm = useConfirm();

  const handleAssetUpdate = useCallback(
    async (assetSlug: string, status: ITokenStatus) => {
      try {
        if (status === ITokenStatus.Removed) {
          const confirmed = await confirm({
            title: assetType === AssetTypesEnum.Collectibles ? t('deleteCollectibleConfirm') : t('deleteTokenConfirm')
          });
          if (!confirmed) return;
        }

        await setTokenStatus(
          assetType === AssetTypesEnum.Collectibles ? ITokenType.Collectible : ITokenType.Fungible,
          chainId,
          address,
          assetSlug,
          status
        );
        await mutate();
      } catch (err: any) {
        console.error(err);
        alert(err.message);
      }
    },
    [chainId, address, confirm, mutate, assetType]
  );

  return (
    <div className="w-full max-w-sm mx-auto mb-6">
      <div className="mb-3 w-full flex items-strech">
        <SearchAssetField value={searchValue} onValueChange={setSearchValue} />

        <Link
          to="/add-asset"
          className={classNames(
            'ml-2 flex-shrink-0',
            'px-3 py-1',
            'rounded overflow-hidden',
            'flex items-center',
            'text-gray-600 text-sm',
            'transition ease-in-out duration-200',
            'hover:bg-gray-100',
            'opacity-75 hover:opacity-100 focus:opacity-100'
          )}
          testID={ManageAssetsSelectors.AddTokenButton}
        >
          <AddIcon className={classNames('mr-1 h-5 w-auto stroke-current stroke-2')} />
          <T id={assetType === AssetTypesEnum.Collectibles ? 'addCollectible' : 'addToken'} />
        </Link>
      </div>

      {filteredAssets.length > 0 ? (
        <div
          className={classNames(
            'w-full overflow-hidden',
            'border rounded-md',
            'flex flex-col',
            'text-gray-700 text-sm leading-tight'
          )}
        >
          {filteredAssets.map((slug, i, arr) => {
            const last = i === arr.length - 1;

            return (
              <ListItem
                key={slug}
                assetSlug={slug}
                last={last}
                checked={assetsStatuses[slug]?.displayed ?? false}
                onUpdate={handleAssetUpdate}
                assetType={assetType}
              />
            );
          })}
        </div>
      ) : (
        <LoadingComponent loading={isLoading} searchValue={searchValue} assetType={assetType} />
      )}
    </div>
  );
};

type ListItemProps = {
  assetSlug: string;
  last: boolean;
  checked: boolean;
  onUpdate: (assetSlug: string, status: ITokenStatus) => void;
  assetType: string;
};

const ListItem = memo<ListItemProps>(({ assetSlug, last, checked, onUpdate }) => {
  const metadata = useAssetMetadata(assetSlug);

  const handleCheckboxChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate(assetSlug, evt.target.checked ? ITokenStatus.Enabled : ITokenStatus.Disabled);
    },
    [assetSlug, onUpdate]
  );

  return (
    <label
      className={classNames(
        'block w-full',
        'overflow-hidden',
        !last && 'border-b border-gray-200',
        checked ? 'bg-gray-100' : 'hover:bg-gray-100 focus:bg-gray-100',
        'flex items-center py-2 px-3',
        'text-gray-700',
        'transition ease-in-out duration-200',
        'focus:outline-none',
        'cursor-pointer'
      )}
    >
      <AssetIcon assetSlug={assetSlug} size={32} className="mr-3 flex-shrink-0" />

      <div className={classNames('flex items-center', styles.tokenInfoWidth)}>
        <div className="flex flex-col items-start w-full">
          <div
            className={classNames('text-sm font-normal text-gray-700 truncate w-full')}
            style={{ marginBottom: '0.125rem' }}
          >
            {getAssetName(metadata)}
          </div>

          <div className={classNames('text-xs font-light text-gray-600 truncate w-full')}>
            {getAssetSymbol(metadata)}
          </div>
        </div>
      </div>

      <div className="flex-1" />

      <div
        className={classNames(
          'mr-2 p-1',
          'rounded-full',
          'text-gray-400 hover:text-gray-600',
          'hover:bg-black hover:bg-opacity-5',
          'transition ease-in-out duration-200'
        )}
        onClick={evt => {
          evt.preventDefault();
          onUpdate(assetSlug, ITokenStatus.Removed);
        }}
      >
        <CloseIcon className="w-auto h-4 stroke-current stroke-2" title={t('delete')} />
      </div>

      <Checkbox checked={checked} onChange={handleCheckboxChange} />
    </label>
  );
});

interface LoadingComponentProps {
  loading: boolean;
  searchValue: string;
  assetType: string;
}

const LoadingComponent: React.FC<LoadingComponentProps> = ({ loading, searchValue, assetType }) => {
  return loading ? null : (
    <div className={classNames('my-8', 'flex flex-col items-center justify-center', 'text-gray-500')}>
      <p className={classNames('mb-2', 'flex items-center justify-center', 'text-gray-600 text-base font-light')}>
        {Boolean(searchValue) && <SearchIcon className="w-5 h-auto mr-1 stroke-current" />}

        <span>
          <T id="noAssetsFound" />
        </span>
      </p>

      <p className={classNames('text-center text-xs font-light')}>
        <T id="ifYouDontSeeYourAsset" substitutions={[<RenderAssetComponent assetType={assetType} />]} />
      </p>
    </div>
  );
};
const RenderAssetComponent: React.FC<{ assetType: string }> = ({ assetType }) => (
  <b>{assetType === AssetTypesEnum.Collectibles ? <T id={'addCollectible'} /> : <T id={'addToken'} />}</b>
);
