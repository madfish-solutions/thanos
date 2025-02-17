import BigNumber from 'bignumber.js';
import {
  AbiFunction,
  DecodeFunctionDataReturnType,
  SimulateContractReturnType,
  TransactionSerializable,
  decodeFunctionData
} from 'viem';

import {
  erc1155BurnAbi,
  erc1155BurnBatchAbi,
  erc1155MintAbi,
  erc1155MintBatchAbi,
  erc1155SafeBatchTransferFromAbi,
  erc1155SafeTransferFromAbi
} from 'lib/abi/erc1155';
import { erc20BurnAbi, erc20BurnFromAbi, erc20MintAbi, erc20TransferAbi, erc20TransferFromAbi } from 'lib/abi/erc20';
import {
  erc721BurnAbi,
  erc721MintAbi,
  erc721SafeMintAbi,
  erc721SafeMintWithDataAbi,
  erc721SafeTransferFromNonpayableAbi,
  erc721SafeTransferFromPayableAbi,
  erc721TransferFromAbi
} from 'lib/abi/erc721';
import { toEvmAssetSlug } from 'lib/assets/utils';
import { EvmAssetStandard } from 'lib/evm/types';
import { ChainPublicClient } from 'temple/evm';
import { BalancesChanges } from 'temple/types';

import { detectEvmTokenStandard } from '../utils/common.utils';

type TxAbiFragment = AbiFunction & { stateMutability: 'nonpayable' | 'payable' };
type ParseCallback<AbiFragment extends TxAbiFragment> = (
  args: DecodeFunctionDataReturnType<[AbiFragment]>['args'],
  simultateOperation: () => Promise<SimulateContractReturnType<[AbiFragment]>['result']>,
  sender: HexString,
  to: HexString
) => Promise<BalancesChanges | null>;

export type ContractCallTransaction = TransactionSerializable & { data: HexString; to: HexString };

const makeAbiFunctionHandler = <AbiFragment extends TxAbiFragment>(
  fragment: AbiFragment,
  onParse: ParseCallback<AbiFragment>,
  applicabilityPredicate?: (tx: ContractCallTransaction, client: ChainPublicClient) => Promise<boolean>
) => {
  return async (tx: ContractCallTransaction, sender: HexString, client: ChainPublicClient) => {
    try {
      if (applicabilityPredicate && !(await applicabilityPredicate(tx, client))) {
        return null;
      }

      const args = decodeFunctionData({ abi: [fragment], data: tx.data }).args;
      const simulateOperation = async () => {
        // @ts-expect-error
        const { result } = await client.simulateContract({
          account: sender,
          abi: [fragment],
          functionName: fragment.name,
          args,
          address: tx.to
        });

        return result;
      };

      return await onParse(args, simulateOperation, sender, tx.to);
    } catch {
      return null;
    }
  };
};

const toBigNumber = (x: bigint) => new BigNumber(x.toString());

const withOperationSimulation = async <AbiFragment extends TxAbiFragment>(
  simulateOperation: () => Promise<SimulateContractReturnType<[AbiFragment]>['result']>,
  onSuccess: (result: SimulateContractReturnType<[AbiFragment]>['result']) => BalancesChanges
) => {
  try {
    return onSuccess(await simulateOperation());
  } catch (e) {
    console.error(e);

    return {};
  }
};

const onErc721TransferParse: ParseCallback<
  typeof erc721SafeTransferFromPayableAbi | typeof erc721SafeTransferFromNonpayableAbi | typeof erc721TransferFromAbi
> = async (args, _, sender, to) => {
  const [tokensSender, recipient, tokenId] = args;

  if (recipient === tokensSender || (tokensSender !== sender && recipient !== sender)) {
    return {};
  }

  return {
    [toEvmAssetSlug(to, tokenId.toString())]: {
      atomicAmount: new BigNumber(tokensSender === sender ? -1 : 1),
      isNft: true
    }
  };
};

const onErc721MintParse: ParseCallback<
  typeof erc721MintAbi | typeof erc721SafeMintAbi | typeof erc721SafeMintWithDataAbi
> = async (args, simulateOperation, sender, to) => {
  const [recipient] = args;

  if (recipient !== sender) {
    return {};
  }

  return withOperationSimulation<typeof erc721MintAbi | typeof erc721SafeMintAbi>(simulateOperation, tokenId => {
    return { [toEvmAssetSlug(to, tokenId.toString())]: { atomicAmount: new BigNumber(1), isNft: true } };
  });
};

const onErc1155TransfersParse: ParseCallback<typeof erc1155SafeBatchTransferFromAbi> = async (args, _, sender, to) => {
  const [tokensSender, recipient, ids, values] = args;

  if (recipient === tokensSender || (tokensSender !== sender && recipient !== sender)) {
    return {};
  }

  return Object.fromEntries(
    ids.map((id, i) => [
      toEvmAssetSlug(to, id.toString()),
      { atomicAmount: toBigNumber(tokensSender === sender ? -values[i] : values[i]), isNft: true }
    ])
  );
};

