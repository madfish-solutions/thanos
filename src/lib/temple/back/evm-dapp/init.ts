import browser, { Storage } from 'webextension-polyfill';

import { isTruthy } from 'lib/utils';
import { ChainsRpcUrls, EVM_CHAINS_RPC_URLS_STORAGE_KEY } from 'temple/evm/evm-chains-rpc-urls';

import { ETHEREUM_MAINNET_CHAIN_ID } from '../../types';
import { Vault } from '../vault';

import { getAllDApps, removeDApps, switchChain } from './utils';

export async function init() {
  browser.storage.local.onChanged.addListener(
    evmRpcUrlsListener as unknown as SyncFn<Storage.StorageAreaOnChangedChangesType>
  );

  Vault.subscribeToRemoveAccounts(async addresses => {
    const removedAccounts = new Set(addresses.map(({ evmAddress }) => evmAddress).filter(isTruthy));
    const evmDApps = await getAllDApps();
    const dAppsToRemoveOrigins: string[] = [];

    for (const [origin, dApp] of Object.entries(evmDApps)) {
      if (removedAccounts.has(dApp.pkh)) {
        dAppsToRemoveOrigins.push(origin);
      }
    }

    if (dAppsToRemoveOrigins.length) {
      await removeDApps(dAppsToRemoveOrigins);
    }
  });
}

/** Implements a reaction on disabling a chain or removing it, or wallet reset */
async function evmRpcUrlsListener(changes: StringRecord<Storage.StorageChange>) {
  if (!(EVM_CHAINS_RPC_URLS_STORAGE_KEY in changes)) {
    return;
  }

  const { oldValue, newValue } = changes[EVM_CHAINS_RPC_URLS_STORAGE_KEY];

  const oldEvmRpcUrls: ChainsRpcUrls = oldValue ?? {};
  const newEvmRpcUrls: ChainsRpcUrls = newValue ?? {};
  const removedChainsIds = new Set<number>();
  for (const chainId in oldEvmRpcUrls) {
    const newChainRpcUrls = newEvmRpcUrls[chainId];
    if (!newChainRpcUrls || newChainRpcUrls.length === 0) {
      removedChainsIds.add(Number(chainId));
    }
  }

  if (removedChainsIds.size === 0) {
    return;
  }

  const evmDApps = await getAllDApps();
  const dAppsToRemoveOrigins: string[] = [];
  for (const [origin, dApp] of Object.entries(evmDApps)) {
    if (removedChainsIds.has(dApp.chainId)) {
      dAppsToRemoveOrigins.push(origin);
    }
  }

  if (dAppsToRemoveOrigins.length) {
    await removeDApps(dAppsToRemoveOrigins);
    await Promise.all(dAppsToRemoveOrigins.map(origin => switchChain(origin, ETHEREUM_MAINNET_CHAIN_ID, true)));
  }
}
