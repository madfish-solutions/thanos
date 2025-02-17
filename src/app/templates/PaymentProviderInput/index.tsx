import React, { FC, useState } from 'react';

import { isDefined } from '@rnw-community/shared';
import classNames from 'clsx';

import { setTestID } from 'lib/analytics';
import { PaymentProviderInterface } from 'lib/buy-with-credit-card/topup.interface';
import { T } from 'lib/i18n';
import { isTruthy } from 'lib/utils';

import { DropdownSelect } from '../DropdownSelect/DropdownSelect';
import { InputContainer } from '../InputContainer/InputContainer';

import { MoneyRange } from './MoneyRange';
import { PaymentProviderOption } from './PaymentProvidersMenu/PaymentProviderOption';
import { PaymentProviderInputProps } from './types';

const renderOptionContent = (option: PaymentProviderInterface) => (
  <PaymentProviderOption value={option} isSelected={false} shouldShowSeparator={false} />
);

export const PaymentProviderInput: FC<PaymentProviderInputProps> = ({
  className,
  error,
  value,
  options,
  isLoading,
  onChange,
  headerTestID,
  testID
}) => {
  const [searchValue, setSearchValue] = useState<string>('');

  return (
    <div className={classNames('w-full', className)}>
      <InputContainer footer={isTruthy(error) && <span className="text-xs text-red-700 leading-relaxed">{error}</span>}>
        <DropdownSelect
          testID={testID}
          dropdownButtonClassName="p-2 pr-4"
          DropdownFaceContent={<PaymentProviderDropdownFaceContent value={value} testId={headerTestID} />}
          searchProps={{ searchValue, onSearchChange: event => setSearchValue(event?.target.value) }}
          optionsProps={{
            options,
            isLoading,
            noItemsText: 'No Items',
            getKey: option => option.id,
            renderOptionContent,
            onOptionChange: onChange
          }}
        />
      </InputContainer>
    </div>
  );
};

interface PaymentProviderDropdownFaceContentProps {
  value?: PaymentProviderInterface;
  testId?: string;
}

const PaymentProviderDropdownFaceContent: FC<PaymentProviderDropdownFaceContentProps> = ({ value, testId }) => (
  <div className="w-full flex flex-row items-center gap-2 rounded-md cursor-pointer" {...setTestID(testId)}>
    <div className="flex flex-1 flex-col items-start">
      {isDefined(value) ? (
        <>
          <span className="font-normal text-ulg text-gray-700 leading-tight">{value.name}</span>
          <MoneyRange
            minAmount={value.minInputAmount}
            maxAmount={value.maxInputAmount}
            currencySymbol={value.inputSymbol}
            decimalPlaces={value.inputDecimals ?? 2}
          />
        </>
      ) : (
        <span className="font-medium text-font-medium leading-tight text-gray-500">
          <T id="selectPaymentProvider" />
        </span>
      )}
    </div>
  </div>
);
