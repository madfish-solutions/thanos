import React, { FC, useMemo, useState } from 'react';

import BigNumber from 'bignumber.js';
import classNames from 'clsx';

import { FormSubmitButton } from 'app/atoms';
import CopyButton from 'app/atoms/CopyButton';
import Divider from 'app/atoms/Divider';
import HashShortView from 'app/atoms/HashShortView';
import { ReactComponent as CopyIcon } from 'app/icons/copy.svg';
import PageLayout from 'app/layouts/PageLayout';
import { useTokenMetadataSelector } from 'app/store/tokens-metadata/selectors';
import { AssetIcon } from 'app/templates/AssetIcon';
import { fromFa2TokenSlug } from 'lib/assets/utils';
import { T } from 'lib/i18n';
import { getAssetName } from 'lib/metadata';
import { useAccount, useBalance } from 'lib/temple/front';
import useCopyToClipboard from 'lib/ui/useCopyToClipboard';
import { navigate } from 'lib/woozie';

import Blur from './CollectibleItemImage/bg.png';

interface Props {
  assetSlug: string;
}

const CollectiblePage: FC<Props> = ({ assetSlug }) => {
  const [isShowBlur, setIsShowBlur] = useState(true);

  const [assetContract, assetId] = useMemo(
    () => [fromFa2TokenSlug(assetSlug).contract, new BigNumber(fromFa2TokenSlug(assetSlug).id)],
    [assetSlug]
  );

  const account = useAccount();
  const accountPkh = account.publicKeyHash;
  const { data: collectibleBalance } = useBalance(assetSlug, accountPkh, {
    suspense: false
  });

  const { copy } = useCopyToClipboard();
  const collectibleData = useTokenMetadataSelector(assetSlug);

  const collectibleName = getAssetName(collectibleData);

  const handleTapToRevealClick = () => setIsShowBlur(false);

  return (
    <PageLayout pageTitle={collectibleName}>
      <div style={{ maxWidth: '360px', margin: 'auto' }} className="text-center pb-4">
        <div className={classNames('w-full max-w-sm mx-auto')}>
          <div style={{ borderRadius: '12px', width: '320px' }} className={'border border-gray-300 p-6 mx-auto my-10'}>
            {isShowBlur ? (
              <button
                className="relative flex justify-center items-center h-full w-full"
                onClick={handleTapToRevealClick}
              >
                <img className="h-full w-full" src={Blur} alt="Adult content" />
                <div className="absolute z-10 flex flex-col justify-center items-center">
                  <svg
                    className="mb-3"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 32 32"
                    width="40"
                    height="40"
                    fill="none"
                  >
                    <path
                      stroke="#1B262C"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M18.827 18.827a4.002 4.002 0 0 1-6.636-1.23 4 4 0 0 1 .982-4.424M23.92 23.92A13.427 13.427 0 0 1 16 26.667C6.667 26.667 1.334 16 1.334 16A24.6 24.6 0 0 1 8.08 8.08l15.84 15.84ZM13.2 5.653a12.159 12.159 0 0 1 2.8-.32C25.334 5.333 30.667 16 30.667 16a24.666 24.666 0 0 1-2.88 4.253L13.2 5.653ZM1.333 1.333l29.334 29.334"
                    />
                  </svg>
                  <span className="text-base text-gray-910 font-semibold">Click to reveal</span>
                </div>
              </button>
            ) : (
              <AssetIcon assetSlug={assetSlug} />
            )}
          </div>
        </div>

        <Divider />

        <div className="flex justify-between items-baseline mt-4 mb-4">
          <p className="text-gray-600 text-xs">
            <T id={'name'} />
          </p>
          <p className="text-xs text-gray-910">{collectibleName}</p>
        </div>

        <div className="flex justify-between items-baseline mt-4 mb-4">
          <p className="text-gray-600 text-xs">
            <T id={'amount'} />
          </p>
          <p className="text-xs text-gray-910">{collectibleBalance ? collectibleBalance.toFixed() : ''}</p>
        </div>

        <div className="flex justify-between items-baseline mb-4">
          <p className="text-gray-600 text-xs">
            <T id={'address'} />
          </p>
          <span className={'flex align-middle'}>
            <p className="text-xs inline align-text-bottom text-gray-910">
              <HashShortView hash={assetContract} />
            </p>

            <CopyButton text={assetContract} type="link">
              <CopyIcon
                style={{ verticalAlign: 'inherit' }}
                className={classNames('h-4 ml-1 w-auto inline', 'stroke-orange stroke-2')}
                onClick={() => copy()}
              />
            </CopyButton>
          </span>
        </div>

        <div className="flex justify-between items-baseline mb-4">
          <p className="text-gray-600 text-xs">
            <T id={'id'} />
          </p>

          <span className={'flex align-middle'}>
            <p className="text-xs inline align-text-bottom text-gray-910">{assetId.toFixed()}</p>

            <CopyButton text={assetId.toFixed()} type="link">
              <CopyIcon
                style={{ verticalAlign: 'inherit' }}
                className={classNames('h-4 ml-1 w-auto inline', 'stroke-orange stroke-2')}
                onClick={() => copy()}
              />
            </CopyButton>
          </span>
        </div>

        <Divider />

        <FormSubmitButton
          className="w-full justify-center border-none"
          style={{
            padding: '10px 2rem',
            background: '#4299e1',
            marginTop: '24px'
          }}
          onClick={() => navigate(`/send/${assetSlug}`)}
        >
          <T id={'send'} />
        </FormSubmitButton>
      </div>
    </PageLayout>
  );
};

export default CollectiblePage;
