import React, { FC } from 'react';

import classNames from 'clsx';

import { TezosAssetIcon } from 'app/templates/AssetIcon';
import { AssetItemContent } from 'app/templates/AssetItemContent';
import { setAnotherSelector, setTestID } from 'lib/analytics';
import { useCategorizedTezosAssetMetadata } from 'lib/metadata';
import { isTruthy } from 'lib/utils';
import { TezosNetworkEssentials } from 'temple/networks';

import { AssetsMenuSelectors } from './selectors';

interface Props {
  network: TezosNetworkEssentials;
  accountPkh: string;
  assetSlug: string;
  selected?: boolean;
}

export const AssetOption: FC<Props> = ({ network, assetSlug, selected, accountPkh }) => {
  const assetMetadata = useCategorizedTezosAssetMetadata(assetSlug, network.chainId);

  if (!isTruthy(assetMetadata)) return null;

  return (
    <div
      className={classNames(
        'py-1.5 px-2 w-full flex items-center rounded h-16',
        selected ? 'bg-gray-200' : 'hover:bg-gray-100'
      )}
      {...setTestID(AssetsMenuSelectors.assetsMenuAssetItem)}
      {...setAnotherSelector('slug', assetSlug)}
    >
      <TezosAssetIcon tezosChainId={network.chainId} assetSlug={assetSlug} size={32} className="mx-2" />

      <AssetItemContent network={network} slug={assetSlug} metadata={assetMetadata} publicKeyHash={accountPkh} />
    </div>
  );
};
