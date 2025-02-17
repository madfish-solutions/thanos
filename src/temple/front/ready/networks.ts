import { useCallback, useEffect, useMemo } from 'react';

import { useTestnetModeEnabledSelector } from 'app/store/settings/selectors';
import { EVM_TOKEN_SLUG } from 'lib/assets/defaults';
import { EvmAssetStandard } from 'lib/evm/types';
import { EvmNativeTokenMetadata } from 'lib/metadata/types';
import { EvmChainSpecs, TezosChainSpecs } from 'lib/temple/chains-specs';
import {
  ActiveChainsRpcUrls,
  ChainsRpcUrls,
  setActiveEvmChainsRpcUrls,
  setEvmChainsRpcUrls
} from 'temple/evm/evm-chains-rpc-urls';
import { getViemChainsList } from 'temple/evm/utils';
import {
  DEFAULT_EVM_CURRENCY,
  EVM_DEFAULT_NETWORKS,
  StoredEvmNetwork,
  StoredTezosNetwork,
  TEZOS_DEFAULT_NETWORKS
} from 'temple/networks';
import { TempleChainKind } from 'temple/types';

import type { ChainBase, EvmChain, OneOfChains, TezosChain } from '../chains';
import { useBlockExplorers } from '../use-block-explorers';
import { useEvmChainsSpecs, useTezosChainsSpecs } from '../use-chains-specs';

export function useReadyTempleTezosNetworks(customTezosNetworks: StoredTezosNetwork[]) {
  const allTezosNetworks = useMemo<typeof TEZOS_DEFAULT_NETWORKS>(
    () => [...TEZOS_DEFAULT_NETWORKS, ...customTezosNetworks],
    [customTezosNetworks]
  );

  const [tezosChainsSpecs] = useTezosChainsSpecs();

  const makeChain = useCallback(
    (baseProps: ChainBaseProps<TezosChain>) => ({
      ...baseProps,
      kind: TempleChainKind.Tezos as const
    }),
    []
  );
  const { allChains, enabledChains } = useChains<TezosChain>(
    makeChain,
    tezosChainsSpecs,
    allTezosNetworks,
    TEZOS_DEFAULT_NETWORKS,
    TempleChainKind.Tezos
  );

  return {
    allTezosChains: allChains,
    enabledTezosChains: enabledChains
  };
}

export function useReadyTempleEvmNetworks(customEvmNetworks: StoredEvmNetwork[]) {
  const allEvmNetworks = useMemo<typeof EVM_DEFAULT_NETWORKS>(
    () => [...EVM_DEFAULT_NETWORKS, ...customEvmNetworks],
    [customEvmNetworks]
  );

  const [evmChainsSpecs] = useEvmChainsSpecs();

  const makeChain = useCallback(
    (baseProps: ChainBaseProps<EvmChain>, specs?: EvmChainSpecs) => ({
      ...baseProps,
      kind: TempleChainKind.EVM as const,
      currency: getCurrency(baseProps.chainId, specs?.currency)
    }),
    []
  );
  const { allChains, enabledChains } = useChains<EvmChain>(
    makeChain,
    evmChainsSpecs,
    allEvmNetworks,
    EVM_DEFAULT_NETWORKS,
    TempleChainKind.EVM
  );

  useEffect(() => {
    setEvmChainsRpcUrls(
      // `enabledChains` are filtered by `testnetModeEnabled`, which is harmful here
      Object.values(allChains)
        .filter(({ disabled }) => !disabled)
        .reduce<ChainsRpcUrls>(
          (acc, { chainId, allRpcs }) => ({
            ...acc,
            [chainId]: allRpcs.map(({ rpcBaseURL }) => rpcBaseURL)
          }),
          {}
        )
    ).catch(e => console.error(e));
    setActiveEvmChainsRpcUrls(
      Object.values(allChains)
        .filter(({ disabled }) => !disabled)
        .reduce<ActiveChainsRpcUrls>(
          (acc, { chainId, rpcBaseURL }) => ({
            ...acc,
            [chainId]: rpcBaseURL
          }),
          {}
        )
    );
  }, [allChains]);

  return {
    allEvmChains: allChains,
    enabledEvmChains: enabledChains
  };
}

