import React, { FC, memo } from 'react';

import clsx from 'clsx';

type Color = 'primary' | 'secondary' | 'white';

interface Props {
  color: Color;
  small?: boolean;
  className?: string;
}

export const Loader = memo<Props>(({ color, small, className }) => (
  <svg viewBox="0 0 24 24" className={clsx('animate-spin', small ? 'w-4 h-4' : 'w-6 h-6', className)}>
    <path
      d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12ZM3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12Z"
      className={color === 'white' ? 'fill-white opacity-25' : 'fill-black opacity-5'}
    />

    <path
      d="M12 1.5C12 0.671573 12.6742 -0.00966503 13.4961 0.0936208C15.4963 0.344954 17.4095 1.09744 19.0534 2.2918C21.1036 3.78133 22.6296 5.88168 23.4127 8.2918C24.1958 10.7019 24.1958 13.2981 23.4127 15.7082C22.7848 17.6407 21.6792 19.3741 20.2088 20.7531C19.6045 21.3197 18.6587 21.1649 18.1717 20.4947C17.6848 19.8245 17.8446 18.894 18.4247 18.3026C19.3942 17.3144 20.1275 16.1106 20.5595 14.7812C21.1468 12.9736 21.1468 11.0264 20.5595 9.21885C19.9722 7.41126 18.8277 5.836 17.2901 4.71885C16.1592 3.89721 14.8583 3.35439 13.4931 3.12471C12.6762 2.98727 12 2.32843 12 1.5Z"
      fill="#1373E4"
      className={`fill-${color}`}
    />
  </svg>
));

interface PageLoaderProps {
  color?: Color;
  text?: string;
  stretch?: boolean;
}

export const PageLoader: FC<PageLoaderProps> = ({ color = 'secondary', text = 'Content is Loading...', stretch }) => (
  <div className={clsx('w-full flex flex-col items-center', stretch && 'flex-grow justify-center')}>
    <div
      className={clsx(
        'w-12 h-12 flex items-center justify-center',
        'bg-white border border-grey-4 rounded-lg shadow-center'
      )}
    >
      <Loader color={color} />
    </div>

    <div className="p-4">
      <span className="text-font-description-bold text-grey-2">{text}</span>
    </div>
  </div>
);