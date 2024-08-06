import React, { memo } from 'react';

import clsx from 'clsx';

import { ReactComponent as SadSearchIcon } from 'app/icons/monochrome/sad-search.svg';
import { ReactComponent as SadUniversalIcon } from 'app/icons/monochrome/sad-universal.svg';
import { T } from 'lib/i18n';

interface EmptyStateProps {
  className?: string;
  variant: 'tokenSearch' | 'universal' | 'searchUniversal';
}

export const EmptyState = memo<EmptyStateProps>(({ className, variant }) => (
  <div className={clsx(className, 'w-full py-7 flex flex-col items-center gap-2')}>
    {variant === 'universal' ? <SadUniversalIcon className="w-[92px]" /> : <SadSearchIcon className="w-[92px]" />}
    <span className="text-font-medium-bold text-grey-2">
      <T id={variant === 'tokenSearch' ? 'tokensNotFound' : 'notFound'} />
    </span>
  </div>
));