const onErc1155MintsParse: ParseCallback<typeof erc1155MintBatchAbi> = async (args, _, sender, to) => {
  const [recipient, ids, values] = args;

  return recipient === sender
    ? Object.fromEntries(
        ids.map((id, i) => [toEvmAssetSlug(to, id.toString()), { atomicAmount: toBigNumber(values[i]), isNft: true }])
      )
    : {};
};

const onErc1155BurnsParse: ParseCallback<typeof erc1155BurnBatchAbi> = async (args, _, sender, to) => {
  const [tokensSender, ids, values] = args;

  return tokensSender === sender
    ? Object.fromEntries(
        ids.map((id, i) => [toEvmAssetSlug(to, id.toString()), { atomicAmount: toBigNumber(-values[i]), isNft: true }])
      )
    : {};
};

const makeTargetIsOfStandardFn =
  (standard: EvmAssetStandard) => async (tx: ContractCallTransaction, client: ChainPublicClient) => {
    const standardDetected = await detectEvmTokenStandard(client, toEvmAssetSlug(tx.to, '0'));

    return standardDetected === standard;
  };

const targetIsErc20 = makeTargetIsOfStandardFn(EvmAssetStandard.ERC20);
const targetIsErc721 = makeTargetIsOfStandardFn(EvmAssetStandard.ERC721);

/**
 * A list of functions that try to estimate tokens balances changes assuming that a user themselves sent a transaction.
 * Each of them returns `null` if the transaction is not related to the function, or a record of balances changes otherwise.
 */
export const knownOperationsHandlers = [
  makeAbiFunctionHandler(erc20MintAbi, async (args, _, sender, to) => {
    const [account, value] = args;

    return account === sender ? { [toEvmAssetSlug(to)]: { atomicAmount: toBigNumber(value), isNft: false } } : {};
  }),
  makeAbiFunctionHandler(
    erc20BurnAbi,
    async (args, _, _2, to) => {
      const [value] = args;

      return { [toEvmAssetSlug(to)]: { atomicAmount: toBigNumber(-value), isNft: false } };
    },
    targetIsErc20
  ),
  makeAbiFunctionHandler(erc20BurnFromAbi, async (args, _, sender, to) => {
    const [account, value] = args;

    return account === sender ? { [toEvmAssetSlug(to)]: { atomicAmount: toBigNumber(-value), isNft: false } } : {};
  }),
  makeAbiFunctionHandler(
    erc20TransferAbi,
    async (args, _, sender, to) => {
      const [recipient, amount] = args;

      return recipient === sender ? {} : { [toEvmAssetSlug(to)]: { atomicAmount: toBigNumber(-amount), isNft: false } };
    },
    targetIsErc20
  ),
  makeAbiFunctionHandler(
    erc20TransferFromAbi,
    async (args, _, sender, to) => {
      const [tokensSender, recipient, amount] = args;

      return recipient === tokensSender || (tokensSender !== sender && recipient !== sender)
        ? {}
        : {
            [toEvmAssetSlug(to)]: {
              atomicAmount: toBigNumber(tokensSender === sender ? -amount : amount),
              isNft: false
            }
          };
    },
    targetIsErc20
  ),
  makeAbiFunctionHandler(erc721SafeTransferFromPayableAbi, onErc721TransferParse, targetIsErc721),
  makeAbiFunctionHandler(erc721SafeTransferFromNonpayableAbi, onErc721TransferParse, targetIsErc721),
  makeAbiFunctionHandler(erc721TransferFromAbi, onErc721TransferParse, targetIsErc721),
  makeAbiFunctionHandler(erc721MintAbi, onErc721MintParse),
  makeAbiFunctionHandler(erc721SafeMintAbi, onErc721MintParse),
  makeAbiFunctionHandler(erc721SafeMintWithDataAbi, onErc721MintParse),
  makeAbiFunctionHandler(
    erc721BurnAbi,
    async (args, _, _2, to) => {
      const [tokenId] = args;

      return { [toEvmAssetSlug(to, tokenId.toString())]: { atomicAmount: new BigNumber(-1), isNft: true } };
    },
    targetIsErc721
  ),
  makeAbiFunctionHandler(erc1155SafeBatchTransferFromAbi, onErc1155TransfersParse),
  makeAbiFunctionHandler(erc1155SafeTransferFromAbi, (args, simulateOperation, sender, to) => {
    const [tokensSender, recipient, id, value, data] = args;

    return onErc1155TransfersParse([tokensSender, recipient, [id], [value], data], simulateOperation, sender, to);
  }),
  makeAbiFunctionHandler(erc1155MintBatchAbi, onErc1155MintsParse),
  makeAbiFunctionHandler(erc1155MintAbi, (args, simulateOperation, sender, to) => {
    const [recipient, id, value, data] = args;

    return onErc1155MintsParse([recipient, [id], [value], data], simulateOperation, sender, to);
  }),
  makeAbiFunctionHandler(erc1155BurnBatchAbi, onErc1155BurnsParse),
  makeAbiFunctionHandler(erc1155BurnAbi, (args, simulateOperation, sender, to) => {
    const [tokensSender, id, value] = args;

    return onErc1155BurnsParse([tokensSender, [id], [value]], simulateOperation, sender, to);
  })
];
