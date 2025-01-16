import memoizee from 'memoizee';
import type { RpcTransactionRequest, TransactionRequest } from 'viem';
import * as ViemChains from 'viem/chains';
import type { AuthorizationList, RpcAuthorizationList } from 'viem/experimental';

export const getViemChainsList = memoizee(() => Object.values(ViemChains));

export function parseTransactionRequest(req: RpcTransactionRequest): TransactionRequest {
  if (req.type === '0x0') {
    const { gas, value, gasPrice, type, nonce, ...restProps } = req;

    return {
      ...restProps,
      ...toBigintRecord({ gas, value, gasPrice }),
      nonce: parseNonce(nonce),
      type: 'legacy'
    };
  }

  if (req.type === '0x1') {
    const { gas, value, gasPrice, type, nonce, ...restProps } = req;

    return {
      ...restProps,
      ...toBigintRecord({ gas, value, gasPrice }),
      nonce: parseNonce(nonce),
      type: 'eip2930'
    };
  }

  if (req.type === '0x3' || req.blobs) {
    const { gas, value, maxFeePerGas, maxPriorityFeePerGas, maxFeePerBlobGas, type, nonce, ...restProps } = req;

    return {
      ...restProps,
      ...toBigintRecord({ gas, value, maxFeePerGas, maxPriorityFeePerGas, maxFeePerBlobGas }),
      nonce: parseNonce(nonce),
      type: 'eip4844'
    };
  }

  if (req.type === '0x4' || req.authorizationList) {
    const { gas, value, maxFeePerGas, maxPriorityFeePerGas, authorizationList, type, nonce, ...restProps } = req;

    return {
      ...restProps,
      ...toBigintRecord({ gas, value, maxFeePerGas, maxPriorityFeePerGas }),
      authorizationList: authorizationList && parseAuthorizationList(authorizationList),
      nonce: parseNonce(nonce),
      type: 'eip7702'
    };
  }

  if (req.type === '0x2' || req.maxFeePerGas || req.maxPriorityFeePerGas) {
    const { gas, value, maxFeePerGas, maxPriorityFeePerGas, type, nonce, blobs, authorizationList, ...restProps } = req;

    return {
      ...restProps,
      ...toBigintRecord({ gas, value, maxFeePerGas, maxPriorityFeePerGas }),
      nonce: parseNonce(nonce),
      type: 'eip1559'
    };
  }

  const {
    gas,
    value,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    maxFeePerBlobGas,
    type,
    nonce,
    authorizationList,
    ...rest
  } = req;

  return {
    ...rest,
    ...toBigintRecord({ gas, value, gasPrice, maxFeePerGas, maxPriorityFeePerGas, maxFeePerBlobGas }),
    nonce: parseNonce(nonce)
  };
}

function parseNonce(nonce: string | undefined) {
  return nonce === undefined ? undefined : Number(nonce);
}

function parseAuthorizationList(authorizationList: RpcAuthorizationList): AuthorizationList<number, boolean> {
  return authorizationList.map(authorization => ({
    contractAddress: authorization.address,
    r: authorization.r,
    s: authorization.s,
    chainId: Number(authorization.chainId),
    nonce: Number(authorization.nonce),
    yParity: authorization.yParity === undefined ? undefined : Number(authorization.yParity),
    // @ts-expect-error: `formatAuthorizationList` includes `v` in the result although it is not specified in the type
    v: authorization.v === undefined ? undefined : BigInt(authorization.v)
  }));
}

type DeserializedBigints<T extends Partial<StringRecord>> = {
  [K in keyof T]: Replace<Replace<T[K], string, bigint>, HexString, bigint>;
};

function toBigintRecord<T extends Partial<StringRecord>>(input: T): DeserializedBigints<T> {
  const result = {} as DeserializedBigints<T>;
  for (const key in input) {
    const value = input[key];
    // @ts-expect-error
    result[key] = typeof value === 'string' ? BigInt(value) : value;
  }

  return result;
}

export function getGasPriceStep(averageGasPrice: bigint) {
  const repeatCount = averageGasPrice.toString().length - 2;

  return BigInt(`1${'0'.repeat(repeatCount > 0 ? repeatCount : 0)}`);
}
