import React, { memo, useMemo } from 'react';

import clsx from 'clsx';

import { FADABLE_CONTENT_CLASSNAME } from 'app/a11y/content-fader';
import { PageLoader } from 'app/atoms/Loader';
import { SuspenseContainer } from 'app/atoms/SuspenseContainer';
import { LAYOUT_CONTAINER_CLASSNAME } from 'app/layouts/containers';
import Unlock from 'app/pages/Unlock/Unlock';
import { t } from 'lib/i18n';
import { useRetryableSWR } from 'lib/swr';
import { useTempleClient } from 'lib/temple/front/client';
import { TempleDAppPayload } from 'lib/temple/types';
import { useLocation } from 'lib/woozie';
import { TempleChainKind } from 'temple/types';

import { AddAssetProvider } from './add-asset/context';
import { AddChainDataProvider } from './add-chain/context';
import { EvmConfirmDAppForm } from './evm-confirm-dapp-form';
import { TezosConfirmDAppForm } from './tezos-confirm-dapp-form';

const ConfirmPage = memo(() => {
  const { ready } = useTempleClient();

  if (!ready) {
    return <Unlock canImportNew={false} />;
  }

  return (
    <div
      className={clsx(
        LAYOUT_CONTAINER_CLASSNAME,
        'min-h-screen flex flex-col items-center justify-center bg-white',
        FADABLE_CONTENT_CLASSNAME
      )}
    >
      <SuspenseContainer
        errorMessage={t('fetchingConfirmationDetails')}
        loader={
          <div className="h-screen flex flex-col">
            <PageLoader stretch />
          </div>
        }
      >
        <ConfirmDAppForm />
      </SuspenseContainer>
    </div>
  );
});

export default ConfirmPage;

const ConfirmDAppForm = () => {
  const { getDAppPayload } = useTempleClient();

  const loc = useLocation();
  const id = useMemo(() => {
    const usp = new URLSearchParams(loc.search);
    const pageId = usp.get('id');
    if (!pageId) {
      throw new Error(t('notIdentified'));
    }
    return pageId;
  }, [loc.search]);

  const { data } = useRetryableSWR<TempleDAppPayload, unknown, string>(id, getDAppPayload, {
    suspense: true,
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false
  });
  const payload = data!;

  return payload.chainType === TempleChainKind.EVM ? (
    <AddChainDataProvider>
      <AddAssetProvider>
        <EvmConfirmDAppForm payload={payload} id={id} />
      </AddAssetProvider>
    </AddChainDataProvider>
  ) : (
    <TezosConfirmDAppForm payload={payload} id={id} />
  );
};