type Specs<T extends OneOfChains> = T extends TezosChain ? TezosChainSpecs : EvmChainSpecs;
type StoredNetwork<T extends OneOfChains> = T extends TezosChain ? StoredTezosNetwork : StoredEvmNetwork;
// This type works even worse if specified with omitting props of `T`
type ChainBaseProps<T extends OneOfChains> = ChainBase & Pick<T, 'chainId' | 'rpc' | 'allRpcs'>;

function useChains<T extends OneOfChains>(
  makeChain: (baseProps: ChainBaseProps<T>, specs?: Specs<T>) => T,
  chainsSpecs: OptionalRecord<Specs<T>>,
  networks: NonEmptyArray<StoredNetwork<T>>,
  defaultNetworks: NonEmptyArray<StoredNetwork<T>>,
  chainKind: T['kind']
) {
  const { allBlockExplorers } = useBlockExplorers();
  const testnetModeEnabled = useTestnetModeEnabledSelector();

  const allChains = useMemo(() => {
    const rpcByChainId = new Map<T['chainId'], NonEmptyArray<StoredNetwork<T>>>();

    for (const rpc of networks) {
      const networks = rpcByChainId.get(rpc.chainId);
      if (networks) networks.push(rpc);
      else rpcByChainId.set(rpc.chainId, [rpc]);
    }

    const chains: StringRecord<T> = {};

    for (const [chainId, networks] of rpcByChainId) {
      const specs = chainsSpecs[String(chainId)];
      const activeRpcId = specs?.activeRpcId;
      const activeRpc = (activeRpcId && networks.find(n => n.id === activeRpcId)) || networks[0];
      const { rpcBaseURL } = activeRpc;

      const defaultRpc = defaultNetworks.find(n => n.chainId === chainId);
      const { name: fallbackName, nameI18nKey } = defaultRpc ?? activeRpc;
      const name = specs?.name ?? fallbackName;
      const chainBlockExplorers = allBlockExplorers[chainKind]?.[chainId] ?? [];

      const baseProps: ChainBaseProps<T> = {
        chainId,
        rpcBaseURL,
        name,
        nameI18nKey,
        rpc: activeRpc,
        disabled: specs?.disabled,
        allRpcs: networks as T['allRpcs'],
        allBlockExplorers: chainBlockExplorers,
        activeBlockExplorer:
          chainBlockExplorers.find(({ id }) => id === specs?.activeBlockExplorerId) ?? chainBlockExplorers[0],
        testnet: specs?.testnet,
        default: Boolean(defaultRpc)
      };

      chains[String(chainId)] = makeChain(baseProps, specs);
    }

    return chains;
  }, [allBlockExplorers, chainKind, chainsSpecs, defaultNetworks, makeChain, networks]);

  const enabledChains = useMemo(
    () =>
      Object.values(allChains).filter(
        chain => !chain.disabled && (testnetModeEnabled ? chain.testnet : !chain.testnet)
      ),
    [allChains, testnetModeEnabled]
  );

  return { allChains, enabledChains };
}

const getCurrency = (chainId: number, specsCurrency?: EvmNativeTokenMetadata): EvmNativeTokenMetadata => {
  if (specsCurrency) return specsCurrency;

  const viemChain = getViemChainsList().find(chain => chain.id === chainId);

  if (viemChain) {
    return {
      standard: EvmAssetStandard.NATIVE,
      address: EVM_TOKEN_SLUG,
      ...viemChain.nativeCurrency
    };
  }

  return DEFAULT_EVM_CURRENCY;
};
