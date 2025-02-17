import React, { ChangeEventHandler, ReactNode, FC, useMemo, useRef, useCallback, RefObject } from 'react';

import { isDefined } from '@rnw-community/shared';
import classNames from 'clsx';

import AssetField from 'app/atoms/AssetField';
import DropdownWrapper from 'app/atoms/DropdownWrapper';
import Spinner from 'app/atoms/Spinner/Spinner';
import { ReactComponent as SearchIcon } from 'app/icons/base/search.svg';
import { ReactComponent as ChevronDownIcon } from 'app/icons/chevron-down.svg';
import { AnalyticsEventCategory, TestIDProperty, setTestID, useAnalytics } from 'lib/analytics';
import { t } from 'lib/i18n';
import Popper from 'lib/ui/Popper';
import { sameWidthModifiers } from 'lib/ui/same-width-modifiers';

interface Props<T> extends TestIDProperty {
  DropdownFaceContent: ReactNode;
  singleToken?: boolean;
  Input?: ReactNode;
  optionsListClassName?: string;
  dropdownButtonClassName?: string;
  searchProps: SelectSearchProps;
  optionsProps: SelectOptionsPropsBase<T>;
}

export const DropdownSelect = <T,>({
  Input,
  singleToken = false,
  searchProps,
  optionsProps,
  testID,
  DropdownFaceContent,
  optionsListClassName,
  dropdownButtonClassName
}: Props<T>) => {
  const isInputDefined = isDefined(Input);
  const { trackEvent } = useAnalytics();

  const faceContentContainerClassName = useMemo(
    () =>
      classNames(
        'flex gap-2 items-center max-h-18',
        isInputDefined ? 'border-r border-gray-300' : 'w-full justify-between',
        dropdownButtonClassName
      ),
    [isInputDefined, dropdownButtonClassName]
  );

  const trackDropdownClick = () => {
    if (testID) {
      trackEvent(testID, AnalyticsEventCategory.DropdownOpened);
    }
  };

  return (
    <Popper
      placement="bottom"
      strategy="fixed"
      modifiers={sameWidthModifiers}
      fallbackPlacementsEnabled={false}
      popup={({ opened, setOpened }) => (
        <SelectOptions
          optionsListClassName={optionsListClassName}
          opened={opened}
          setOpened={setOpened}
          {...optionsProps}
        />
      )}
    >
      {({ ref, opened, toggleOpened }) => (
        <div ref={ref as unknown as React.RefObject<HTMLDivElement>} {...setTestID(testID)}>
          {opened ? (
            <SelectSearch {...searchProps} className={dropdownButtonClassName} />
          ) : (
            <div className="box-border w-full flex items-center justify-between border rounded-md border-gray-300 overflow-hidden max-h-18">
              {singleToken ? (
                <div className={faceContentContainerClassName}>
                  {DropdownFaceContent}
                  <div className="h-4 w-4" />
                </div>
              ) : (
                <button
                  className={faceContentContainerClassName}
                  onClick={() => {
                    toggleOpened();
                    trackDropdownClick();
                  }}
                >
                  {DropdownFaceContent}
                  <ChevronDownIcon className="text-gray-600 stroke-current stroke-2 h-4 w-4" />
                </button>
              )}
              {Input}
            </div>
          )}
        </div>
      )}
    </Popper>
  );
};
interface SelectOptionsPropsBase<Type> {
  options: Type[];
  noItemsText: ReactNode;
  isLoading?: boolean;
  optionsListClassName?: string;
  getKey: (option: Type) => string;
  onOptionChange: (newValue: Type) => void;
  renderOptionContent: (option: Type, scrollableRef: RefObject<HTMLDivElement>) => ReactNode;
}
interface SelectOptionsProps<Type> extends SelectOptionsPropsBase<Type> {
  opened: boolean;
  setOpened: ReactSetStateFn<boolean>;
}

interface SelectOptionProps<Type> {
  option: Type;
  onClick: SelectOptionsProps<Type>['onOptionChange'];
  renderOptionContent: SelectOptionsProps<Type>['renderOptionContent'];
  scrollableRef: RefObject<HTMLDivElement>;
}

const SelectOption = <Type,>({ option, scrollableRef, onClick, renderOptionContent }: SelectOptionProps<Type>) => {
  const handleClick = useCallback(() => onClick(option), [onClick, option]);

  return (
    <li>
      <button className="w-full" disabled={(option as any).disabled} onClick={handleClick}>
        {renderOptionContent(option, scrollableRef)}
      </button>
    </li>
  );
};

const SelectOptions = <Type,>({
  opened,
  options,
  noItemsText,
  isLoading,
  optionsListClassName,
  getKey,
  onOptionChange,
  setOpened,
  renderOptionContent
}: SelectOptionsProps<Type>) => {
  const handleOptionClick = (newValue: Type) => {
    onOptionChange(newValue);
    setOpened(false);
  };

  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <DropdownWrapper
      opened={opened}
      className="origin-top mt-2 overflow-x-hidden overflow-y-auto"
      style={{
        maxHeight: '15.125rem',
        backgroundColor: 'white',
        borderColor: '#e2e8f0'
      }}
      ref={rootRef}
    >
      {(options.length === 0 || isLoading) && (
        <div className="my-8 flex flex-col items-center justify-center text-gray-500">
          {isLoading ? (
            <Spinner className="w-12" theme="primary" />
          ) : (
            <p className="flex items-center justify-center text-gray-600 text-base font-light">
              <span>{noItemsText}</span>
            </p>
          )}
        </div>
      )}

      <ul className={optionsListClassName}>
        {options.map(option => (
          <SelectOption<Type>
            key={getKey(option)}
            option={option}
            onClick={handleOptionClick}
            renderOptionContent={renderOptionContent}
            scrollableRef={rootRef}
          />
        ))}
      </ul>
    </DropdownWrapper>
  );
};

interface SelectSearchProps {
  testId?: string;
  className?: string;
  searchValue: string;
  tokenIdValue?: string;
  showTokenIdInput?: boolean;
  onSearchChange: ChangeEventHandler<HTMLInputElement>;
  onTokenIdChange?: (newValue: number | string | undefined) => void;
}
const SelectSearch: FC<SelectSearchProps> = ({
  testId,
  className,
  searchValue,
  tokenIdValue,
  showTokenIdInput = false,
  onSearchChange,
  onTokenIdChange
}) => {
  return (
    <div
      className={classNames(
        'w-full flex items-center transition ease-in-out duration-200 border rounded-md border-orange-500 bg-gray-100 max-h-18',
        className
      )}
    >
      <div className="items-center mr-3">
        <SearchIcon className={classNames('w-6 h-auto text-gray-500 stroke-current stroke-2')} />
      </div>

      <div className="text-lg flex flex-1 items-stretch">
        <div className="flex-1 flex items-stretch mr-2">
          <input
            autoFocus
            value={searchValue}
            className="w-full bg-transparent text-xl text-gray-700 placeholder-gray-500"
            placeholder={t('swapTokenSearchInputPlaceholder')}
            onChange={onSearchChange}
            {...setTestID(testId)}
          />
        </div>

        {showTokenIdInput && (
          <div className="w-24 flex items-stretch border-l border-gray-300">
            <AssetField
              autoFocus
              value={tokenIdValue}
              assetDecimals={0}
              fieldWrapperBottomMargin={false}
              placeholder={t('tokenId')}
              style={{ borderRadius: 0 }}
              containerStyle={{ flexDirection: 'row' }}
              containerClassName="items-stretch"
              className="text-lg border-none bg-opacity-0 focus:shadow-none"
              onChange={onTokenIdChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};
