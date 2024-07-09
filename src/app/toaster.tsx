import React, { memo, useEffect, useMemo, useRef } from 'react';

import clsx from 'clsx';
import toast, { Toaster, Toast, ToastIcon, ToastType } from 'react-hot-toast';

import { useAppEnv } from 'app/env';
import { ReactComponent as ErrorIcon } from 'app/icons/typed-msg/error.svg';
import { ReactComponent as InfoIcon } from 'app/icons/typed-msg/info.svg';
import { ReactComponent as SuccessIcon } from 'app/icons/typed-msg/success.svg';
import { ReactComponent as WarningIcon } from 'app/icons/typed-msg/warning.svg';
import { useToastsContainerBottomShiftSelector } from 'app/store/settings/selectors';
import PortalToDocumentBody from 'lib/ui/Portal';

const MAX_TOASTS_COUNT = 3;
const toastsIdsPool: string[] = [];

const withToastsLimit = (toastFn: (title: string) => string) => (title: string) => {
  if (toastsIdsPool.length >= MAX_TOASTS_COUNT) {
    const toastsIdsToDismiss = toastsIdsPool.splice(0, toastsIdsPool.length - MAX_TOASTS_COUNT + 1);
    toastsIdsToDismiss.forEach(toast.remove);
  }
  const newToastId = toastFn(title);
  toastsIdsPool.push(newToastId);
};

export const toastSuccess = withToastsLimit(toast.success);
// @ts-prune-ignore-next
export const toastError = withToastsLimit(toast.error);
// @ts-prune-ignore-next
export const toastInfo = withToastsLimit(toast);
// @ts-prune-ignore-next
export const toastWarning = withToastsLimit((title: string) =>
  toast.custom(toast => <CustomToastBar toast={{ ...toast, message: title }} customType="warning" />)
);

export const ToasterProvider = memo(() => {
  const bottomShift = useToastsContainerBottomShiftSelector();
  const { popup } = useAppEnv();
  const toastsContainerStyle = useMemo(() => ({ bottom: (popup ? 32 : 64) + bottomShift }), [bottomShift, popup]);

  return (
    <PortalToDocumentBody>
      <Toaster position="bottom-center" containerStyle={toastsContainerStyle}>
        {t => <CustomToastBar toast={t} />}
      </Toaster>
    </PortalToDocumentBody>
  );
});

type ToastTypeExtended = ToastType | 'warning';

const TOAST_CLASSES: Partial<Record<ToastTypeExtended, string>> = {
  success: 'bg-success-low',
  error: 'bg-error-low',
  blank: 'bg-secondary-low',
  warning: 'bg-warning-low'
};

const CustomToastBar = memo<{ toast: Toast; customType?: ToastTypeExtended }>(({ toast, customType }) => {
  const type: ToastTypeExtended = customType || toast.type;

  const prevToastVisibleRef = useRef(toast.visible);
  useEffect(() => {
    if (prevToastVisibleRef.current && !toast.visible) {
      const toastIndex = toastsIdsPool.indexOf(toast.id);
      if (toastIndex !== -1) {
        toastsIdsPool.splice(toastIndex, 1);
      }
    }
    prevToastVisibleRef.current = toast.visible;
  }, [toast.id, toast.visible]);

  return (
    <div className={clsx('px-3 py-2.5 flex gap-x-1 items-center rounded-md shadow-bottom', TOAST_CLASSES[type])}>
      <CustomToastIcon toast={toast} type={type} />

      {typeof toast.message === 'function' ? (
        toast.message(toast)
      ) : (
        <span className="text-font-description-bold">{toast.message}</span>
      )}
    </div>
  );
});

const CustomToastIcon = memo<{ toast: Toast; type: ToastTypeExtended }>(({ toast, type }) => {
  switch (type) {
    case 'success':
      return <SuccessIcon className="w-6 h-6" />;
    case 'warning':
      return <WarningIcon className="w-6 h-6" />;
    case 'error':
      return <ErrorIcon className="w-6 h-6" />;
    case 'loading':
      return <ToastIcon toast={toast} />;
    case 'blank':
      return <InfoIcon className="w-6 h-6" />;
  }

  return null;
});