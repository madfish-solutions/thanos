import React, { FC, MouseEventHandler, PropsWithChildren } from 'react';

import clsx from 'clsx';

import { Anchor } from 'app/atoms/Anchor';

import { PartnersPromotionSelectors } from '../index.selectors';
import { PartnersPromotionVariant } from '../types';

import { CloseButton } from './close-button';

interface TextPromotionViewProps extends PropsWithChildren {
  href: string;
  isVisible: boolean;
  onClose: MouseEventHandler<HTMLButtonElement>;
}

export const ImagePromotionView: FC<TextPromotionViewProps> = ({ children, href, isVisible, onClose }) => {
  return (
    <Anchor
      className={clsx(
        'relative w-full flex justify-center items-center rounded-xl',
        'min-h-28 bg-gray-100 hover:bg-gray-200',
        !isVisible && 'invisible'
      )}
      href={href}
      target="_blank"
      rel="noreferrer"
      testID={PartnersPromotionSelectors.promoLink}
      testIDProperties={{ variant: PartnersPromotionVariant.Image, href }}
    >
      {children}

      <div
        className={clsx(
          'absolute top-0 left-0 px-3 rounded-tl-lg rounded-br-lg ',
          'bg-blue-500 text-2xs leading-snug font-semibold text-white'
        )}
      >
        AD
      </div>
      <CloseButton className="absolute top-2 right-2" onClick={onClose} variant={PartnersPromotionVariant.Image} />
    </Anchor>
  );
};
