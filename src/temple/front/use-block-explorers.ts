import { useCallback, useMemo } from 'react';

import { transform } from 'lodash';
import { nanoid } from 'nanoid';

import { BLOCKCHAIN_EXPLORERS_OVERRIDES_STORAGE_KEY } from 'lib/constants';
import { useStorage } from 'lib/temple/front/storage';
import {
  OTHER_COMMON_MAINNET_CHAIN_IDS,
  ETHEREUM_MAINNET_CHAIN_ID,
  ETH_SEPOLIA_CHAIN_ID,
  TempleTezosChainId
} from 'lib/temple/types';
import { EMPTY_FROZEN_OBJ } from 'lib/utils';
import { TempleChainKind } from 'temple/types';

import { useEvmChainsSpecs, useTezosChainsSpecs } from './use-chains-specs';

export interface BlockExplorer {
  name: string;
  url: string;
  id: string;
  default: boolean;
}

const FALLBACK_CHAIN_BLOCK_EXPLORERS: BlockExplorer[] = [];

export type BlockExplorerEntityType = 'address' | 'tx';

const useBlockExplorersOverrides = () =>
  useStorage<Partial<Record<TempleChainKind, OptionalRecord<BlockExplorer[]> | undefined>>>(
    BLOCKCHAIN_EXPLORERS_OVERRIDES_STORAGE_KEY,
    EMPTY_FROZEN_OBJ
  );

function useAllBlockExplorers() {
  const [blockExplorersOverrides, setBlockExplorersOverrides] = useBlockExplorersOverrides();

  const allBlockExplorers = useMemo(
    () => ({
      [TempleChainKind.Tezos]: {
        ...DEFAULT_BLOCK_EXPLORERS[TempleChainKind.Tezos],
        ...blockExplorersOverrides[TempleChainKind.Tezos]
      },
      [TempleChainKind.EVM]: {
        ...DEFAULT_BLOCK_EXPLORERS[TempleChainKind.EVM],
        ...blockExplorersOverrides[TempleChainKind.EVM]
      }
    }),
    [blockExplorersOverrides]
  );

  return [allBlockExplorers, setBlockExplorersOverrides] as const;
}

export function useBlockExplorers() {
  const [allBlockExplorers, setBlockExplorersOverrides] = useAllBlockExplorers();

  const getChainBlockExplorers = useCallback(
    (chainKind: TempleChainKind, chainId: string | number) => allBlockExplorers[chainKind]?.[chainId] ?? [],
    [allBlockExplorers]
  );

  const setChainBlockExplorers = useCallback(
    (chainKind: TempleChainKind, chainId: string | number, blockExplorers: BlockExplorer[]) =>
      setBlockExplorersOverrides(prevValue => {
        const newValue = { ...prevValue };
        newValue[chainKind] = { ...newValue[chainKind], [chainId]: blockExplorers };

        return newValue;
      }),
    [setBlockExplorersOverrides]
  );

  const addBlockExplorer = useCallback(
    async (
      chainKind: TempleChainKind,
      chainId: string | number,
      blockExplorer: Omit<BlockExplorer, 'id' | 'default'>
    ) => {
      const newChainBlockExplorers = [...getChainBlockExplorers(chainKind, chainId)];
      const newBlockExplorer = { ...blockExplorer, id: nanoid(), default: false };
      newChainBlockExplorers.push(newBlockExplorer);

      await setChainBlockExplorers(chainKind, chainId, newChainBlockExplorers);

      return newBlockExplorer;
    },
    [getChainBlockExplorers, setChainBlockExplorers]
  );

  const replaceBlockExplorer = useCallback(
    (chainKind: TempleChainKind, chainId: string | number, blockExplorer: Omit<BlockExplorer, 'default'>) => {
      const newChainBlockExplorers = getChainBlockExplorers(chainKind, chainId).map(be =>
        be.id === blockExplorer.id ? { ...blockExplorer, default: be.default } : be
      );

      return setChainBlockExplorers(chainKind, chainId, newChainBlockExplorers);
    },
    [getChainBlockExplorers, setChainBlockExplorers]
  );

  const removeBlockExplorers = useCallback(
    (chainKind: TempleChainKind, chainId: string | number, explorersIds: string[]) => {
      const newChainBlockExplorers = getChainBlockExplorers(chainKind, chainId).filter(
        ({ id }) => !explorersIds.includes(id)
      );

      return setChainBlockExplorers(chainKind, chainId, newChainBlockExplorers);
    },
    [getChainBlockExplorers, setChainBlockExplorers]
  );

  return {
    allBlockExplorers,
    addBlockExplorer,
    replaceBlockExplorer,
    removeBlockExplorers
  };
}

