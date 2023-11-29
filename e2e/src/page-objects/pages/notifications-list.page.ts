import { PreviewItemSelectors } from 'src/lib/notifications/components/notifications/preview-item.selectors';
import type { NotificationInterface } from 'src/lib/notifications/types';

import { VERY_SHORT_TIMEOUT } from 'e2e/src/utils/timing.utils';

import { Page } from '../../classes/page.class';
import { createPageElement } from '../../utils/search.utils';

export class NotificationsListPage extends Page {
  newNotification?: NotificationInterface;
  notificationItem = createPageElement(PreviewItemSelectors.notificationItem);
  notificationItemTitleText = createPageElement(PreviewItemSelectors.notificationItemTitleText);
  notificationItemDescriptionText = createPageElement(PreviewItemSelectors.notificationItemDescriptionText);

  async isVisible() {
    await this.notificationItem.waitForDisplayed();
    await this.notificationItemTitleText.waitForDisplayed();
    await this.notificationItemDescriptionText.waitForDisplayed();
  }

  async isNotificationDisplayed({ id, title, description }: NotificationInterface) {
    const notificationTextElem = createPageElement(PreviewItemSelectors.notificationItem, { id: String(id) });

    await notificationTextElem.waitForDisplayed(
      VERY_SHORT_TIMEOUT,
      `Notification with ${title} title is not displayed`
    );

    const titleText = await notificationTextElem
      .createChildElement(PreviewItemSelectors.notificationItemTitleText)
      .getText();
    if (titleText !== title) throw new Error(`Notification title missmatch. Got: ${titleText}`);

    const descriptionText = await notificationTextElem
      .createChildElement(PreviewItemSelectors.notificationItemDescriptionText)
      .getText();
    if (descriptionText !== description) throw new Error(`Notification description missmatch. Got: ${descriptionText}`);
  }

  async clickOnTheNotification({ id }: NotificationInterface) {
    const notificationTextElem = createPageElement(PreviewItemSelectors.notificationItem, { id: String(id) });
    await notificationTextElem.click();
  }

  async isNotificationNotDisplayed({ id, title }: NotificationInterface) {
    const notificationTextElem = createPageElement(PreviewItemSelectors.notificationItem, { id: String(id) });

    await notificationTextElem.waitForDisplayed().then(
      () => {
        throw new Error(`The notification '${title}' is displayed after turning off 'news' checkbox in settings`);
      },
      () => undefined
    );
  }
}
