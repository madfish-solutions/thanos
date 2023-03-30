import { BigNumber } from 'bignumber.js';

import { EnvVars } from 'lib/env';

interface Route3SwapParamsRequest {
  fromSymbol: string;
  toSymbol: string;
  amount: string;
}

interface Route3Hop {
  dex: number;
  forward: boolean;
}

export interface Route3Chain {
  input: BigNumber;
  output: BigNumber;
  hops: Array<Route3Hop>;
}

export interface Route3SwapParamsResponse {
  input: BigNumber | undefined;
  output: BigNumber | undefined;
  chains: Array<Route3Chain>;
}

const parser = (origJSON: string): ReturnType<typeof JSON['parse']> => {
  const stringedJSON = origJSON
    .replace(/input":\s*([-+Ee0-9.]+)/g, 'input":"$1"')
    .replace(/output":\s*([-+Ee0-9.]+)/g, 'output":"$1"');

  return JSON.parse(stringedJSON, (key, value) => {
    if (key === 'input' || key === 'output') {
      return new BigNumber(value);
    }

    return value;
  });
};

export const fetchRoute3SwapParams = ({
  fromSymbol,
  toSymbol,
  amount
}: Route3SwapParamsRequest): Promise<Route3SwapParamsResponse> =>
  fetch(`https://temple.3route.io/swap/${fromSymbol}/${toSymbol}/${amount}`, {
    headers: {
      Authorization: EnvVars.TEMPLE_WALLET_ROUTE3_AUTH_TOKEN
    }
  })
    .then(res => res.text())
    .then(res => parser(res));
