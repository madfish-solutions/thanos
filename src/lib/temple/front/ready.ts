import { useEffect, useLayoutEffect, useMemo } from 'react';

import constate from 'constate';
import { isEqual } from 'lodash';

import { CURRENT_TEZOS_NETWORK_ID_STORAGE_KEY, CURRENT_EVM_NETWORK_ID_STORAGE_KEY } from 'lib/constants';
import {
  TempleStatus,
  TempleState,
  TempleNotification,
  TempleMessageType,
  StoredAccount,
  TempleSettings
} from 'lib/temple/types';
import { useMemoWithCompare, useUpdatableRef } from 'lib/ui/hooks';
import { getAccountAddressForTezos, getAccountForEvm, getAccountForTezos } from 'temple/accounts';
import { intercomClient } from 'temple/front/intercom-client';
import { DEFAULT_EVM_NETWORKS, TEZOS_DEFAULT_NETWORKS } from 'temple/networks';

import { useTempleClient } from './client';
import { usePassiveStorage } from './storage';

export const [
  ReadyTempleProvider,
  useAllTezosNetworks,
  useAllEvmNetworks,
  useTezosNetworkStored,
  useEvmNetwork,
  useSetTezosNetworkId,
  useSetEvmNetworkId,
  //
  useAllAccounts,
  useCurrentAccountId,
  useAccount,
  useAccountAddressForTezos,
  useAccountForTezos,
  useAccountAddressForEvm,
  useAccountForEvm,
  useSetAccountId,
  //
  useSettings
] = constate(
  useReadyTemple,
  v => v.allTezosNetworks,
  v => v.allEvmNetworks,
  v => v.tezosNetwork,
  v => v.evmNetwork,
  v => v.setTezosNetworkId,
  v => v.setEvmNetworkId,
  //
  v => v.allAccounts,
  v => v.accountId,
  v => v.account,
  v => v.accountAddressForTezos,
  v => v.accountForTezos,
  v => v.accountAddressForEvm,
  v => v.accountForEvm,
  v => v.setAccountId,
  //
  v => v.settings
);

function useReadyTemple() {
  const templeFront = useTempleClient();
  assertReady(templeFront);

  const { customTezosNetworks, customEvmNetworks, accounts: allAccounts, settings } = templeFront;

  /**
   * Networks
   */

  const allTezosNetworks = useMemo<typeof TEZOS_DEFAULT_NETWORKS>(
    () => [...TEZOS_DEFAULT_NETWORKS, ...customTezosNetworks],
    [customTezosNetworks]
  );
  const allEvmNetworks = useMemo<typeof DEFAULT_EVM_NETWORKS>(
    () => [...DEFAULT_EVM_NETWORKS, ...customEvmNetworks],
    [customEvmNetworks]
  );

  const defTezosNetwork = allTezosNetworks[0];
  const defEvmNetwork = allEvmNetworks[0];

  const [tezosNetworkId, setTezosNetworkId] = usePassiveStorage(
    CURRENT_TEZOS_NETWORK_ID_STORAGE_KEY,
    defTezosNetwork.id
  );

  const [evmNetworkId, setEvmNetworkId] = usePassiveStorage(CURRENT_EVM_NETWORK_ID_STORAGE_KEY, defEvmNetwork.id);

  const tezosNetwork = useMemoWithCompare(
    () => allTezosNetworks.find(n => n.id === tezosNetworkId) ?? defTezosNetwork,
    [allTezosNetworks, tezosNetworkId, defTezosNetwork],
    isEqual
  );

  const evmNetwork = useMemoWithCompare(
    () => allEvmNetworks.find(n => n.id === evmNetworkId) ?? defEvmNetwork,
    [allEvmNetworks, evmNetworkId, defEvmNetwork],
    isEqual
  );

  useEffect(() => {
    if (allTezosNetworks.every(a => a.id !== tezosNetworkId)) {
      setTezosNetworkId(defTezosNetwork.id);
    }
  }, [allTezosNetworks, tezosNetworkId, defTezosNetwork, setTezosNetworkId]);

  useEffect(() => {
    if (allEvmNetworks.every(a => a.id !== evmNetworkId)) {
      setEvmNetworkId(defEvmNetwork.id);
    }
  }, [allEvmNetworks, evmNetworkId, defEvmNetwork, setEvmNetworkId]);

  /**
   * Accounts
   */

  const allAccountsRef = useUpdatableRef(allAccounts);

  const defaultAcc = allAccounts[0];

  const [accountId, setAccountId] = usePassiveStorage('CURRENT_ACCOUNT_ID', defaultAcc.id);

  useEffect(() => {
    return intercomClient.subscribe((msg: TempleNotification) => {
      switch (msg?.type) {
        case TempleMessageType.SelectedAccountChanged:
          const account = allAccountsRef.current.find(
            acc => getAccountAddressForTezos(acc) === msg.accountPublicKeyHash
          );
          if (account) setAccountId(account.id);
          break;
      }
    });
  }, [setAccountId, allAccountsRef]);

  useEffect(() => {
    if (allAccounts.every(a => a.id !== accountId)) {
      setAccountId(defaultAcc.id);
    }
  }, [allAccounts, defaultAcc, accountId, setAccountId]);

  const account = useMemoWithCompare(
    () => allAccounts.find(a => a.id === accountId) ?? defaultAcc,
    [allAccounts, defaultAcc, accountId],
    isEqual
  );

  const accountForTezos = useMemo(() => getAccountForTezos(account), [account]);
  const accountAddressForTezos = accountForTezos?.address;
  const accountForEvm = useMemo(() => getAccountForEvm(account), [account]);
  const accountAddressForEvm = accountForEvm?.address as HexString | undefined;

  /**
   * Error boundary reset
   */

  useLayoutEffect(() => {
    const evt = new CustomEvent('reseterrorboundary');
    window.dispatchEvent(evt);
  }, [accountId, tezosNetworkId, evmNetworkId]);

  return {
    allTezosNetworks,
    allEvmNetworks,
    tezosNetwork,
    evmNetwork,
    setTezosNetworkId,
    setEvmNetworkId,

    allAccounts,
    accountId,
    account,
    accountAddressForTezos,
    accountForTezos,
    accountAddressForEvm,
    accountForEvm,
    setAccountId,

    settings
  };
}

function assertReady<T extends TempleState>(state: T): asserts state is T & ReadyTempleState {
  if (state.status !== TempleStatus.Ready) {
    throw new Error('Temple not ready');
  }
}

interface ReadyTempleState extends TempleState {
  status: TempleStatus.Ready;
  accounts: NonEmptyArray<StoredAccount>;
  settings: TempleSettings;
}
