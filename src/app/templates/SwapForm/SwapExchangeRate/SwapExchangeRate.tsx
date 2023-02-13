import React, { FC, useMemo } from 'react';

import { BigNumber } from 'bignumber.js';

import Money from 'app/atoms/Money';
import { AssetMetadata } from 'lib/temple/metadata';

interface Props {
  inputAmount: number | undefined;
  outputAmount: number | undefined;
  inputAssetMetadata: AssetMetadata;
  outputAssetMetadata: AssetMetadata;
}

export const SwapExchangeRate: FC<Props> = ({ inputAmount, outputAmount, inputAssetMetadata, outputAssetMetadata }) => {
  const exchangeRate = useMemo(() => {
    if (inputAmount && outputAmount) {
      const tradeInput = new BigNumber(inputAmount);
      const tradeOutput = new BigNumber(outputAmount);

      return tradeInput.dividedBy(tradeOutput);
    }

    return undefined;
  }, [inputAmount, outputAmount, inputAssetMetadata.decimals, outputAssetMetadata.decimals]);

  return (
    <span>
      {exchangeRate ? (
        <span className="flex items-end justify-end">
          <span>1 {outputAssetMetadata.symbol}</span>
          <span className="ml-1 mr-1">=</span>
          <Money smallFractionFont={false} fiat={false}>
            {exchangeRate}
          </Money>
          <span className="ml-1">{inputAssetMetadata.symbol}</span>
        </span>
      ) : (
        '-'
      )}
    </span>
  );
};
