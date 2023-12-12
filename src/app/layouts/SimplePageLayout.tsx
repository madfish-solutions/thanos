import React, { FC, ReactNode } from 'react';

import classNames from 'clsx';

import DocBg from 'app/a11y/DocBg';
import Logo from 'app/atoms/Logo';
import { useAppEnv } from 'app/env';
import ContentContainer from 'app/layouts/ContentContainer';
import ChristmasBgPopupImg from 'app/misc/christmas-popup-bg.png';

const logoStyles = { height: 64, marginTop: 0, marginBottom: 0 };

interface SimplePageLayoutProps extends PropsWithChildren {
  title: ReactNode;
  isConfirmationPopup?: boolean;
}

const SimplePageLayout: FC<SimplePageLayoutProps> = ({ isConfirmationPopup = false, title, children }) => {
  const { popup } = useAppEnv();

  return (
    <>
      {popup && <DocBg bgClassName="bg-primary-white" />}

      <ContentContainer
        className={classNames(
          'min-h-screen',
          'flex flex-col',
          popup && !isConfirmationPopup && 'bg-gray-100 bg-no-repeat bg-contain'
        )}
        style={{ backgroundImage: isConfirmationPopup ? undefined : `url(${ChristmasBgPopupImg})` }}
      >
        <div className={classNames('mt-12 mb-10', 'flex flex-col items-center justify-center')}>
          <div className="flex items-center bg-gray-100">
            <Logo hasTitle style={logoStyles} />
          </div>

          <div className="pt-2 text-center text-2xl font-normal leading-tight text-gray-700 bg-gray-100">{title}</div>
        </div>

        <div
          className={classNames(
            popup ? '-mx-4 border-t border-gray-300' : 'w-full mx-auto max-w-md rounded-md',
            'px-4 bg-white shadow-md'
          )}
        >
          {children}
        </div>

        <div className={classNames('flex-1', popup && '-mx-4 px-4 bg-white')} />
      </ContentContainer>
    </>
  );
};

export default SimplePageLayout;
