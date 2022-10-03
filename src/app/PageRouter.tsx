import React, { FC, useLayoutEffect, useMemo } from 'react';

import { useDispatch } from 'react-redux';

import { OpenInFullPage, useAppEnv } from 'app/env';
import AddAsset from 'app/pages/AddAsset';
import Exolix from 'app/pages/Buy/Crypto/Exolix/Exolix';
import CollectiblePage from 'app/pages/Collectibles/CollectiblePage';
import ConnectLedger from 'app/pages/ConnectLedger';
import CreateAccount from 'app/pages/CreateAccount';
import DApps from 'app/pages/DApps';
import Delegate from 'app/pages/Delegate';
import Explore from 'app/pages/Explore';
import ImportAccount from 'app/pages/ImportAccount';
import ManageAssets from 'app/pages/ManageAssets';
import { CreateWallet } from 'app/pages/NewWallet/CreateWallet';
import { ImportWallet } from 'app/pages/NewWallet/ImportWallet';
import Receive from 'app/pages/Receive';
import Send from 'app/pages/Send';
import Settings from 'app/pages/Settings';
import { Swap } from 'app/pages/Swap/Swap';
import Unlock from 'app/pages/Unlock';
import Welcome from 'app/pages/Welcome';
import { usePageRouterAnalytics } from 'lib/analytics';
import { useLocalStorage, useTempleClient } from 'lib/temple/front';
import { TempleNotificationsSharedStorageKey } from 'lib/temple/types';
import * as Woozie from 'lib/woozie';

import RootSuspenseFallback from './a11y/RootSuspenseFallback';
import { useTimerEffect } from './hooks/use-timer-effect.hook';
import { Buy } from './pages/Buy/Buy';
import { AliceBob } from './pages/Buy/Debit/AliceBob/AliceBob';
import { Utorg } from './pages/Buy/Debit/Utorg/Utorg';
import { NewsNotificationsItemDetails } from './pages/Notifications/NewsNotifications/NewsNotificationsItemDetails';
import { Notifications } from './pages/Notifications/Notifications';
import AttentionPage from './pages/Onboarding/pages/AttentionPage';
import { loadNewsAction } from './store/news/news-actions';

interface RouteContext {
  popup: boolean;
  fullPage: boolean;
  ready: boolean;
  locked: boolean;
}

type RouteFactory = Woozie.ResolveResult<RouteContext>;

const ROUTE_MAP = Woozie.createMap<RouteContext>([
  [
    '/import-wallet/:tabSlug?',
    (p, ctx) => {
      switch (true) {
        case ctx.ready:
          return Woozie.SKIP;

        case !ctx.fullPage:
          return <OpenInFullPage />;

        default:
          return <ImportWallet key={p.tabSlug ?? ''} tabSlug={p.tabSlug ?? undefined} />;
      }
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
  ['/', (_p, ctx) => (ctx.ready ? <Explore /> : <Welcome />)],
  ['/explore/:assetSlug?', onlyReady(({ assetSlug }) => <Explore assetSlug={assetSlug} />)],
  ['/create-wallet', onlyNotReady(() => <CreateWallet />)],
  ['/create-account', onlyReady(() => <CreateAccount />)],
  ['/import-account/:tabSlug?', onlyReady(({ tabSlug }) => <ImportAccount tabSlug={tabSlug} />)],
  ['/connect-ledger', onlyReady(onlyInFullPage(() => <ConnectLedger />))],
  ['/receive', onlyReady(() => <Receive />)],
  ['/send/:assetSlug?', onlyReady(({ assetSlug }) => <Send assetSlug={assetSlug} />)],
  ['/swap', onlyReady(() => <Swap />)],
  ['/delegate', onlyReady(() => <Delegate />)],
  ['/dapps', onlyReady(() => <DApps />)],
  ['/notifications', onlyReady(() => <Notifications />)],
  [
    '/notifications/news/:newsId?',
    onlyReady(params => <NewsNotificationsItemDetails key={params.newsId ?? ''} id={params.newsId ?? ''} />)
  ],
  ['/manage-assets/:assetType?', onlyReady(({ assetType }) => <ManageAssets assetType={assetType!} />)],
  ['/collectible/:assetSlug?', onlyReady(({ assetSlug }) => <CollectiblePage assetSlug={assetSlug!} />)],
  ['/add-asset', onlyReady(onlyInFullPage(() => <AddAsset />))],
  ['/settings/:tabSlug?', onlyReady(({ tabSlug }) => <Settings tabSlug={tabSlug} />)],
  ['/buy', onlyReady(onlyInFullPage(() => <Buy />))],
  ['/buy/crypto', onlyReady(onlyInFullPage(() => <Exolix />))],
  ['/buy/debit/alice-bob', onlyReady(onlyInFullPage(() => <AliceBob />))],
  ['/buy/debit/utorg', onlyReady(onlyInFullPage(() => <Utorg />))],
  ['/attention', onlyReady(onlyInFullPage(() => <AttentionPage />))],
  ['*', () => <Woozie.Redirect to="/" />]
]);

// once per hour
const NEWS_REFRESH_INTERVAL = 60 * 60 * 1000;

const PageRouter: FC = () => {
  const dispatch = useDispatch();
  const [newsNotificationsEnabled] = useLocalStorage<boolean>(
    TempleNotificationsSharedStorageKey.NewsNotificationsEnabled,
    true
  );
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

  const initDataLoading = () => {
    if (newsNotificationsEnabled) {
      dispatch(loadNewsAction.submit());
    }
  };

  useTimerEffect(initDataLoading, NEWS_REFRESH_INTERVAL, []);

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
};

export default PageRouter;

function onlyReady(factory: RouteFactory): RouteFactory {
  return (params, ctx) => (ctx.ready ? factory(params, ctx) : Woozie.SKIP);
}

function onlyNotReady(factory: RouteFactory): RouteFactory {
  return (params, ctx) => (ctx.ready ? Woozie.SKIP : factory(params, ctx));
}

function onlyInFullPage(factory: RouteFactory): RouteFactory {
  return (params, ctx) => (!ctx.fullPage ? <OpenInFullPage /> : factory(params, ctx));
}
