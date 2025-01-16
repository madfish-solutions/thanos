import React, { useCallback } from 'react';

import { useDispatch } from 'react-redux';

import { DataPlaceholder } from 'app/atoms';
import PageLayout from 'app/layouts/PageLayout';
import { useShouldShowPartnersPromoSelector } from 'app/store/partners-promotion/selectors';
import { PartnersPromotion, PartnersPromotionVariant } from 'app/templates/partners-promotion';
import { EnvVars } from 'lib/env';
import { T } from 'lib/i18n';
import { BellIcon } from 'lib/icons';
import { useTimeout } from 'lib/ui/hooks';

import { viewAllNotificationsAction } from '../../store/actions';
import { useNotificationsSelector } from '../../store/selectors';

import { NotificationPreviewItem } from './preview-item';

const VIEW_ALL_NOTIFICATIONS_TIMEOUT = 5 * 1000;

export const Notifications = () => {
  const dispatch = useDispatch();
  const notifications = useNotificationsSelector();
  const shouldShowPartnersPromoState = useShouldShowPartnersPromoSelector();

  const viewAllNotifications = useCallback(() => void dispatch(viewAllNotificationsAction()), [dispatch]);

  useTimeout(viewAllNotifications, VIEW_ALL_NOTIFICATIONS_TIMEOUT, true, [notifications]);

  return (
    <PageLayout
      pageTitle={
        <>
          <BellIcon className="w-auto h-4 mr-1 stroke-current" />
          <T id="notifications" />
        </>
      }
      contentContainerStyle={{ padding: 0 }}
    >
      <div className="max-w-sm mx-auto pb-15">
        {shouldShowPartnersPromoState && (
          <div className="pt-6 pb-4 flex justify-center">
            <PartnersPromotion
              id="promo-notifications-item"
              variant={PartnersPromotionVariant.Image}
              pageName="Notifications"
              withPersonaProvider={EnvVars.PERSONA_ADS_ENABLED}
            />
          </div>
        )}
        {notifications.length === 0 ? (
          <DataPlaceholder id="notificationsNotFound" />
        ) : (
          notifications.map(notification => (
            <NotificationPreviewItem key={notification.id} notification={notification} />
          ))
        )}
      </div>
    </PageLayout>
  );
};
