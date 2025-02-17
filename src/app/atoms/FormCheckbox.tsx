import React, { forwardRef, ReactNode, useCallback } from 'react';

import clsx from 'clsx';

import Checkbox, { CheckboxProps } from 'app/atoms/Checkbox';
import { AnalyticsEventCategory, setTestID, useAnalytics } from 'lib/analytics';

export interface FormCheckboxProps extends CheckboxProps {
  basic?: boolean;
  label?: ReactNode;
  labelDescription?: ReactNode;
  errorCaption?: ReactNode;
  containerClassName?: string;
  labelClassName?: string;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  (
    {
      basic,
      label,
      labelDescription,
      errorCaption,
      containerClassName,
      labelClassName,
      onChange,
      testID,
      testIDProperties,
      ...rest
    },
    ref
  ) => {
    const { trackEvent } = useAnalytics();

    const handleChange = useCallback(
      (toChecked: boolean, event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(toChecked, event);

        testID && trackEvent(testID, AnalyticsEventCategory.CheckboxChange, { toChecked, ...testIDProperties });
      },
      [onChange, trackEvent, testID, testIDProperties]
    );

    return (
      <div className={clsx('flex flex-col', containerClassName)}>
        <label
          className={clsx(
            !basic && 'mb-2 p-4 bg-gray-100 border-2 border-gray-300 rounded-md overflow-hidden',
            'flex items-center cursor-pointer',
            labelClassName
          )}
          {...setTestID(testID)}
        >
          <Checkbox ref={ref} errored={Boolean(errorCaption)} onChange={handleChange} {...rest} />

          {(label || labelDescription) && (
            <div className="ml-4 leading-tight flex flex-col">
              {label && <span className="text-sm font-semibold text-gray-700">{label}</span>}

              {labelDescription && <span className="mt-0.5 text-xs font-light text-gray-600">{labelDescription}</span>}
            </div>
          )}
        </label>

        {errorCaption && <div className="text-xs text-red-500">{errorCaption}</div>}
      </div>
    );
  }
);
