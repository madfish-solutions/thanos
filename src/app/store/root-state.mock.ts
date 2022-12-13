import { mockNotificationsState } from 'lib/notifications';

import { mockAdvertisingState } from './advertising/state.mock';
import { mockCurrencyState } from './currency/state.mock';
import { mockDAppsState } from './d-apps/state.mock';
import { RootState } from './index';

// ts-prune-ignore-next
export const mockRootState: RootState = {
  advertising: mockAdvertisingState,
  currency: mockCurrencyState,
  notifications: mockNotificationsState,
  dApps: mockDAppsState
};