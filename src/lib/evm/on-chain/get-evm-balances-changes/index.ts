import BigNumber from 'bignumber.js';
import { TransactionSerializable } from 'viem';

import { EVM_TOKEN_SLUG } from 'lib/assets/defaults';
import { ChainPublicClient } from 'temple/evm';
import { BalancesChanges } from 'temple/types';

import { ContractCallTransaction, knownOperationsHandlers } from './handlers';

const isContractCallTransaction = (tx: TransactionSerializable): tx is ContractCallTransaction => !!tx.data && !!tx.to;

/** Returns the estimation of EVM balances changes of the `sender` assuming that they send the transaction themselves */
export const getEvmBalancesChanges = async (
  tx: TransactionSerializable,
  sender: HexString,
  client: ChainPublicClient
) => {
  const basicBalancesChanges: BalancesChanges = {
    [EVM_TOKEN_SLUG]: { atomicAmount: new BigNumber((tx.value ?? 0).toString()).negated(), isNft: false }
  };

  if (!isContractCallTransaction(tx)) {
    return basicBalancesChanges;
  }

  for (const handler of knownOperationsHandlers) {
    const additionalDeltas = await handler(tx, sender, client);

    if (additionalDeltas) {
      return { ...basicBalancesChanges, ...additionalDeltas };
    }
  }

  return basicBalancesChanges;
};
