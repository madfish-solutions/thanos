import React, { memo } from 'react';

import clsx from 'clsx';

import { T, TID } from 'lib/i18n';

interface Props {
  title: TID;
  className?: string;
}

export const NewQuoteLabel = memo<Props>(({ title, className }) => {
  return (
    <div className={clsx('flex flex-row justify-between py-1', className)}>
      <span className="text-font-description-bold">
        <T id={title} />
      </span>

      <span>
        <span className="text-font-description text-grey-2 mr-0.5">
          <T id="newQuote" />
        </span>
        <span className="w-7 inline-block text-font-description-bold text-end">0:22</span>
      </span>
    </div>
  );
});
