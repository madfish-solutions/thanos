import React, { FC } from 'react';

import { PageModal } from 'app/atoms/PageModal';
import { EvmReviewData, ReviewData } from 'app/pages/Send/form/interfaces';
import { EvmEstimationDataProvider, TezosEstimationDataProvider } from 'app/templates/TransactionTabs/context';
import { TempleChainKind } from 'temple/types';

import { EvmContent } from './EvmContent';
import { TezosContent } from './TezosContent';

interface ConfirmSendModalProps {
  opened: boolean;
  onRequestClose: EmptyFn;
  reviewData?: ReviewData;
}

export const ConfirmSendModal: FC<ConfirmSendModalProps> = ({ opened, onRequestClose, reviewData }) => (
  <PageModal title="Confirm Send" titleLeft={null} opened={opened}>
    {reviewData ? (
      isEvmReviewData(reviewData) ? (
        <EvmEstimationDataProvider>
          <EvmContent data={reviewData} onClose={onRequestClose} />
        </EvmEstimationDataProvider>
      ) : (
        <TezosEstimationDataProvider>
          <TezosContent data={reviewData} onClose={onRequestClose} />
        </TezosEstimationDataProvider>
      )
    ) : null}
  </PageModal>
);

const isEvmReviewData = (data: ReviewData): data is EvmReviewData => data.network.kind === TempleChainKind.EVM;
