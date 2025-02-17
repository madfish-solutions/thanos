import React, { FC, FocusEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { emptyFn } from '@rnw-community/shared';
import bip39WordList from 'bip39/src/wordlists/english.json';
import clsx from 'clsx';
import debounce from 'debounce-promise';

import { FormField, FormFieldElement } from 'app/atoms/FormField';
import type { TestIDProperty } from 'lib/analytics';
import { useFocusHandlers } from 'lib/ui/hooks/use-focus-handlers';

export interface SeedWordInputProps extends TestIDProperty {
  id: number;
  inputsRef: React.MutableRefObject<(FormFieldElement | null)[]>;
  numberOfWords: number;
  submitted: boolean;
  revealRef: unknown;
  onReveal: EmptyFn;
  setWordSpellingErrorsCount: ReactSetStateFn<number>;
  onSeedWordChange: (index: number, value: string) => void;
  value?: string;
  onChange?: (e: React.ChangeEvent<FormFieldElement>) => void;
  onPaste?: (e: React.ClipboardEvent<FormFieldElement>) => void;
}

export const SeedWordInput: FC<SeedWordInputProps> = ({
  id,
  inputsRef,
  numberOfWords,
  submitted,
  revealRef,
  onReveal,
  setWordSpellingErrorsCount,
  onSeedWordChange,
  value,
  onChange = emptyFn,
  onPaste = emptyFn,
  testID
}) => {
  const variantsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const [isWordSpellingError, setIsWordSpellingError] = useState(false);

  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [focusedVariantIndex, setFocusedVariantIndex] = useState(-1);

  const shouldHandleBlur = useCallback((e: FocusEvent) => !checkRelatedTarget(id, e.relatedTarget?.id), [id]);
  const unsetFocusedVariantIndex = useCallback(() => setFocusedVariantIndex(-1), []);
  const {
    isFocused,
    onFocus: handleFocus,
    onBlur: handleBlur,
    setIsFocused
  } = useFocusHandlers(undefined, unsetFocusedVariantIndex, undefined, shouldHandleBlur);
  const isBlur = !isFocused;

  const autoCompleteVariants = useMemo(
    () => (value ? bip39WordList.filter(word => word.startsWith(value)).slice(0, 3) : null),
    [value]
  );

  const debouncedSetIsWordSpellingError = useMemo(() => debounce(setIsWordSpellingError, 200), []);

  const warning = (submitted && !value) || isWordSpellingError;

  useEffect(() => {
    if (isWordSpellingError) {
      setWordSpellingErrorsCount(prev => prev + 1);
    } else {
      setWordSpellingErrorsCount(prev => (prev > 0 ? prev - 1 : prev));
    }
  }, [isWordSpellingError, setWordSpellingErrorsCount]);

  useEffect(() => {
    if (!value) {
      debouncedSetIsWordSpellingError(false);
      return;
    }

    if (!bip39WordList.includes(value)) {
      debouncedSetIsWordSpellingError(true);
      return;
    }

    debouncedSetIsWordSpellingError(false);
  }, [debouncedSetIsWordSpellingError, submitted, value]);

  useEffect(() => {
    if (isBlur) {
      setShowAutoComplete(false);
      return;
    }

    if (value && value.length > 1) {
      setShowAutoComplete(true);
      return;
    }

    setShowAutoComplete(false);
  }, [showAutoComplete, value, isBlur]);

  useEffect(() => variantsRef.current[focusedVariantIndex]?.focus(), [focusedVariantIndex]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<FormFieldElement>) => {
      inputsRef.current[id]?.blur();
      onPaste(e);
    },
    [id, inputsRef, onPaste]
  );

  const setValueToVariant = useCallback(
    (variant: string) => {
      if (inputsRef.current[id]) {
        onSeedWordChange(id, variant);
        inputsRef.current[id]!.value = variant;
      }
      setIsFocused(false);
    },
    [id, inputsRef, onSeedWordChange, setIsFocused]
  );

  const handleVariantClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, variant: string) => {
      e.preventDefault();
      setValueToVariant(variant);
    },
    [setValueToVariant]
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!autoCompleteVariants) {
        return;
      }

      if (e.key === 'Tab' || e.key === 'Enter') {
        setValueToVariant(autoCompleteVariants[0]);

        if (id < numberOfWords - 1) {
          e.preventDefault();
          inputsRef.current[id + 1]?.focus();
        }
      }

      if (e.key === 'ArrowDown' && autoCompleteVariants.length > 1) {
        e.preventDefault();
        setFocusedVariantIndex(1);
      }
    },
    [autoCompleteVariants, id, inputsRef, numberOfWords, setValueToVariant]
  );

  const handleVariantKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, variant: string) => {
      if (!autoCompleteVariants) {
        return;
      }

      if (e.key === 'Tab' || e.key === 'Enter') {
        setValueToVariant(variant);

        if (id < numberOfWords - 1) {
          e.preventDefault();
          inputsRef.current[id + 1]?.focus();
        }
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (focusedVariantIndex < autoCompleteVariants.length - 1) {
          setFocusedVariantIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (focusedVariantIndex === 0) {
          inputsRef.current[id]?.focus();
          setFocusedVariantIndex(-1);
        }

        if (focusedVariantIndex > 0) {
          setFocusedVariantIndex(prev => prev - 1);
        }
      }
    },
    [autoCompleteVariants, focusedVariantIndex, id, inputsRef, numberOfWords, setValueToVariant]
  );

  const setInputRef = useCallback((el: FormFieldElement | null) => (inputsRef.current[id] = el), [id, inputsRef]);

  return (
    <div className="flex flex-col relative">
      <FormField
        className={clsx('!text-font-medium rounded-md !caret-secondary', !isBlur && 'border border-secondary')}
        extraLeftInner={
          <div className="absolute flex items-center inset-y-0 pointer-events-none ml-2">
            <span className="text-font-medium text-grey-2">{id + 1}.</span>
          </div>
        }
        extraLeftInnerWrapper="none"
        ref={setInputRef}
        type="password"
        id={id.toString()}
        warning={warning}
        onChange={onChange}
        onBlur={handleBlur}
        value={value}
        onFocus={handleFocus}
        onPaste={handlePaste}
        revealRef={revealRef}
        onReveal={onReveal}
        autoComplete="off"
        smallPaddings
        fieldWrapperBottomMargin={false}
        reserveSpaceForError={false}
        testID={testID}
        onKeyDown={handleInputKeyDown}
      />
      {showAutoComplete && autoCompleteVariants && autoCompleteVariants.length > 0 && (
        <div
          className={clsx(
            'w-full rounded-md bg-white shadow-bottom text-font-description absolute left-0 z-dropdown p-2',
            'top-12 shadow-lg flex flex-col'
          )}
        >
          {autoCompleteVariants.map((variant, index) => (
            <button
              key={variant}
              id="autoCompleteVariant"
              ref={el => (variantsRef.current[index] = el)}
              className={clsx(
                'px-2 py-2.5 w-full text-left rounded-md',
                'hover:bg-secondary-low focus:bg-secondary-low focus:outline-none'
              )}
              onClick={e => handleVariantClick(e, variant)}
              onBlur={handleBlur}
              onKeyDown={e => handleVariantKeyDown(e, variant)}
            >
              {variant}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const checkRelatedTarget = (inputId: number, targetId?: string) => {
  if (!targetId) {
    return false;
  }

  if (targetId === 'autoCompleteVariant') {
    return true;
  }

  return targetId.startsWith('passwordToggle') && targetId.split('-')[1] === inputId.toString();
};
