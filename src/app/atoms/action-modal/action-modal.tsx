import React, { ReactNode, memo } from 'react';

import clsx from 'clsx';

import { Button, IconBase } from 'app/atoms';
import CustomModal from 'app/atoms/CustomModal';
import { useAppEnv } from 'app/env';
import { ReactComponent as CloseIcon } from 'app/icons/base/x.svg';
import {
  FULL_PAGE_LAYOUT_CONTAINER_CLASSNAME,
  FULL_PAGE_WRAP_OVERLAY_CLASSNAME,
  LAYOUT_CONTAINER_CLASSNAME
} from 'app/layouts/containers';
import { useTestnetModeEnabledSelector } from 'app/store/settings/selectors';

import actionModalStyles from './action-modal.module.css';

export interface ActionModalProps {
  hasCloseButton?: boolean;
  onClose?: EmptyFn;
  children?: ReactNode | ReactNode[];
  title?: ReactNode;
  headerClassName?: string;
  contentClassName?: string;
  className?: string;
}

export const ActionModal = memo<ActionModalProps>(
  ({ onClose, children, hasCloseButton = true, title, headerClassName, contentClassName, className }) => {
    const { fullPage, confirmWindow } = useAppEnv();
    const testnetModeEnabled = useTestnetModeEnabledSelector();

    return (
      <CustomModal
        isOpen
        className={clsx('rounded-lg', className)}
        overlayClassName={clsx(
          'backdrop-blur-xs',
          testnetModeEnabled && !confirmWindow && 'mt-6 rounded-t-none',
          fullPage &&
            !confirmWindow && [
              FULL_PAGE_WRAP_OVERLAY_CLASSNAME,
              actionModalStyles.fullPageOverlay,
              LAYOUT_CONTAINER_CLASSNAME,
              FULL_PAGE_LAYOUT_CONTAINER_CLASSNAME
            ]
        )}
        onRequestClose={onClose}
      >
        <div className={clsx('relative p-3 border-b-0.5 border-lines w-modal', contentClassName)}>
          <h1 className={clsx('text-center text-font-regular-bold mx-12', headerClassName)}>{title}</h1>
          {hasCloseButton && (
            <Button className="absolute top-3 right-3" onClick={onClose}>
              <IconBase Icon={CloseIcon} size={16} className="text-grey-2" />
            </Button>
          )}
        </div>
        {children}
      </CustomModal>
    );
  }
);
