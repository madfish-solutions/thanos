import React, {
  forwardRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  CSSProperties
} from 'react';

import clsx from 'clsx';
import { noop } from 'lodash';

import CleanButton from 'app/atoms/CleanButton';
import OldStyleCopyButton from 'app/atoms/OldStyleCopyButton';
import { ReactComponent as PasteFillIcon } from 'app/icons/base/paste_fill.svg';
import { ReactComponent as CopyIcon } from 'app/icons/monochrome/copy.svg';
import { setTestID, TestIDProperty } from 'lib/analytics';
import { useDidUpdate } from 'lib/ui/hooks';
import { useFocusHandlers } from 'lib/ui/hooks/use-focus-handlers';
import { inputChangeHandler } from 'lib/ui/inputHandlers';
import { useBlurElementOnTimeout } from 'lib/ui/use-blur-on-timeout';
import useCopyToClipboard from 'lib/ui/useCopyToClipboard';
import { combineRefs } from 'lib/ui/utils';

import { Button } from './Button';
import { ErrorCaptionSelectors } from './ErrorCaption.selectors';
import { FieldLabel } from './FieldLabel';
import { IconBase } from './IconBase';
import { SecretCover } from './SecretCover';
import usePasswordToggle from './usePasswordToggle.hook';

export const PASSWORD_ERROR_CAPTION = 'PASSWORD_ERROR_CAPTION';

export type FormFieldElement = HTMLInputElement | HTMLTextAreaElement;
type FormFieldAttrs = InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>;

type InnerWrapperType = 'default' | 'none' | 'unset';

export interface FormFieldProps extends TestIDProperty, Omit<FormFieldAttrs, 'type' | 'onBlur'> {
  type?: 'text' | 'number' | 'password';
  extraSection?: ReactNode;
  label?: ReactNode;
  labelDescription?: ReactNode;
  labelWarning?: ReactNode;
  errorCaption?: ReactNode;
  shouldShowErrorCaption?: boolean;
  reserveSpaceForError?: boolean;
  warning?: boolean;
  containerClassName?: string;
  labelContainerClassName?: string;
  containerStyle?: React.CSSProperties;
  textarea?: boolean;
  /** `textarea=true` only */
  secret?: boolean;
  /** `textarea=true` only */
  showPasteButton?: boolean;
  /** `type='password'` only */
  revealForbidden?: boolean;
  /** `type='password'` only */
  shouldShowRevealWhenEmpty?: boolean;
  /**
   * Any value, whose change will result in password un-reveal.
   * `type='password'` only
   */
  revealRef?: unknown;
  additonalActionButtons?: ReactNode;
  cleanable?: boolean;
  extraLeftInner?: ReactNode;
  extraLeftInnerWrapper?: InnerWrapperType;
  extraRightInner?: ReactNode;
  extraRightInnerWrapper?: InnerWrapperType;
  onClean?: EmptyFn;
  onPasteButtonClick?: EmptyFn;
  onReveal?: EmptyFn;
  onBlur?: React.FocusEventHandler;
  smallPaddings?: boolean;
  fieldWrapperBottomMargin?: boolean;
  copyable?: boolean;
  testIDs?: {
    inputSection?: string;
    input?: string;
  };
  rightSideComponent?: ReactNode;
  underneathComponent?: ReactNode;
  extraFloatingInner?: ReactNode;
  floatAfterPlaceholder?: boolean;
  rightSideContainerStyle?: CSSProperties;
}

/**
 * TODO: Consider separating into two: `FormInputField` & `FormTextAreaField`
 */
