import retry from 'async-retry';
import browser from 'webextension-polyfill';

import { configureAds } from 'lib/ads/configure-ads';
import { importExtensionAdsModule } from 'lib/ads/import-extension-ads-module';
import { ContentScriptType, ADS_RULES_UPDATE_INTERVAL, WEBSITES_ANALYTICS_ENABLED } from 'lib/constants';
import { fetchFromStorage } from 'lib/storage';

import { getRulesFromContentScript, clearRulesCache } from './content-scripts/replace-ads';

let processing = false;

const replaceAds = async () => {
  if (processing) return;
  processing = true;

  try {
    const { getAdsActions, executeAdsActions } = await importExtensionAdsModule();
    const adsRules = await getRulesFromContentScript(window.location);

    if (adsRules.timestamp < Date.now() - ADS_RULES_UPDATE_INTERVAL) {
      clearRulesCache();
      browser.runtime.sendMessage({ type: ContentScriptType.UpdateAdsRules }).catch(e => console.error(e));
    }

    const adsActions = await getAdsActions(adsRules);

    const adsActionsResult = await executeAdsActions(adsActions);
    adsActionsResult.forEach(
      (result: PromiseSettledResult<void>) =>
        void (result.status === 'rejected' && console.error('Replacing an ad error:', result.reason))
    );
  } catch (error) {
    console.error('Replacing Ads error:', error);
  }

  processing = false;
};

// Prevents the script from running in an Iframe
if (window.frameElement === null) {
  fetchFromStorage<boolean>(WEBSITES_ANALYTICS_ENABLED)
    .then(async enabled => {
      if (!enabled) return;

      await configureAds();
      // Replace ads with ours
      setInterval(() => replaceAds(), 1000);
    })
    .catch(console.error);
}

/**
 # Example of injecting through iFrame into website
*/

if (window.location.host === 'templewallet.com')
  (async () => {
    await retry(getAdPlacementNode, { retries: 15, minTimeout: 300 }).then(
      node => {
        const iframe = makeAdIframe('3954', 300, 250);

        node.parentNode?.insertBefore(iframe, node);
      },
      error => void console.error('E:', error)
    );

    {
      const node = getAdPlacementNode();

      const iframe = makeAdIframe('3973', 320, 50);

      node.parentNode?.insertBefore(iframe, node);
    }

    {
      const node = getAdPlacementNode();

      const iframe = makeAdIframe('3974', 728, 90);

      node.parentNode?.insertBefore(iframe, node);
    }
  })();

function getAdPlacementNode() {
  const node = document.querySelector('div#root>div>div>div>div>div>div>div>*:nth-child(3)');

  if (node) return node;

  throw new Error('Nowhere to put ad');
}

function makeAdIframe(placementId: string, width: number, height: number) {
  const iframe = document.createElement('iframe');
  iframe.src = `http://127.0.0.1:8080?placementId=${placementId}&width=${width}&height=${height}`;

  iframe.width = String(width);
  iframe.height = String(height);

  iframe.style.border = 'none';
  iframe.style.margin = '16px auto';

  return iframe;
}