function useGetBlockExplorers(chainKind: TempleChainKind) {
  const [allBlockExplorers] = useAllBlockExplorers();

  return useCallback(
    (chainId: string) =>
      allBlockExplorers[chainKind]?.[chainId] ??
      DEFAULT_BLOCK_EXPLORERS[chainKind]?.[chainId] ??
      FALLBACK_CHAIN_BLOCK_EXPLORERS,
    [allBlockExplorers, chainKind]
  );
}

export function useGetActiveBlockExplorer(chainKind: TempleChainKind) {
  const [tezosChainsSpecs] = useTezosChainsSpecs();
  const [evmChainsSpecs] = useEvmChainsSpecs();

  const getBlockExplorers = useGetBlockExplorers(chainKind);

  return useCallback(
    (chainId: string) => {
      const chainsSpecs = chainKind === TempleChainKind.Tezos ? tezosChainsSpecs : evmChainsSpecs;
      const chainBlockExplorers = getBlockExplorers(chainId);
      const activeBlockExplorerId = chainsSpecs[chainId]?.activeBlockExplorerId;

      if (!activeBlockExplorerId) return chainBlockExplorers[0];

      return chainBlockExplorers.find(({ id }) => id === activeBlockExplorerId) ?? chainBlockExplorers[0];
    },
    [getBlockExplorers, tezosChainsSpecs, evmChainsSpecs, chainKind]
  );
}

export function useChainBlockExplorers(chainKind: TempleChainKind, chainId: string | number) {
  const {
    addBlockExplorer: genericAddBlockExplorer,
    removeBlockExplorers: genericRemoveBlockExplorers,
    replaceBlockExplorer: genericReplaceBlockExplorer
  } = useBlockExplorers();

  const getBlockExplorers = useGetBlockExplorers(chainKind);

  const addBlockExplorer = useCallback(
    (blockExplorer: Omit<BlockExplorer, 'id' | 'default'>) =>
      genericAddBlockExplorer(chainKind, chainId, blockExplorer),
    [chainId, chainKind, genericAddBlockExplorer]
  );

  const replaceBlockExplorer = useCallback(
    (blockExplorer: Omit<BlockExplorer, 'default'>) => genericReplaceBlockExplorer(chainKind, chainId, blockExplorer),
    [chainId, chainKind, genericReplaceBlockExplorer]
  );

  const removeBlockExplorer = useCallback(
    (explorerId: string) => genericRemoveBlockExplorers(chainKind, chainId, [explorerId]),
    [chainId, chainKind, genericRemoveBlockExplorers]
  );

  const removeAllBlockExplorers = useCallback(
    () =>
      genericRemoveBlockExplorers(
        chainKind,
        chainId,
        getBlockExplorers(String(chainId)).map(({ id }) => id)
      ),
    [getBlockExplorers, chainId, chainKind, genericRemoveBlockExplorers]
  );

  return {
    addBlockExplorer,
    removeBlockExplorer,
    removeAllBlockExplorers,
    replaceBlockExplorer
  };
}

/** (!) Very expensive hook for lists */
export function useBlockExplorerHref(
  chainKind: TempleChainKind,
  chainId: string | number,
  entityType: BlockExplorerEntityType,
  hash: string
) {
  const getActiveBlockExplorer = useGetActiveBlockExplorer(chainKind);

  return useMemo(() => {
    const activeBlockExplorer = getActiveBlockExplorer(String(chainId));

    return activeBlockExplorer ? makeBlockExplorerHref(activeBlockExplorer.url, hash, entityType, chainKind) : null;
  }, [getActiveBlockExplorer, chainKind, entityType, hash]);
}

export function makeBlockExplorerHref(
  baseUrl: string,
  hash: string,
  entityType: BlockExplorerEntityType,
  chainKind: TempleChainKind
) {
  return new URL(chainKind === TempleChainKind.Tezos ? hash : `${entityType}/${hash}`, baseUrl).href;
}