export const FormField = forwardRef<FormFieldElement, FormFieldProps>(
  (
    {
      containerStyle,
      extraSection,
      label,
      labelDescription,
      labelWarning,
      errorCaption,
      shouldShowErrorCaption = true,
      reserveSpaceForError = true,
      warning = false,
      containerClassName,
      labelContainerClassName,
      textarea,
      secret: secretProp,
      revealForbidden = false,
      shouldShowRevealWhenEmpty = false,
      revealRef,
      cleanable,
      showPasteButton = false,
      extraLeftInner = null,
      extraLeftInnerWrapper = 'default',
      extraRightInner = null,
      extraRightInnerWrapper = 'default',
      extraFloatingInner = null,
      floatAfterPlaceholder,
      id,
      type,
      value,
      defaultValue,
      readOnly,
      onChange,
      onFocus,
      onBlur,
      onClean = noop,
      onPasteButtonClick,
      onReveal,
      className,
      rightSideComponent,
      underneathComponent,
      spellCheck = false,
      autoComplete = 'off',
      smallPaddings = false,
      fieldWrapperBottomMargin = true,
      additonalActionButtons,
      copyable,
      testID,
      testIDs,
      style,
      rightSideContainerStyle,
      placeholder,
      ...rest
    },
    ref
  ) => {
    const secret = secretProp && textarea;
    const Field = textarea ? 'textarea' : 'input';

    const [passwordInputType, RevealPasswordIcon] = usePasswordToggle(id, onReveal, revealRef, onBlur);
    const isPasswordInput = type === 'password';
    const inputType = isPasswordInput ? passwordInputType : type;

    const { copy } = useCopyToClipboard();

    const [localValue, setLocalValue] = useState(value ?? defaultValue ?? '');
    useDidUpdate(() => setLocalValue(value ?? ''), [value]);

    const { isFocused: focused, onFocus: handleFocus, onBlur: handleBlur } = useFocusHandlers(onFocus, onBlur);

    const handleChange = useCallback(
      (e: React.ChangeEvent<FormFieldElement>) => {
        inputChangeHandler(e, onChange, setLocalValue);
      },
      [onChange, setLocalValue]
    );

    const secretCovered = useMemo(
      () => Boolean(secret && localValue !== '' && !focused),
      [secret, localValue, focused]
    );

    const spareRef = useRef<FormFieldElement>();

    useBlurElementOnTimeout(spareRef, focused && Boolean(secret ?? isPasswordInput));

    const handleSecretBannerClick = () => spareRef.current?.focus();

    const hasRevealablePassword =
      isPasswordInput && !revealForbidden && (shouldShowRevealWhenEmpty || Boolean(localValue));
    const fieldStyle = useMemo(
      () => ({
        ...buildHorizontalPaddingStyle(
          [cleanable, copyable, hasRevealablePassword].filter(Boolean).length,
          extraLeftInnerWrapper === 'unset' ? false : Boolean(extraLeftInner),
          extraRightInnerWrapper === 'unset' ? false : Boolean(extraRightInner),
          Boolean(extraFloatingInner),
          Boolean(rightSideComponent),
          smallPaddings,
          textarea
        ),
        ...style
      }),
      [
        cleanable,
        copyable,
        extraFloatingInner,
        extraLeftInner,
        extraLeftInnerWrapper,
        extraRightInner,
        extraRightInnerWrapper,
        hasRevealablePassword,
        rightSideComponent,
        smallPaddings,
        style,
        textarea
      ]
    );

    return (
      <div
        className={clsx('w-full flex flex-col', containerClassName)}
        style={containerStyle}
        {...setTestID(testIDs?.inputSection)}
      >
        {label && (
          <FieldLabel
            label={label}
            labelContainerClassName={labelContainerClassName}
            warning={labelWarning}
            description={labelDescription}
            className="mt-1 pb-2"
            id={id}
          />
        )}

        {extraSection}

        <div className={clsx('relative flex items-stretch', fieldWrapperBottomMargin && 'mb-1')}>
          <ExtraFloatingInner
            inputValue={value || (floatAfterPlaceholder ? placeholder : undefined)}
            innerComponent={extraFloatingInner}
            onClick={() => spareRef.current?.focus()}
          />

          <ExtraInner
            innerComponent={extraLeftInner}
            useDefaultWrapper={extraLeftInnerWrapper === 'default'}
            position="left"
            smallPaddings={smallPaddings}
          />

          <Field
            ref={combineRefs(ref, spareRef)}
            className={clsx(
              FORM_FIELD_CLASS_NAME,
              readOnly && '!placeholder-grey-1',
              smallPaddings ? 'py-2 pl-2' : 'p-3',
              errorCaption ? 'border-error' : warning ? 'border-warning' : 'border-input-low',
              className
            )}
            style={fieldStyle}
            id={id}
            type={inputType}
            value={value}
            defaultValue={defaultValue}
            readOnly={readOnly}
            spellCheck={spellCheck}
            autoComplete={autoComplete}
            placeholder={placeholder}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...rest}
            {...setTestID(testIDs?.input ?? testID)}
          />

          <ExtraInner
            innerComponent={extraRightInner}
            useDefaultWrapper={extraRightInnerWrapper === 'default'}
            position="right"
            smallPaddings={smallPaddings}
          />

          <div
            className={clsx(
              'absolute flex justify-end gap-1 items-center',
              textarea ? (smallPaddings ? 'bottom-2' : 'bottom-3') : 'inset-y-0',
              smallPaddings ? 'right-2' : 'right-3'
            )}
            style={rightSideContainerStyle}
          >
            {additonalActionButtons}
            {cleanable && <CleanButton showText={textarea} size={textarea ? 12 : 16} onClick={onClean} />}
            {rightSideComponent && rightSideComponent}
            {textarea && !cleanable && showPasteButton && (
              <Button className="flex items-center text-secondary px-1 py-0.5" onClick={onPasteButtonClick}>
                <span className="text-font-description-bold">Paste</span>
                <IconBase Icon={PasteFillIcon} size={12} onClick={onClean} />
              </Button>
            )}
            {copyable && <Copyable value={String(value)} copy={copy} isSecret={type === 'password'} />}
            {hasRevealablePassword && RevealPasswordIcon}
          </div>

          {secretCovered && <SecretCover onClick={handleSecretBannerClick} />}
        </div>

        {shouldShowErrorCaption &&
          (reserveSpaceForError && !errorCaption && !underneathComponent ? (
            <div className="size-4" />
          ) : (
            <ErrorCaption errorCaption={errorCaption} />
          ))}

        {!errorCaption && underneathComponent}
      </div>
    );
  }
);

