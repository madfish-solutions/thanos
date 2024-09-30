import React, { memo, useCallback, useMemo } from 'react';

import { startCase } from 'lodash';

import { IconBase } from 'app/atoms';
import { ReactComponent as LocktimeIcon } from 'app/icons/base/locktime.svg';
import { NEVER_AUTOLOCK_VALUE } from 'lib/constants';
import { t } from 'lib/i18n';
import { formatDuration } from 'lib/i18n/core';
import { useLockUpTimeout } from 'lib/lock-up';
import { SearchKey } from 'lib/utils/search-items';

import { CellPartProps, NullComponent, SelectWithModal } from '../select-with-modal';

import { SecuritySettingsSelectors } from './selectors';

interface DurationOption {
  value: number;
  label: string;
}

const durationOptionsValues = [NEVER_AUTOLOCK_VALUE, 60, 5 * 60, 30 * 60, 60 * 60, 5 * 60 * 60];
const DEFAULT_OPTION_INDEX = 2;
const SEARCH_KEYS: Array<SearchKey<DurationOption, null>> = [];
const durationOptionKeyFn = ({ value }: DurationOption) => value;

const CellName = ({ option: { label } }: CellPartProps<DurationOption>) => <span>{label}</span>;
const AutoLockIcon = () => <IconBase size={16} Icon={LocktimeIcon} className="text-primary" />;

export const AutoLockSelect = memo(() => {
  const [timeoutDurationMs, setTimeoutDurationMs] = useLockUpTimeout();
  const options = useMemo(
    () =>
      durationOptionsValues.map(value => ({
        value,
        label: value === NEVER_AUTOLOCK_VALUE ? t('never') : startCase(formatDuration(value))
      })),
    []
  );
  const value = useMemo(
    () => options.find(({ value }) => value * 1000 === timeoutDurationMs) ?? options[DEFAULT_OPTION_INDEX],
    [options, timeoutDurationMs]
  );
  const handleAutoLockOptionSelect = useCallback(
    ({ value }: DurationOption) => setTimeoutDurationMs(value * 1000),
    [setTimeoutDurationMs]
  );

  return (
    <SelectWithModal
      title={t('autoLock')}
      options={options}
      value={value}
      searchKeys={SEARCH_KEYS}
      keyFn={durationOptionKeyFn}
      CellIcon={AutoLockIcon}
      ModalCellIcon={NullComponent}
      CellName={CellName}
      onSelect={handleAutoLockOptionSelect}
      testID={SecuritySettingsSelectors.autoLockTimeDropDown}
      itemTestID={SecuritySettingsSelectors.autoLockTimeItem}
    />
  );
});
