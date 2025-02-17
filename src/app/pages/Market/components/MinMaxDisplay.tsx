import React, { memo } from 'react';

import clsx from 'clsx';
import { FieldError } from 'react-hook-form-v7';

import { T } from 'lib/i18n';

export enum ErrorType {
  min = 'min',
  max = 'max'
}

const COMMON_TEXT_CLASSNAME = 'cursor-pointer text-font-num-12 ml-0.5';

interface MinMaxDisplayProps {
  currencyCode: string;
  error?: FieldError;
  min?: number;
  max?: number;
  onMinClick?: EmptyFn;
  onMaxClick?: EmptyFn;
}

export const MinMaxDisplay = memo<MinMaxDisplayProps>(({ currencyCode, error, min, max, onMinClick, onMaxClick }) => {
  const isMinError = error?.message === ErrorType.min;
  const ismMaxError = error?.message === ErrorType.max;

  return (
    <div className="flex items-center text-font-description text-grey-1 py-1">
      <T id="min" />{' '}
      <span
        className={clsx('mr-4', COMMON_TEXT_CLASSNAME, getMinMaxTextClassNames(isMinError, min))}
        onClick={onMinClick}
      >
        {getMinMaxDisplayValue(currencyCode, min)}
      </span>
      <T id="max" />:{' '}
      <span className={clsx(COMMON_TEXT_CLASSNAME, getMinMaxTextClassNames(ismMaxError, max))} onClick={onMaxClick}>
        {getMinMaxDisplayValue(currencyCode, max)}
      </span>
    </div>
  );
});

const getMinMaxDisplayValue = (currencyCode: string, value?: number) => (value ? `${value} ${currencyCode}` : '---');

const getMinMaxTextClassNames = (isError: boolean, value?: number) =>
  value ? (isError ? 'text-error underline' : 'text-secondary') : '';
