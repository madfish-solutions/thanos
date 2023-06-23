import { Given } from '@cucumber/cucumber';
import retry from 'async-retry';
import { InternalConfirmationSelectors } from 'src/app/templates/InternalConfirmation.selectors';
import { SwapFormSelectors } from 'src/app/templates/SwapForm/SwapForm.selectors';

import { Pages } from 'e2e/src/page-objects';
import { iSelectTokenSlugs } from 'e2e/src/utils/input-data.utils';
import { createPageElement } from 'e2e/src/utils/search.utils';
import { MEDIUM_TIMEOUT, VERY_LONG_TIMEOUT } from 'e2e/src/utils/timing.utils';

import { BrowserContext } from '../classes/browser-context.class';

Given(
  /I select (.*) token in the token drop-down list on the Swap page/,
  { timeout: VERY_LONG_TIMEOUT },
  async (key: keyof typeof iSelectTokenSlugs) => {
    const assetsSlug = iSelectTokenSlugs[key];

    await Pages.Swap.selectAsset(assetsSlug);
  }
);

Given(/I click on animated Swap button on the Swap page/, { timeout: MEDIUM_TIMEOUT }, async () => {
  const elem = createPageElement(SwapFormSelectors.swapButton, undefined, { loading: '' });
  const confirmButton = createPageElement(InternalConfirmationSelectors.confirmButton);

  await retry(
    async () => {
      await elem.click();
      await confirmButton.waitForDisplayed(5000);
    },
    { retries: 3 }
  );
});
