import React, { FC, useCallback, useEffect, useState } from 'react';

import classNames from 'clsx';
import useSWR from 'swr';

import { Button } from 'app/atoms';
import { CopyButtonProps } from 'app/atoms/CopyButton';
import { ReactComponent as GlobeIcon } from 'app/icons/globe.svg';
import { ReactComponent as HashIcon } from 'app/icons/hash.svg';
import HashChip from 'app/templates/HashChip';
import { TestIDProps } from 'lib/analytics';
import { useTezos, useTezosDomainsClient, fetchFromStorage, putToStorage } from 'lib/temple/front';

type AddressChipProps = TestIDProps & {
  pkh: string;
  className?: string;
  chipClassName?: string;
  small?: boolean;
  addressModeSwitchTestID?: string;
  rounded?: CopyButtonProps['rounded'];
};

const domainDisplayedKey = 'domain-displayed';

const AddressChip: FC<AddressChipProps> = ({
  pkh,
  chipClassName,
  className,
  small,
  addressModeSwitchTestID,
  rounded = 'sm',
  ...rest
}) => {
  const tezos = useTezos();
  const { resolver: domainsResolver } = useTezosDomainsClient();

  const resolveDomainReverseName = useCallback(
    (_k: string, publicKeyHash: string) => domainsResolver.resolveAddressToName(publicKeyHash),
    [domainsResolver]
  );

  const { data: reverseName } = useSWR(() => ['tzdns-reverse-name', pkh, tezos.checksum], resolveDomainReverseName, {
    shouldRetryOnError: false,
    revalidateOnFocus: false
  });

  const [domainDisplayed, setDomainDisplayed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const val = await fetchFromStorage<boolean>(domainDisplayedKey);
        setDomainDisplayed(val ?? true);
      } catch {}
    })();
  }, [domainDisplayedKey, setDomainDisplayed]);

  const handleToggleDomainClick = useCallback(() => {
    setDomainDisplayed(d => {
      const newValue = !d;
      putToStorage(domainDisplayedKey, newValue);
      return newValue;
    });
  }, [setDomainDisplayed, domainDisplayedKey]);

  const Icon = domainDisplayed ? HashIcon : GlobeIcon;

  return (
    <div className={classNames('flex items-center', className)}>
      {reverseName && domainDisplayed ? (
        <HashChip
          className={chipClassName}
          hash={reverseName}
          firstCharsCount={7}
          lastCharsCount={10}
          small={small}
          rounded={rounded}
          {...rest}
        />
      ) : (
        <HashChip className={chipClassName} hash={pkh} small={small} rounded={rounded} {...rest} />
      )}

      {reverseName && (
        <Button
          type="button"
          className={classNames(
            'inline-flex items-center justify-center ml-1 p-1',
            rounded === 'base' ? 'rounded' : 'rounded-sm',
            'bg-gray-100 text-gray-600 leading-none select-none',
            small ? 'text-xs' : 'text-sm',
            'transition ease-in-out duration-300'
          )}
          onClick={handleToggleDomainClick}
          testID={addressModeSwitchTestID}
          testIDProperties={{ toDomainMode: !domainDisplayed }}
        >
          <Icon className={classNames('w-auto stroke-current', small ? 'h-3' : 'h-4')} />
        </Button>
      )}
    </div>
  );
};

export default AddressChip;