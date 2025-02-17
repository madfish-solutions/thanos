import { AbiFunction, TransactionSerializable, decodeFunctionData } from 'viem';

import {
  erc1155MintAbi,
  erc1155MintBatchAbi,
  erc1155SafeBatchTransferFromAbi,
  erc1155SafeTransferFromAbi,
  erc1155SetApprovalForAllAbi
} from 'lib/abi/erc1155';
import {
  erc20ApproveAbi,
  erc20IncreaseAllowanceAbi,
  erc20MintAbi,
  erc20TransferAbi,
  erc20TransferFromAbi
} from 'lib/abi/erc20';
import {
  erc721MintAbi,
  erc721SafeMintAbi,
  erc721SafeMintWithDataAbi,
  erc721SafeTransferFromNonpayableAbi,
  erc721SafeTransferFromPayableAbi,
  erc721SetApprovalForAllAbi,
  erc721TransferFromAbi
} from 'lib/abi/erc721';

// Parsing transaction data with erc20ApproveAbi and erc721ApproveAbi returns the same results
const approveAbis = [erc20ApproveAbi, erc20IncreaseAllowanceAbi] as const;

const approvalForAllAbis = [erc721SetApprovalForAllAbi, erc1155SetApprovalForAllAbi] as const;

const transferAbis = [
  erc20TransferAbi,
  erc20TransferFromAbi,
  erc721SafeTransferFromNonpayableAbi,
  erc721SafeTransferFromPayableAbi,
  erc721TransferFromAbi,
  erc1155SafeBatchTransferFromAbi,
  erc1155SafeTransferFromAbi
] as const;

const mintAbis = [
  erc20MintAbi,
  erc721MintAbi,
  erc721SafeMintAbi,
  erc721SafeMintWithDataAbi,
  erc1155MintAbi,
  erc1155MintBatchAbi
] as const;

export const dataMatchesAbis = (data: HexString, abis: readonly AbiFunction[]) => {
  try {
    decodeFunctionData({ abi: abis, data });

    return true;
  } catch (e) {
    return false;
  }
};

export enum EvmOperationKind {
  DeployContract = 'DeployContract',
  Mint = 'Mint',
  Send = 'Send',
  Approval = 'Approval',
  Transfer = 'Transfer',
  Other = 'Other'
}

export const getOperationKind = (tx: TransactionSerializable) => {
  if (!tx.to) {
    return EvmOperationKind.DeployContract;
  }

  if (!tx.data || tx.data === '0x') {
    return tx.value && tx.value > BigInt(0) ? EvmOperationKind.Send : EvmOperationKind.Other;
  }

  if (dataMatchesAbis(tx.data, transferAbis)) {
    return EvmOperationKind.Send;
  }

  if (dataMatchesAbis(tx.data, mintAbis)) {
    return EvmOperationKind.Mint;
  }

  if (dataMatchesAbis(tx.data, approveAbis)) {
    return EvmOperationKind.Approval;
  }

  if (dataMatchesAbis(tx.data, approvalForAllAbis)) {
    return EvmOperationKind.Transfer;
  }

  return EvmOperationKind.Other;
};