export const FORM_FIELD_CLASS_NAME = clsx(
  'appearance-none w-full border rounded-lg bg-input-low caret-primary focus:outline-none',
  'transition ease-in-out duration-200 text-font-regular placeholder-grey-2 hover:placeholder-grey-1'
);

interface ExtraFloatingInnerProps {
  inputValue?: string | number | readonly string[];
  innerComponent?: React.ReactNode;
  onClick?: EmptyFn;
}

// input padding + textWidth + gap between text and innerComponent
const getLeftIndent = (textWidth: number) => 12 + textWidth + 8;

const ExtraFloatingInner: React.FC<ExtraFloatingInnerProps> = ({ inputValue, innerComponent, onClick }) => {
  const measureTextWidthRef = useRef<HTMLDivElement>(null);
  const [textWidth, setTextWidth] = useState(0);

  const leftIndent = getLeftIndent(textWidth);

  useLayoutEffect(() => {
    if (measureTextWidthRef.current) {
      const width = measureTextWidthRef.current.clientWidth;

      if (getLeftIndent(width) < 226) setTextWidth(width);
    }
  }, [inputValue]);

  return (
    <>
      <div ref={measureTextWidthRef} className="fixed bottom-0 right-0 text-font-regular invisible">
        {inputValue}
      </div>
      <div onClick={onClick} className="absolute text-font-regular text-grey-2" style={{ top: 13, left: leftIndent }}>
        {inputValue ? innerComponent : null}
      </div>
    </>
  );
};

interface ExtraInnerProps {
  innerComponent: React.ReactNode;
  useDefaultWrapper: boolean;
  position: 'left' | 'right';
  smallPaddings: boolean;
}

const ExtraInner: React.FC<ExtraInnerProps> = ({ useDefaultWrapper, innerComponent, position, smallPaddings }) => {
  if (useDefaultWrapper)
    return (
      <div
        className={clsx(
          'absolute flex items-center inset-y-0 pointer-events-none',
          position === 'left' && (smallPaddings ? 'w-8' : 'w-10'),
          position === 'right' ? 'justify-end right-0 w-32 opacity-50' : 'justify-start left-0'
        )}
      >
        <div className={clsx(smallPaddings ? 'mx-2' : 'mx-4', 'text-lg')}>{innerComponent}</div>
      </div>
    );
  return <>{innerComponent}</>;
};

interface CopyableProps {
  value: string;
  copy: EmptyFn;
  isSecret: boolean;
}

const Copyable: React.FC<CopyableProps> = ({ copy, value }) => (
  <OldStyleCopyButton text={value} type="link">
    <CopyIcon
      style={{ verticalAlign: 'inherit' }}
      className="h-4 ml-1 w-auto inline stroke-orange-500 stroke-2"
      onClick={copy}
    />
  </OldStyleCopyButton>
);

interface ErrorCaptionProps {
  errorCaption: React.ReactNode;
}

const ErrorCaption: React.FC<ErrorCaptionProps> = ({ errorCaption }) => {
  const isPasswordStrengthIndicator = errorCaption === PASSWORD_ERROR_CAPTION;

  return errorCaption && !isPasswordStrengthIndicator ? (
    <div className="pl-1 text-font-description text-error" {...setTestID(ErrorCaptionSelectors.inputError)}>
      {errorCaption}
    </div>
  ) : null;
};

const buildHorizontalPaddingStyle = (
  buttonsCount: number,
  withExtraInnerLeft: boolean,
  withExtraInnerRight: boolean,
  withExtraFloatingInner: boolean,
  withRightSideComponent: boolean,
  smallPaddings: boolean,
  textarea = false
) => {
  return {
    paddingRight:
      withExtraInnerRight || withRightSideComponent
        ? 128 + (withExtraFloatingInner ? 10 : 0)
        : (smallPaddings ? 8 : 12) + (textarea ? 0 : buttonsCount * 28),
    paddingLeft: withExtraInnerLeft ? (smallPaddings ? 32 : 40) : smallPaddings ? 8 : 12
  };
};
