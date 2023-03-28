import { createReducer } from '@reduxjs/toolkit';

import { setIsAnalyticsEnabledAction } from './actions';
import { settingsInitialState, SettingsState } from './state';

export const settingsReducer = createReducer<SettingsState>(settingsInitialState, builder => {
  builder.addCase(setIsAnalyticsEnabledAction, (state, { payload: isAnalyticsEnabled }) => ({
    ...state,
    isAnalyticsEnabled
  }));
});
