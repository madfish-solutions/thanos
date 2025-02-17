import React, { HTMLAttributes, memo, useCallback, useMemo, useState } from 'react';

import classNames from 'clsx';
import browser from 'webextension-polyfill';

const atlasCountriesCodes = [
  'ae',
  'ar',
  'au',
  'az',
  'bg',
  'bh',
  'br',
  'ca',
  'ch',
  'cl',
  'cn',
  'co',
  'cr',
  'cz',
  'de',
  'dk',
  'do',
  'eg',
  'eu',
  'fr',
  'gb',
  'ge',
  'gt',
  'hk',
  'hn',
  'hr',
  'hu',
  'id',
  'il',
  'in',
  'jo',
  'jp',
  'kn',
  'kr',
  'kw',
  'kz',
  'lk',
  'md',
  'mx',
  'my',
  'ng',
  'no',
  'nz',
  'om',
  'pe',
  'ph',
  'pl',
  'pt',
  'py',
  'qa',
  'ro',
  'rw',
  'sa',
  'se',
  'th',
  'tr',
  'tw',
  'ua',
  'us',
  'uy',
  'vn',
  'za'
];
const atlasRowSize = 7;
const imageWidth = 40;
const imageHeight = 30;

export const canUseAtlasFlag = (countryCode: string) => atlasCountriesCodes.includes(countryCode);

interface FlagProps {
  alt: string;
  countryCode?: string;
  className?: string;
  src?: string;
}

export const Flag = memo<FlagProps>(({ alt, className, countryCode, src }) => {
  const [error, setError] = useState(false);

  const bgFromAtlasStyle = useMemo(() => {
    if (src || !countryCode) {
      return undefined;
    }

    const index = atlasCountriesCodes.indexOf(countryCode);

    if (index === -1) {
      return undefined;
    }

    const row = Math.floor(index / atlasRowSize);
    const col = index % atlasRowSize;

    return {
      backgroundImage: `url(${browser.runtime.getURL('/misc/country-flags/atlas.png')})`,
      backgroundPosition: `${-(col * imageWidth) / 2}px ${-(row * imageHeight) / 2}px`,
      backgroundSize: `${atlasRowSize * 1.25}rem`
    };
  }, [countryCode, src]);

  const handleError = useCallback(() => {
    setError(true);
  }, [setError]);

  return (
    <div className={classNames('w-6 h-6 flex justify-center items-center', className)}>
      {src || bgFromAtlasStyle ? (
        <>
          {src ? (
            <img alt={alt} className={classNames({ hidden: error }, 'w-5 h-auto')} src={src} onError={handleError} />
          ) : (
            <div className="w-5 aspect-[4/3]" style={bgFromAtlasStyle} />
          )}
          {error && <FlagStub className="w-6 h-auto" />}
        </>
      ) : (
        <FlagStub className="w-6 h-auto" />
      )}
    </div>
  );
});

const FlagStub = memo((props: HTMLAttributes<unknown>) => (
  <svg
    role="img"
    xmlns="http://www.w3.org/2000/svg"
    width="48px"
    height="48px"
    viewBox="2 2 20 20"
    stroke="#e53e3e"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
    {...props}
  >
    <path d="M6.34314575 6.34314575L17.6568542 17.6568542M6.34314575 17.6568542L17.6568542 6.34314575" />
  </svg>
));
