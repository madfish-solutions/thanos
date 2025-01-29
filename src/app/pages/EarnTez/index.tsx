import React, { memo } from 'react';

import PageLayout from 'app/layouts/PageLayout';
import BakingSection from 'app/pages/Home/OtherComponents/BakingSection';

interface Props {
  tezosChainId: string;
}

export const EarnTezPage = memo<Props>(({ tezosChainId }) => {
  //
  return (
    <PageLayout pageTitle="Earn TEZ">
      <BakingSection tezosChainId={tezosChainId} />
    </PageLayout>
  );
});
