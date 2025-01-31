import { EvmNativeTokenMetadata } from 'lib/metadata/types';
import { DEFAULT_EVM_CURRENCY } from 'temple/networks';

import {
  ETH_SEPOLIA_CHAIN_ID,
  ETHEREUM_MAINNET_CHAIN_ID,
  OTHER_COMMON_MAINNET_CHAIN_IDS,
  TempleTezosChainId
} from './types';

interface ChainSpecsBase {
  activeRpcId?: string;
  activeBlockExplorerId?: string;
  disabled?: boolean;
  name?: string;
  testnet?: boolean;
}

export interface TezosChainSpecs extends ChainSpecsBase {}

export interface EvmChainSpecs extends ChainSpecsBase {
  currency?: EvmNativeTokenMetadata;
}

export const DEFAULT_TEZOS_CHAINS_SPECS: Record<string, TezosChainSpecs & { testnet: boolean }> = {
  [TempleTezosChainId.Mainnet]: {
    name: 'Tezos Mainnet',
    testnet: false
  },
  [TempleTezosChainId.Dcp]: {
    name: 'T4L3NT Mainnet',
    testnet: false
  },
  [TempleTezosChainId.DcpTest]: {
    name: 'T4L3NT Testnet',
    testnet: true
  },
  [TempleTezosChainId.Ghostnet]: {
    name: 'Ghostnet Testnet',
    testnet: true
  }
};

export const DEFAULT_EVM_CHAINS_SPECS: Record<string, EvmChainSpecs & { testnet: boolean }> = {
  [ETHEREUM_MAINNET_CHAIN_ID]: {
    name: 'Ethereum Mainnet',
    testnet: false,
    currency: DEFAULT_EVM_CURRENCY
  },
  [OTHER_COMMON_MAINNET_CHAIN_IDS.polygon]: {
    name: 'Polygon Mainnet',
    testnet: false,
    currency: {
      ...DEFAULT_EVM_CURRENCY,
      name: 'POL', // https://learn.bybit.com/blockchain/polygon-2-0-from-matic-to-pol
      symbol: 'POL'
    }
  },
  [OTHER_COMMON_MAINNET_CHAIN_IDS.bsc]: {
    name: 'BSC Mainnet',
    testnet: false,
    currency: {
      ...DEFAULT_EVM_CURRENCY,
      name: 'BNB',
      symbol: 'BNB'
    }
  },
  [OTHER_COMMON_MAINNET_CHAIN_IDS.avalanche]: {
    name: 'Avalanche Mainnet',
    testnet: false,
    currency: {
      ...DEFAULT_EVM_CURRENCY,
      name: 'Avalanche',
      symbol: 'AVAX'
    }
  },
  [OTHER_COMMON_MAINNET_CHAIN_IDS.optimism]: {
    name: 'Optimism Mainnet',
    testnet: false,
    currency: DEFAULT_EVM_CURRENCY
  },
  [ETH_SEPOLIA_CHAIN_ID]: {
    name: 'Ethereum Sepolia',
    currency: {
      ...DEFAULT_EVM_CURRENCY,
      name: 'Sepolia Ether'
    },
    testnet: true
  },
  '80002': {
    name: 'Polygon Amoy',
    currency: {
      ...DEFAULT_EVM_CURRENCY,
      name: 'POL',
      symbol: 'POL'
    },
    testnet: true
  },
  '97': {
    name: 'BSC Testnet',
    currency: {
      ...DEFAULT_EVM_CURRENCY,
      name: 'BNB',
      symbol: 'tBNB'
    },
    testnet: true
  },
  '43113': {
    name: 'Avalanche Fuji',
    currency: {
      ...DEFAULT_EVM_CURRENCY,
      name: 'Avalanche Fuji',
      symbol: 'AVAX'
    },
    testnet: true
  },
  '11155420': {
    name: 'Optimism Sepolia',
    currency: {
      ...DEFAULT_EVM_CURRENCY,
      name: 'Sepolia Ether'
    },
    testnet: true
  }
};
