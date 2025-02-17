import BigNumber from 'bignumber.js';

export enum TempleChainKind {
  Tezos = 'tezos',
  EVM = 'evm'
}

export const TempleChainTitle: Record<TempleChainKind, string> = {
  [TempleChainKind.Tezos]: 'Tezos',
  [TempleChainKind.EVM]: 'EVM'
};

export type BalancesChanges = StringRecord<{ atomicAmount: BigNumber; isNft?: boolean }>;
