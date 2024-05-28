import { createReducer } from '@reduxjs/toolkit';

import { setIsAnalyticsEnabledAction, setOnRampPossibilityAction } from './actions';
import { SettingsState, settingsInitialState } from './state';

export const settingsReducer = createReducer<SettingsState>(settingsInitialState, builder => {
  builder.addCase(setIsAnalyticsEnabledAction, (state, { payload }) => {
    state.isAnalyticsEnabled = payload;
  });

  builder.addCase(setOnRampPossibilityAction, (state, { payload }) => {
    state.isOnRampPossibility = payload;
  });
});