const DEFAULT_BLOCK_EXPLORERS_BASE: Record<TempleChainKind, Record<string, Omit<BlockExplorer, 'default'>[]>> = {
  [TempleChainKind.Tezos]: {
    [TempleTezosChainId.Mainnet]: [
      {
        name: 'TzKT',
        url: 'https://tzkt.io',
        id: 'tzkt-mainnet'
      },
      {
        name: 'TzStats',
        url: 'https://tzstats.com',
        id: 'tzstats-mainnet'
      },
      {
        name: 'Better Call Dev',
        url: 'https://better-call.dev/mainnet/opg',
        id: 'bcd-mainnet'
      }
    ],
    [TempleTezosChainId.Ghostnet]: [
      {
        name: 'TzKT',
        url: 'https://ghostnet.tzkt.io',
        id: 'tzkt-ghostnet'
      }
    ],
    [TempleTezosChainId.Paris]: [
      {
        name: 'TzKT',
        url: 'https://parisnet.tzkt.io',
        id: 'tzkt-paris'
      }
    ],
    [TempleTezosChainId.Dcp]: [
      {
        name: 'T4L3NT',
        url: 'https://explorer.tlnt.net',
        id: 'tlnt-mainnet'
      }
    ],
    [TempleTezosChainId.DcpTest]: [
      {
        name: 'T4L3NT',
        url: 'https://explorer.test.tlnt.net',
        id: 'tlnt-testnet'
      }
    ]
  },
  [TempleChainKind.EVM]: {
    [ETHEREUM_MAINNET_CHAIN_ID]: [
      {
        name: 'Etherscan',
        url: 'https://etherscan.io',
        id: 'etherscan-mainnet'
      }
    ],
    [OTHER_COMMON_MAINNET_CHAIN_IDS.polygon]: [
      {
        name: 'PolygonScan',
        url: 'https://polygonscan.com',
        id: 'polygonscan-mainnet'
      }
    ],
    [OTHER_COMMON_MAINNET_CHAIN_IDS.bsc]: [
      {
        name: 'BscScan',
        url: 'https://bscscan.com',
        id: 'bscscan-mainnet'
      }
    ],
    [OTHER_COMMON_MAINNET_CHAIN_IDS.avalanche]: [
      {
        name: 'SnowTrace',
        url: 'https://snowtrace.io',
        id: 'snowtrace-mainnet'
      }
    ],
    [OTHER_COMMON_MAINNET_CHAIN_IDS.optimism]: [
      {
        name: 'Optimistic Ethereum',
        url: 'https://optimistic.etherscan.io',
        id: 'optimism-mainnet'
      }
    ],
    [ETH_SEPOLIA_CHAIN_ID]: [
      {
        name: 'Etherscan',
        url: 'https://sepolia.etherscan.io',
        id: 'eth-sepolia'
      }
    ],
    '80002': [
      {
        name: 'PolygonScan',
        url: 'https://amoy.polygonscan.com',
        id: 'polygon-amoy'
      }
    ],
    '97': [
      {
        name: 'BscScan',
        url: 'https://testnet.bscscan.com',
        id: 'bscscan-testnet'
      }
    ],
    '43113': [
      {
        name: 'SnowTrace',
        url: 'https://testnet.snowtrace.io',
        id: 'snowtrace-testnet'
      }
    ],
    '11155420': [
      {
        name: 'Blockscout',
        url: 'https://optimism-sepolia.blockscout.com',
        id: 'optimism-sepolia'
      }
    ]
  }
};

const DEFAULT_BLOCK_EXPLORERS = transform<
  typeof DEFAULT_BLOCK_EXPLORERS_BASE,
  Record<TempleChainKind, Record<string, BlockExplorer[]>>
>(
  DEFAULT_BLOCK_EXPLORERS_BASE,
  (result, chainKindExplorers, chainKind) => {
    result[chainKind] = transform(chainKindExplorers, (res, chainExplorers, chainId) => {
      res[chainId] = chainExplorers.map(({ id, ...rest }) => ({ ...rest, id, default: true }));

      return res;
    });

    return result;
  },
  { [TempleChainKind.EVM]: {}, [TempleChainKind.Tezos]: {} }
);
