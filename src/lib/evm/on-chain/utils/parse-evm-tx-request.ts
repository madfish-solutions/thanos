import { TransactionRequest, TransactionSerializable } from 'viem';

import { TempleEvmDAppTransactionPayload } from 'lib/temple/types';
import { parseTransactionRequest } from 'temple/evm/utils';

export function parseEvmTxRequest(payload: TempleEvmDAppTransactionPayload) {
  const txRequest: TransactionRequest & { from: HexString } = {
    ...parseTransactionRequest(payload.req),
    from: payload.req.from
  };

  const chainId = Number(payload.chainId);

  const txSerializable: TransactionSerializable = {
    ...txRequest,
    chainId,
    kzg: txRequest.kzg as any,
    authorizationList: txRequest.authorizationList as any
  };

  return { txRequest, txSerializable };
}
