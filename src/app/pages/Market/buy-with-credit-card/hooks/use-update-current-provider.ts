import { useEffect, MutableRefObject } from 'react';

import { isDefined } from '@rnw-community/shared';
import { isEqual } from 'lodash';

import { TopUpProviderId } from 'lib/buy-with-credit-card/top-up-provider-id.enum';
import { PaymentProviderInterface } from 'lib/buy-with-credit-card/topup.interface';

export const useUpdateCurrentProvider = (
  paymentProvidersToDisplay: PaymentProviderInterface[],
  topUpProvider: PaymentProviderInterface | undefined,
  manuallySelectedProviderIdRef: MutableRefObject<TopUpProviderId | undefined>,
  setProvider: (provider: PaymentProviderInterface | undefined) => void,
  isLoading: boolean
) => {
  useEffect(() => {
    if (isLoading) return;

    const manuallySelectedProviderId = manuallySelectedProviderIdRef.current;
    const manuallySelectedProvider = paymentProvidersToDisplay.find(p => p.id === manuallySelectedProviderId);
    // We discard manually selected provider, as soon as it becomes absent in the list
    if (!isDefined(manuallySelectedProvider)) manuallySelectedProviderIdRef.current = undefined;

    // No multiple choice
    if (paymentProvidersToDisplay.length < 2) {
      const newPaymentProvider = paymentProvidersToDisplay[0];
      if (!isEqual(newPaymentProvider, topUpProvider)) setProvider(newPaymentProvider);
      return;
    }

    // Manual
    if (isDefined(manuallySelectedProvider)) {
      if (!isEqual(manuallySelectedProvider, topUpProvider)) setProvider(manuallySelectedProvider);
      return;
    }

    const newPaymentProvider = paymentProvidersToDisplay[0];
    if (!isEqual(newPaymentProvider, topUpProvider)) setProvider(newPaymentProvider);
  }, [paymentProvidersToDisplay, topUpProvider, setProvider, isLoading]);
};
