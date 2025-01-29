import React, { memo, useLayoutEffect, useMemo } from 'react';

import RootSuspenseFallback from 'app/a11y/RootSuspenseFallback';
import { OpenInFullPage, useAppEnv } from 'app/env';
import { AccountSettings } from 'app/pages/AccountSettings';
import { BuyWithCreditCard } from 'app/pages/BuyWithCreditCard/BuyWithCreditCard';
import CollectiblePage from 'app/pages/Collectibles/CollectiblePage';
import ConnectLedger from 'app/pages/ConnectLedger/ConnectLedger';
import Delegate from 'app/pages/Delegate';
import Home from 'app/pages/Home/Home';
import AttentionPage from 'app/pages/Onboarding/pages/AttentionPage';
import { Receive } from 'app/pages/Receive/Receive';
import Send from 'app/pages/Send';
import Settings from 'app/pages/Settings/Settings';
import { Swap } from 'app/pages/Swap/Swap';
import Unlock from 'app/pages/Unlock/Unlock';
import Welcome from 'app/pages/Welcome/Welcome';
import { usePageRouterAnalytics } from 'lib/analytics';
import { Notifications, NotificationsItem } from 'lib/notifications/components';
import { useTempleClient } from 'lib/temple/front';
import * as Woozie from 'lib/woozie';
import { TempleChainKind } from 'temple/types';

import { ActivityPage } from './pages/Activity';
import { ChainSettings } from './pages/ChainSettings';
import { EarnTezPage } from './pages/EarnTez';
import { ImportWallet } from './pages/ImportWallet';
import { Market } from './pages/Market';
import { RewardsPage } from './pages/Rewards';
import { StakingPage } from './pages/Staking';
import { TokenPage } from './pages/Token';

interface RouteContext {
  popup: boolean;
  fullPage: boolean;
  ready: boolean;
  locked: boolean;
}

type RouteFactory = Woozie.ResolveResult<RouteContext>;

const ROUTE_MAP = Woozie.createMap<RouteContext>([
  [
    '/import-wallet',
    (_p, ctx) => {
      if (ctx.ready) {
        return Woozie.SKIP;
      }

      if (!ctx.fullPage) {
        return <OpenInFullPage />;
      }

      return <ImportWallet />;
    }
  ],
  [
    '*',
    (_p, ctx) => {
      switch (true) {
        case ctx.locked:
          return <Unlock />;

        case !ctx.ready && !ctx.fullPage:
          return <OpenInFullPage />;

        default:
          return Woozie.SKIP;
      }
    }
  ],
  ['/loading', (_p, ctx) => (ctx.ready ? <Woozie.Redirect to={'/'} /> : <RootSuspenseFallback />)],
  ['/', (_p, ctx) => (ctx.ready ? <Home /> : <Welcome />)],
  ['/activity', onlyReady(() => <ActivityPage />)],
  ['/connect-ledger', onlyReady(onlyInFullPage(() => <ConnectLedger />))],
  ['/receive/:chainKind?', onlyReady(({ chainKind }) => <Receive chainKind={chainKind} />)],
  [
    '/send/:chainKind?/:chainId?/:assetSlug?',
    onlyReady(({ chainKind, chainId, assetSlug }) => (
      <Send chainKind={chainKind} chainId={chainId} assetSlug={assetSlug} />
    ))
  ],
  ['/swap', onlyReady(() => <Swap />)],
  ['/delegate/:tezosChainId', onlyReady(({ tezosChainId }) => <Delegate tezosChainId={tezosChainId!} />)],
  ['/staking/:tezosChainId', onlyReady(({ tezosChainId }) => <StakingPage tezosChainId={tezosChainId!} />)],
  ['/earn-tez/:tezosChainId', onlyReady(({ tezosChainId }) => <EarnTezPage tezosChainId={tezosChainId!} />)],
  [
    '/token/:chainKind?/:chainId?/:assetSlug?',
    onlyReady(({ chainKind, chainId, assetSlug }) => (
      <TokenPage chainKind={chainKind!} chainId={chainId!} assetSlug={assetSlug!} />
    ))
  ],
  [
    '/collectible/:chainKind?/:chainId?/:assetSlug?',
    onlyReady(({ chainKind, chainId, assetSlug }) => (
      <CollectiblePage chainKind={chainKind!} chainId={chainId!} assetSlug={assetSlug!} />
    ))
  ],
  [
    '/settings/networks/:chainKind/:chainId',
    onlyReady(({ chainId, chainKind }) => <ChainSettings chainKind={chainKind as TempleChainKind} chainId={chainId!} />)
  ],
  ['/settings/:tabSlug?', onlyReady(({ tabSlug }) => <Settings tabSlug={tabSlug} />)],
  ['/market', onlyReady(() => <Market />)],
  ['/buy/debit', onlyReady(onlyInFullPage(() => <BuyWithCreditCard />))],
  ['/attention', onlyReady(onlyInFullPage(() => <AttentionPage />))],
  ['/notifications', onlyReady(() => <Notifications />)],
  ['/notifications/:id', onlyReady(({ id }) => <NotificationsItem id={Number(id) ?? 0} />)],
  ['/account/:id', onlyReady(({ id }) => <AccountSettings id={id!} />)],
  ['/rewards', onlyReady(() => <RewardsPage />)],
  ['*', () => <Woozie.Redirect to="/" />]
]);

export const PageRouter = memo(() => {
  const { trigger, pathname, search } = Woozie.useLocation();

  // Scroll to top after new location pushed.
  useLayoutEffect(() => {
    if (trigger === Woozie.HistoryAction.Push) {
      window.scrollTo(0, 0);
    }

    if (pathname === '/') {
      Woozie.resetHistoryPosition();
    }
  }, [trigger, pathname]);

  const appEnv = useAppEnv();
  const temple = useTempleClient();

  const ctx = useMemo<RouteContext>(
    () => ({
      popup: appEnv.popup,
      fullPage: appEnv.fullPage,
      ready: temple.ready,
      locked: temple.locked
    }),
    [appEnv.popup, appEnv.fullPage, temple.ready, temple.locked]
  );

  usePageRouterAnalytics(pathname, search, ctx.ready);

  return useMemo(() => Woozie.resolve(ROUTE_MAP, pathname, ctx), [pathname, ctx]);
});

function onlyReady(factory: RouteFactory): RouteFactory {
  return (params, ctx) => (ctx.ready ? factory(params, ctx) : Woozie.SKIP);
}

function onlyInFullPage(factory: RouteFactory): RouteFactory {
  return (params, ctx) => (!ctx.fullPage ? <OpenInFullPage /> : factory(params, ctx));
}
