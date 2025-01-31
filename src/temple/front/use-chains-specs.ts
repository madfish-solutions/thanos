import { useCallback, useMemo } from 'react';

import { EVM_CHAINS_SPECS_STORAGE_KEY, TEZOS_CHAINS_SPECS_STORAGE_KEY } from 'lib/constants';
import {
  DEFAULT_EVM_CHAINS_SPECS,
  DEFAULT_TEZOS_CHAINS_SPECS,
  EvmChainSpecs,
  TezosChainSpecs
} from 'lib/temple/chains-specs';
import { useStorage } from 'lib/temple/front/storage';
import { EMPTY_FROZEN_OBJ } from 'lib/utils';
import { TempleChainKind } from 'temple/types';

const useSpecs = <T extends TezosChainSpecs | EvmChainSpecs>(storageKey: string, defaultSpecs: OptionalRecord<T>) => {
  const [storedSpecs, setStoredSpecs] = useStorage<OptionalRecord<T>>(storageKey, EMPTY_FROZEN_OBJ);

  const totalSpecs = useMemo(() => ({ ...defaultSpecs, ...storedSpecs }), [defaultSpecs, storedSpecs]);
  const setSpecs = useCallback(
    (newSpecs: OptionalRecord<T> | ((prevSpecs: OptionalRecord<T>) => OptionalRecord<T>)) =>
      setStoredSpecs(prevSpecs => {
        const prevSpecsWithDefault = { ...defaultSpecs, ...prevSpecs };

        return typeof newSpecs === 'function' ? newSpecs(prevSpecsWithDefault) : newSpecs;
      }),
    [defaultSpecs, setStoredSpecs]
  );

  return [totalSpecs, setSpecs] as const;
};

export const useTezosChainsSpecs = () =>
  useSpecs<TezosChainSpecs>(TEZOS_CHAINS_SPECS_STORAGE_KEY, DEFAULT_TEZOS_CHAINS_SPECS);

export const useEvmChainsSpecs = () => useSpecs<EvmChainSpecs>(EVM_CHAINS_SPECS_STORAGE_KEY, DEFAULT_EVM_CHAINS_SPECS);

export const useChainSpecs = (chainKind: TempleChainKind, chainId: string | number) => {
  const [, setTezosChainsSpecs] = useTezosChainsSpecs();
  const [, setEvmChainsSpecs] = useEvmChainsSpecs();

  const setChainSpecs = useCallback(
    (
      newChainSpecs:
        | TezosChainSpecs
        | EvmChainSpecs
        | ((prevSpecs: TezosChainSpecs) => TezosChainSpecs)
        | ((prevSpecs: EvmChainSpecs) => EvmChainSpecs)
    ) => {
      switch (chainKind) {
        case TempleChainKind.EVM:
          return setEvmChainsSpecs(prevValue => ({
            ...prevValue,
            [chainId]: typeof newChainSpecs === 'function' ? newChainSpecs(prevValue[chainId] ?? {}) : newChainSpecs
          }));
        case TempleChainKind.Tezos:
          return setTezosChainsSpecs(prevValue => ({
            ...prevValue,
            [chainId]: typeof newChainSpecs === 'function' ? newChainSpecs(prevValue[chainId] ?? {}) : newChainSpecs
          }));
      }
    },
    [chainId, chainKind, setEvmChainsSpecs, setTezosChainsSpecs]
  );

  const removeChainSpecs = useCallback(() => {
    switch (chainKind) {
      case TempleChainKind.EVM:
        return setEvmChainsSpecs(({ [chainId]: specsToRemove, ...rest }) => rest);
      case TempleChainKind.Tezos:
        return setTezosChainsSpecs(({ [chainId]: specsToRemove, ...rest }) => rest);
    }
  }, [chainId, chainKind, setEvmChainsSpecs, setTezosChainsSpecs]);

  return [setChainSpecs, removeChainSpecs] as const;
};
