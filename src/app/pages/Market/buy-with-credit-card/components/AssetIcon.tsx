import React, { memo, useCallback, useMemo, useState } from 'react';

import clsx from 'clsx';

import { Flag } from 'app/atoms/Flag';
import { TOKEN_FALLBACK_ICON_SRC, TOKENS_ICONS_SRC } from 'lib/icons';

interface Props {
  src: string;
  code: string;
  useFlagIcon?: boolean;
  size?: number;
  alt?: string;
  className?: string;
}

export const AssetIcon = memo<Props>(({ src, code, useFlagIcon, size = 40, alt, className }) => {
  const [isFailed, setIsFailed] = useState(false);

  const countryCode = currencyToLocaleMap[code];

  const localSrc = useMemo(() => {
    if (isFailed) return TOKEN_FALLBACK_ICON_SRC;
    if (code === 'XTZ') return TOKENS_ICONS_SRC.TEZ;

    return src;
  }, [code, isFailed, src]);

  const handleError = useCallback(() => setIsFailed(true), []);

  return (
    <div className="flex justify-center items-center" style={{ width: size, height: size }}>
      {countryCode && useFlagIcon ? (
        <Flag alt={code} countryCode={countryCode} />
      ) : (
        <img
          src={localSrc}
          alt={alt}
          className={clsx('rounded-full w-full h-auto p-0.5', className)}
          onError={handleError}
        />
      )}
    </div>
  );
});

const currencyToLocaleMap: Record<string, string> = {
  AUD: 'au',
  BGN: 'bg',
  BRL: 'br',
  CAD: 'ca',
  CHF: 'ch',
  COP: 'co',
  CZK: 'cz',
  DKK: 'dk',
  DOP: 'do',
  EGP: 'eg',
  EUR: 'eu',
  GBP: 'gb',
  HKD: 'hk',
  IDR: 'id',
  ILS: 'il',
  JOD: 'jo',
  KES: 'ke',
  KWD: 'kw',
  LKR: 'lk',
  MXN: 'mx',
  NGN: 'ng',
  NOK: 'no',
  NZD: 'nz',
  OMR: 'om',
  PEN: 'pe',
  PLN: 'pl',
  RON: 'ro',
  SEK: 'se',
  THB: 'th',
  TRY: 'tr',
  TWD: 'tw',
  USD: 'us',
  VND: 'vn',
  ZAR: 'za',
  AED: 'ae',
  ARS: 'ar',
  AZN: 'az',
  BHD: 'bh',
  CLP: 'cl',
  CRC: 'cr',
  GEL: 'ge',
  GTQ: 'gt',
  HNL: 'hn',
  HRK: 'hr',
  HUF: 'hu',
  INR: 'in',
  JPY: 'jp',
  KRW: 'kr',
  MDL: 'md',
  MYR: 'my',
  PHP: 'ph',
  PYG: 'py',
  QAR: 'qa',
  RWF: 'rw',
  SAR: 'sa',
  UAH: 'ua',
  UYU: 'uy'
};
