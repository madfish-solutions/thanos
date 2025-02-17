import type { TID } from 'lib/i18n';
import { EvmNativeTokenMetadata } from 'lib/metadata/types';
import { BlockExplorer, ETHEREUM_MAINNET_CHAIN_ID, TEZOS_MAINNET_CHAIN_ID } from 'lib/temple/types';
import type { StoredTezosNetwork, StoredEvmNetwork } from 'temple/networks';
import type { TempleChainKind } from 'temple/types';

import { useAllTezosChains, useAllEvmChains } from './ready';

export interface BasicEvmChain {
  kind: TempleChainKind.EVM;
  chainId: number;
}

export interface BasicTezosChain {
  kind: TempleChainKind.Tezos;
  chainId: string;
}

export type BasicChain = BasicEvmChain | BasicTezosChain;

export interface ChainBase {
  rpcBaseURL: string;
  name: string;
  nameI18nKey?: TID;
  disabled?: boolean;
  allBlockExplorers: BlockExplorer[];
  activeBlockExplorer?: BlockExplorer;
  testnet?: boolean;
  default: boolean;
}

export interface TezosChain extends BasicTezosChain, ChainBase {
  rpc: StoredTezosNetwork;
  allRpcs: StoredTezosNetwork[];
}

export interface EvmChain extends BasicEvmChain, ChainBase {
  currency: EvmNativeTokenMetadata;
  rpc: StoredEvmNetwork;
  allRpcs: StoredEvmNetwork[];
}

export type OneOfChains = TezosChain | EvmChain;

export type ChainOfKind<T extends TempleChainKind> = T extends TempleChainKind.Tezos ? TezosChain : EvmChain;

export const isPossibleTestnetChain = (chain: OneOfChains) => chain.testnet !== false;

export const useTezosChainByChainId = (tezosChainId: string): TezosChain | null => {
  const allTezosChains = useAllTezosChains();

  return allTezosChains[tezosChainId] ?? null;
};

export const useTezosMainnetChain = () => useTezosChainByChainId(TEZOS_MAINNET_CHAIN_ID)!;

export const useEvmChainByChainId = (evmChainId: number): EvmChain | undefined => {
  const allEvmChains = useAllEvmChains();

  return allEvmChains[evmChainId];
};

export const useEthereumMainnetChain = () => useEvmChainByChainId(ETHEREUM_MAINNET_CHAIN_ID)!;
