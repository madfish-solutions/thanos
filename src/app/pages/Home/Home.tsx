import React, { memo, useLayoutEffect } from 'react';

import { isDefined } from '@rnw-community/shared';

import { useAppEnv } from 'app/env';
import PageLayout from 'app/layouts/PageLayout';
import { useMainnetTokensScamlistSelector } from 'app/store/assets/selectors';
import { useIsConversionTrackedSelector } from 'app/store/settings/selectors';
import { setAnotherSelector, setTestID } from 'lib/analytics';
import { TEZ_TOKEN_SLUG } from 'lib/assets';
import { EnvVars } from 'lib/env';
import { useAssetMetadata, getAssetSymbol } from 'lib/metadata';
import { useAccount } from 'lib/temple/front';
import { HistoryAction, navigate, useLocation } from 'lib/woozie';

import { useOnboardingProgress } from '../Onboarding/hooks/useOnboardingProgress.hook';
import Onboarding from '../Onboarding/Onboarding';

import { ActionButtonsBar } from './ActionButtonsBar';
import { ContentSection } from './ContentSection';
import EditableTitle from './OtherComponents/EditableTitle';
import MainBanner from './OtherComponents/MainBanner';
import { ScamTokenAlert } from './OtherComponents/ScamTokenAlert';
import { TokenPageSelectors } from './OtherComponents/TokenPage.selectors';

type Props = {
  assetSlug?: string | null;
};

const Home = memo<Props>(({ assetSlug }) => {
  const { fullPage, registerBackHandler } = useAppEnv();
  const { onboardingCompleted } = useOnboardingProgress();
  const { publicKeyHash } = useAccount();
  const { search } = useLocation();

  const mainnetTokensScamSlugsRecord = useMainnetTokensScamlistSelector();
  const showScamTokenAlert = isDefined(assetSlug) && mainnetTokensScamSlugsRecord[assetSlug];

  const assetMetadata = useAssetMetadata(assetSlug || TEZ_TOKEN_SLUG);
  const assetSymbol = getAssetSymbol(assetMetadata);

  const isConversionTracked = useIsConversionTrackedSelector();

  useLayoutEffect(() => {
    const usp = new URLSearchParams(search);
    if (assetSlug && usp.get('after_token_added') === 'true') {
      return registerBackHandler(() => {
        navigate('/', HistoryAction.Replace);
      });
    }
    return undefined;
  }, [registerBackHandler, assetSlug, search]);

  return onboardingCompleted ? (
    <PageLayout
      pageTitle={
        assetSlug ? (
          <span
            className="font-normal"
            {...setTestID(TokenPageSelectors.pageName)}
            {...setAnotherSelector('symbol', assetSymbol)}
          >
            {assetSymbol}
          </span>
        ) : null
      }
      attention={true}
    >
      {!isConversionTracked && (
        <iframe
          className="hidden"
          width="320"
          height="50"
          src={`${EnvVars.CONVERSION_VERIFICATION_URL}/page`}
          title="Conversion verification page"
        />
      )}
      {fullPage && (
        <div className="w-full max-w-sm mx-auto">
          <EditableTitle />
          <hr className="mb-4" />
        </div>
      )}

      {showScamTokenAlert && <ScamTokenAlert />}

      <div className="flex flex-col items-center mb-6">
        <MainBanner accountPkh={publicKeyHash} assetSlug={assetSlug} />

        <ActionButtonsBar assetSlug={assetSlug} />
      </div>

      <ContentSection assetSlug={assetSlug} />
    </PageLayout>
  ) : (
    <Onboarding />
  );
});

export default Home;
