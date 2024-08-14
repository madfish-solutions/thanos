import React, { memo, FunctionComponent, SVGProps, useMemo } from 'react';

import { ChainIds } from '@taquito/taquito';
import clsx from 'clsx';
import { Props as TippyProps } from 'tippy.js';

import { Anchor, IconBase } from 'app/atoms';
import { ReactComponent as ActivityIcon } from 'app/icons/base/activity.svg';
import { ReactComponent as MarketIcon } from 'app/icons/base/card.svg';
import { ReactComponent as ReceiveIcon } from 'app/icons/base/income.svg';
import { ReactComponent as SendIcon } from 'app/icons/base/send.svg';
import { ReactComponent as SwapIcon } from 'app/icons/base/swap.svg';
import { buildSendPagePath } from 'app/pages/Send/build-url';
import { buildSwapPageUrlQuery } from 'app/pages/Swap/utils/build-url-query';
import { TestIDProps } from 'lib/analytics';
import { TID, T, t } from 'lib/i18n';
import { TempleAccountType } from 'lib/temple/types';
import useTippy from 'lib/ui/useTippy';
import { createUrl, Link, To } from 'lib/woozie';
import { createLocationState } from 'lib/woozie/location';
import { useAccount } from 'temple/front';
import { TempleChainKind } from 'temple/types';

import { HomeProps } from './interfaces';
import { HomeSelectors } from './selectors';

const tippyPropsMock = {
  trigger: 'mouseenter',
  hideOnClick: false,
  content: t('disabledForWatchOnlyAccount'),
  animation: 'shift-away-subtle'
};

export const ActionButtonsBar = memo<HomeProps>(({ chainKind, chainId, assetSlug }) => {
  const account = useAccount();

  const canSend = account.type !== TempleAccountType.WatchOnly;
  const sendLink = buildSendPagePath(chainKind, chainId, assetSlug);

  const swapLink = useMemo(
    () => ({
      pathname: '/swap',
      search:
        chainKind === TempleChainKind.Tezos && chainId === ChainIds.MAINNET
          ? buildSwapPageUrlQuery(assetSlug)
          : undefined
    }),
    [chainKind, chainId, assetSlug]
  );

  return (
    <div className="flex justify-between gap-x-2 h-13.5 mt-4">
      <ActionButton labelI18nKey="receive" Icon={ReceiveIcon} to="/receive" testID={HomeSelectors.receiveButton} />

      <ActionButton labelI18nKey="market" Icon={MarketIcon} to="/market" testID={HomeSelectors.marketButton} />

      <ActionButton
        labelI18nKey="swap"
        Icon={SwapIcon}
        to={swapLink}
        disabled={!canSend}
        tippyProps={tippyPropsMock}
        testID={HomeSelectors.swapButton}
      />

      <ActionButton
        labelI18nKey="activity"
        Icon={ActivityIcon}
        to={{ search: 'tab=activity' }}
        testID={HomeSelectors.activityButton}
      />

      <ActionButton
        labelI18nKey="send"
        Icon={SendIcon}
        to={sendLink}
        disabled={!canSend}
        tippyProps={tippyPropsMock}
        testID={HomeSelectors.sendButton}
      />
    </div>
  );
});

interface ActionButtonProps extends TestIDProps {
  labelI18nKey: TID;
  Icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  to: To;
  disabled?: boolean;
  isAnchor?: boolean;
  tippyProps?: Partial<TippyProps>;
}

const ActionButton = memo<ActionButtonProps>(
  ({ labelI18nKey, Icon, to, disabled, isAnchor, tippyProps = {}, testID, testIDProperties }) => {
    const buttonRef = useTippy<HTMLButtonElement>({
      ...tippyProps,
      content: disabled && !tippyProps.content ? t('disabled') : tippyProps.content
    });

    const commonButtonProps = useMemo(
      () => ({
        className: clsx(
          'flex-1 max-w-16 flex flex-col gap-y-0.5 p-2 items-center justify-center rounded-lg',
          disabled
            ? 'bg-disable text-grey-2'
            : 'bg-primary-low text-primary hover:bg-primary-hover-low hover:text-primary-hover'
        ),
        type: 'button' as const,
        children: (
          <>
            <IconBase Icon={Icon} size={24} />

            <span className="text-font-small-bold">
              <T id={labelI18nKey} />
            </span>
          </>
        )
      }),
      [disabled, Icon, labelI18nKey]
    );

    if (disabled) {
      return <button ref={buttonRef} {...commonButtonProps} />;
    }

    if (isAnchor) {
      let href: string;
      if (typeof to === 'string') {
        href = to;
      } else {
        const { pathname, search, hash } = typeof to === 'function' ? to(createLocationState()) : to;
        href = createUrl(pathname, search, hash);
      }

      return <Anchor testID={testID} testIDProperties={testIDProperties} href={href} {...commonButtonProps} />;
    }

    return <Link testID={testID} testIDProperties={testIDProperties} to={to} {...commonButtonProps} />;
  }
);
