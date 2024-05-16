import { createAction } from '@reduxjs/toolkit';

import { BalancesResponse } from 'lib/apis/temple/endpoints/evm/api.interfaces';
interface proceedLoadedEvmAssetsActionPayload {
  publicKeyHash: HexString;
  chainId: number;
  data: BalancesResponse;
}

export const proceedLoadedEvmAssetsAction = createAction<proceedLoadedEvmAssetsActionPayload>(
  'evm/PROCEED_LOADED_ASSETS_ACTION'
);
