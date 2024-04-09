import React, { memo, useCallback } from 'react';

import clsx from 'clsx';

import { Button } from 'app/atoms/Button';
import { AssetsSelectors } from 'app/pages/Home/OtherComponents/Assets.selectors';
import { dispatch } from 'app/store';
import { setTokenStatusAction } from 'app/store/tezos/assets/actions';
import { t, T } from 'lib/i18n';
import { useConfirm } from 'lib/ui/dialog';
import { useTezosNetwork } from 'temple/front';

import modStyles from '../../Tokens.module.css';

interface Props {
  assetSlug: string;
  tezPkh: string;
}

export const ScamTag = memo<Props>(({ assetSlug, tezPkh }) => {
  const { chainId } = useTezosNetwork();

  const confirm = useConfirm();

  const removeToken = useCallback(
    async (slug: string) => {
      try {
        const confirmed = await confirm({
          title: t('deleteScamTokenConfirmTitle'),
          titleClassName: 'font-bold',
          description: t('deleteScamTokenConfirmDescription'),
          comfirmButtonText: t('delete')
        });

        if (confirmed)
          dispatch(
            setTokenStatusAction({
              account: tezPkh,
              chainId,
              slug,
              status: 'removed'
            })
          );
      } catch (err: any) {
        console.error(err);
        alert(err.message);
      }
    },
    [chainId, tezPkh, confirm]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      removeToken(assetSlug);
    },
    [assetSlug, removeToken]
  );

  return (
    <Button
      onClick={handleClick}
      className={clsx('uppercase ml-2 px-2 py-1', modStyles.tagBase, modStyles.scamTag)}
      testID={AssetsSelectors.assetItemScamButton}
    >
      <T id="scam" />
    </Button>
  );
});
