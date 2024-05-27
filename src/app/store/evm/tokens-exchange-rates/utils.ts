import { getAddress } from 'viem';

import { BalanceItem } from 'lib/apis/temple/endpoints/evm/api.interfaces';
import { toTokenSlug } from 'lib/assets';
import { EVM_NATIVE_CURRENCY_ADDRESS } from 'lib/metadata/types';
import { isPositiveTokenBalance } from 'lib/utils/evm.utils';

import { TokenSlugExchangeRateRecord } from './state';

export const getTokenSlugExchangeRateRecord = (data: BalanceItem[]) =>
  data.reduce<TokenSlugExchangeRateRecord>((acc, currentValue) => {
    if (!isPositiveTokenBalance(currentValue) || !currentValue.quote_rate) return acc;

    if (currentValue.native_token) {
      acc[EVM_NATIVE_CURRENCY_ADDRESS] = currentValue.quote_rate;

      return acc;
    }

    acc[toTokenSlug(getAddress(currentValue.contract_address))] = currentValue.quote_rate;

    return acc;
  }, {});
