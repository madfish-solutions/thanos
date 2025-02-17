import { useCallback } from 'react';

import BigNumber from 'bignumber.js';

import { toastError } from 'app/toaster';
import { isNativeTokenAddress } from 'lib/apis/temple/endpoints/evm/api.utils';
import { useEvmAssetMetadata } from 'lib/metadata';
import { useTypedSWR } from 'lib/swr';
import { checkZeroBalance } from 'lib/utils/check-zero-balance';
import { estimate as genericEstimate } from 'temple/evm/estimate';
import { EvmChain } from 'temple/front';

import { buildBasicEvmSendParams } from '../build-basic-evm-send-params';

export const useEvmEstimationData = (
  to: HexString,
  assetSlug: string,
  accountPkh: HexString,
  network: EvmChain,
  balance: BigNumber,
  ethBalance: BigNumber,
  toFilled?: boolean,
  amount?: string
) => {
  const assetMetadata = useEvmAssetMetadata(assetSlug, network.chainId);

  const estimate = useCallback(async () => {
    try {
      if (!assetMetadata) {
        throw new Error('Asset metadata not found');
      }

      const isNativeToken = isNativeTokenAddress(network.chainId, assetSlug);

      checkZeroBalance(balance, ethBalance, isNativeToken);

      return await genericEstimate(network, {
        ...buildBasicEvmSendParams(accountPkh, to, assetMetadata, amount),
        account: accountPkh
      });
    } catch (err: any) {
      console.warn(err);
      toastError(err.details || err.message);

      throw err;
    }
  }, [network, assetSlug, balance, ethBalance, accountPkh, to, amount, assetMetadata]);

  return useTypedSWR(
    toFilled ? ['evm-estimation-data', network.chainId, assetSlug, accountPkh, to, amount] : null,
    estimate,
    {
      shouldRetryOnError: false,
      focusThrottleInterval: 10_000,
      dedupingInterval: 10_000
    }
  );
};
