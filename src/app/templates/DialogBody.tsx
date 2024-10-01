import React, { ReactNode, memo } from 'react';

import { ActionModalBodyContainer } from 'app/atoms/action-modal';

interface DialogBodyProps {
  description?: ReactNode | ReactNode[];
}

export const DialogBody = memo<PropsWithChildren<DialogBodyProps>>(({ children, description }) => (
  <ActionModalBodyContainer>
    {description && <p className="w-full text-center text-font-description text-grey-1 pt-1.5 pb-1">{description}</p>}
    {children}
  </ActionModalBodyContainer>
));
