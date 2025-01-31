import { useLayoutEffect, useMemo } from 'react';

import constate from 'constate';

import { useTempleClient } from 'lib/temple/front/client';
import { TempleStatus, TempleState, StoredAccount, TempleSettings } from 'lib/temple/types';
import { TempleChainKind } from 'temple/types';

import { useGetActiveBlockExplorer } from '../use-block-explorers';

import { useReadyTempleAccounts } from './accounts';
import { useReadyTempleTezosNetworks, useReadyTempleEvmNetworks } from './networks';

export const [
  ReadyTempleProvider,
  //
  useAllTezosChains,
  useEnabledTezosChains,
  //
  useAllEvmChains,
  useEnabledEvmChains,
  //
  useAllAccounts,
  useCurrentAccountId,
  useAccount,
  useAccountAddressForTezos,
  useAccountForTezos,
  useAccountForEvm,
  useAccountAddressForEvm,
  useSetAccountId,
  //
  useSettings,
  //
  useHDGroups,
  //
  useGetTezosActiveBlockExplorer,
  useGetEvmActiveBlockExplorer
] = constate(
  useReadyTemple,
  //
  v => v.allTezosChains,
  v => v.enabledTezosChains,
  //
  v => v.allEvmChains,
  v => v.enabledEvmChains,
  //
  v => v.allAccounts,
  v => v.accountId,
  v => v.account,
  v => v.accountAddressForTezos,
  v => v.accountForTezos,
  v => v.accountForEvm,
  v => v.accountAddressForEvm,
  v => v.setAccountId,
  //
  v => v.settings,
  //
  v => v.hdGroups,
  //
  v => v.getTezosActiveBlockExplorer,
  v => v.getEvmActiveBlockExplorer
);

function useReadyTemple() {
  const templeFront = useTempleClient();
  assertReady(templeFront);

  const { customTezosNetworks, customEvmNetworks, accounts: allAccounts, settings, walletsSpecs } = templeFront;

  const hdGroups = useMemo(
    () =>
      Object.entries(walletsSpecs)
        .sort(([, { createdAt: aCreatedAt }], [, { createdAt: bCreatedAt }]) => aCreatedAt - bCreatedAt)
        .map(([id, { name }]) => ({ id, name })),
    [walletsSpecs]
  );

  const readyTempleTezosNetworks = useReadyTempleTezosNetworks(customTezosNetworks);
  const readyTempleEvmNetworks = useReadyTempleEvmNetworks(customEvmNetworks);

  const readyTempleAccounts = useReadyTempleAccounts(allAccounts);

  const getTezosActiveBlockExplorer = useGetActiveBlockExplorer(TempleChainKind.Tezos);
  const getEvmActiveBlockExplorer = useGetActiveBlockExplorer(TempleChainKind.EVM);

  /** Error boundary reset */
  useLayoutEffect(() => {
    const evt = new CustomEvent('reseterrorboundary');
    window.dispatchEvent(evt);
  }, [readyTempleAccounts.accountId]);

  return {
    ...readyTempleTezosNetworks,
    ...readyTempleEvmNetworks,

    ...readyTempleAccounts,

    hdGroups,
    settings,

    getTezosActiveBlockExplorer,
    getEvmActiveBlockExplorer
  };
}

function assertReady<T extends TempleState>(state: T): asserts state is T & ReadyTempleState {
  if (state.status !== TempleStatus.Ready) {
    throw new Error('Temple not ready');
  }
}

interface ReadyTempleState {
  status: TempleStatus.Ready;
  accounts: NonEmptyArray<StoredAccount>;
  settings: TempleSettings;
}
