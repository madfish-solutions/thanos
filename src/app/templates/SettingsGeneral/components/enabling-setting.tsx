import React, { ReactNode, memo } from 'react';

import { ToggleSwitch } from 'app/atoms';
import { SettingsCell } from 'app/atoms/SettingsCell';
import { SettingsCellGroup } from 'app/atoms/SettingsCellGroup';

interface EnablingSettingProps {
  title: ReactNode;
  enabled: boolean;
  description: ReactNode;
  onChange: SyncFn<boolean>;
  testID: string;
}

export const EnablingSetting = memo(({ title, enabled, description, onChange, testID }: EnablingSettingProps) => (
  <SettingsCellGroup>
    <SettingsCell Component="div" isLast={false} cellName={title}>
      <ToggleSwitch checked={enabled} onChange={onChange} testID={testID} />
    </SettingsCell>
    <SettingsCell
      Component="div"
      cellName={<span className="text-grey-1 text-font-description font-normal">{description}</span>}
    >
      {null}
    </SettingsCell>
  </SettingsCellGroup>
));