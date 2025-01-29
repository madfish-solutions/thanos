import { HomeSelectors } from 'src/app/pages/Home/selectors';
import { ExploreActionButtonsSelectors } from 'src/app/templates/ExploreActionButtons/selectors';

import { Page } from '../../classes/page.class';
import { createPageElement } from '../../utils/search.utils';

export class HomePage extends Page {
  receiveButton = createPageElement(ExploreActionButtonsSelectors.receiveButton);
  marketButton = createPageElement(ExploreActionButtonsSelectors.marketButton);
  sendButton = createPageElement(ExploreActionButtonsSelectors.sendButton);
  activityButton = createPageElement(ExploreActionButtonsSelectors.activityButton);
  swapButton = createPageElement(ExploreActionButtonsSelectors.activityButton);
  accountMenuButton = createPageElement(HomeSelectors.accountMenuButton);
  accountIcon = createPageElement(HomeSelectors.accountIcon);

  async isVisible() {
    await this.receiveButton.waitForDisplayed();
    await this.marketButton.waitForDisplayed();
    await this.sendButton.waitForDisplayed();
    await this.activityButton.waitForDisplayed();
    await this.swapButton.waitForDisplayed();
    await this.accountMenuButton.waitForDisplayed();
    await this.accountIcon.waitForDisplayed();
  }
}
