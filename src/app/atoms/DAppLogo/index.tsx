import React, { CSSProperties, memo, useMemo } from 'react';

import { ImageStacked } from 'lib/ui/ImageStacked';

import { ReactComponent as UnknownDAppIcon } from './unknown-dapp.svg';

interface DAppLogoProps {
  origin: string;
  size: number;
  className?: string;
  icon?: string;
  style?: CSSProperties;
}

const DAppLogo = memo<DAppLogoProps>(({ origin, size, icon, className, style }) => {
  const faviconSrc = useMemo(
    () => (icon ? [icon] : [`${origin}/favicon.ico`, `${origin}/favicon.png`]),
    [origin, icon]
  );

  const styleMemo = useMemo(() => ({ width: size, height: size, ...style }), [style, size]);

  const placeholder = <UnknownDAppIcon className={className} style={styleMemo} />;

  return (
    <ImageStacked
      sources={faviconSrc}
      alt={origin}
      style={styleMemo}
      className={className}
      loader={placeholder}
      fallback={placeholder}
    />
  );
});

export default DAppLogo;
