import React, { FC } from 'react';

import clsx from 'clsx';

import { T, TID } from 'lib/i18n';

interface InfoContainerProps extends PropsWithChildren {
  className?: string;
  onClick?: EmptyFn;
}

export const InfoContainer: FC<InfoContainerProps> = ({ className, onClick, children }) => (
  <div
    className={clsx('flex flex-col px-4 py-2 rounded-lg shadow-bottom border-0.5 border-transparent', className)}
    onClick={onClick}
  >
    {children}
  </div>
);

interface InfoRawProps extends Omit<InfoContainerProps, 'onClick'> {
  title: TID;
  bottomSeparator?: boolean;
}

export const InfoRaw: FC<InfoRawProps> = ({ title, bottomSeparator, className, children }) => (
  <div
    className={clsx(
      'py-3 flex flex-row justify-between items-center',
      bottomSeparator && 'border-b-0.5 border-lines',
      className
    )}
  >
    <p className="p-1 text-font-description text-grey-1">
      <T id={title} />
    </p>
    {children}
  </div>
);
