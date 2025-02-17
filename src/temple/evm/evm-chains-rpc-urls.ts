import { fetchFromStorage, putToStorage } from 'lib/storage';
import { EVM_DEFAULT_NETWORKS } from 'temple/networks';

export const EVM_CHAINS_RPC_URLS_STORAGE_KEY = 'evmChainsRpcUrls';
const ACTIVE_EVM_CHAINS_RPC_URLS_STORAGE_KEY = 'activeEvmChainsRpcUrls';

export type ActiveChainsRpcUrls = Partial<StringRecord>;
export type ChainsRpcUrls = Partial<StringRecord<string[]>>;

const DEFAULT_CHAINS_RPC_URLS = EVM_DEFAULT_NETWORKS.reduce<ChainsRpcUrls>((acc, { chainId, rpcBaseURL }) => {
  const previousChainRpcs = acc[chainId];
  if (previousChainRpcs) {
    previousChainRpcs.push(rpcBaseURL);
  } else {
    acc[chainId] = [rpcBaseURL];
  }

  return acc;
}, {});

const DEFAULT_ACTIVE_CHAINS_RPC_URLS = EVM_DEFAULT_NETWORKS.reduce<ActiveChainsRpcUrls>(
  (acc, { chainId, rpcBaseURL }) => {
    if (!acc[chainId]) {
      acc[chainId] = rpcBaseURL;
    }

    return acc;
  },
  {}
);

export const getEvmChainsRpcUrls = async () =>
  (await fetchFromStorage<Partial<StringRecord<string[]>>>(EVM_CHAINS_RPC_URLS_STORAGE_KEY)) ?? DEFAULT_CHAINS_RPC_URLS;

export const setEvmChainsRpcUrls = (urls: Partial<StringRecord<string[]>>) =>
  putToStorage(EVM_CHAINS_RPC_URLS_STORAGE_KEY, urls);

export const getActiveEvmChainsRpcUrls = async () =>
  (await fetchFromStorage<ActiveChainsRpcUrls>(ACTIVE_EVM_CHAINS_RPC_URLS_STORAGE_KEY)) ??
  DEFAULT_ACTIVE_CHAINS_RPC_URLS;

export const setActiveEvmChainsRpcUrls = (urls: ActiveChainsRpcUrls) =>
  putToStorage(ACTIVE_EVM_CHAINS_RPC_URLS_STORAGE_KEY, urls);
