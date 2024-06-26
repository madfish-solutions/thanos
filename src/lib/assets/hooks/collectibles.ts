import { useMemo } from 'react';

import { useRawEvmChainAccountCollectiblesSelector } from 'app/store/evm/assets/selectors';
import { useRawEvmChainAccountBalancesSelector } from 'app/store/evm/balances/selectors';
import { useAccountCollectiblesSelector } from 'app/store/tezos/assets/selectors';
import { useAllAccountBalancesSelector } from 'app/store/tezos/balances/selectors';
import { useMemoWithCompare } from 'lib/ui/hooks';

import type { AccountAsset } from '../types';

import { getAssetStatus } from './utils';

export const useAccountCollectibles = (account: string, tezosChainId: string) => {
  const stored = useAccountCollectiblesSelector(account, tezosChainId);

  const balances = useAllAccountBalancesSelector(account, tezosChainId);

  return useMemoWithCompare<AccountAsset[]>(
    () => {
      const result: AccountAsset[] = [];

      for (const [slug, { status }] of Object.entries(stored)) {
        if (status !== 'removed') result.push({ slug, status: getAssetStatus(balances[slug], status) });
      }

      return result;
    },
    [stored, balances],
    (prev, next) => {
      if (prev.length !== next.length) return false;

      return next.every((item, i) => {
        const prevItem = prev[i]!;
        return item.slug === prevItem.slug && item.status === prevItem.status;
      });
    }
  );
};

export const useEnabledAccountCollectiblesSlugs = (publicKeyHash: string, tezosChainId: string) => {
  const collectibles = useAccountCollectibles(publicKeyHash, tezosChainId);

  return useMemo(
    () => collectibles.reduce<string[]>((acc, { slug, status }) => (status === 'enabled' ? acc.concat(slug) : acc), []),
    [collectibles]
  );
};

const useEvmChainAccountCollectibles = (account: HexString, evmChainId: number) => {
  const stored = useRawEvmChainAccountCollectiblesSelector(account, evmChainId);
  const balances = useRawEvmChainAccountBalancesSelector(account, evmChainId);

  return useMemoWithCompare<AccountAsset[]>(
    () => {
      const result: AccountAsset[] = [];

      for (const [slug, { status }] of Object.entries(stored)) {
        if (status !== 'removed') result.push({ slug, status: getAssetStatus(balances[slug], status) });
      }

      return result;
    },
    [stored, balances],
    (prev, next) => {
      if (prev.length !== next.length) return false;

      return next.every((item, i) => {
        const prevItem = prev[i]!;
        return item.slug === prevItem.slug && item.status === prevItem.status;
      });
    }
  );
};

export const useEnabledEvmChainAccountCollectiblesSlugs = (publicKeyHash: HexString, evmChainId: number) => {
  const collectibles = useEvmChainAccountCollectibles(publicKeyHash, evmChainId);

  return useMemo(
    () => collectibles.reduce<string[]>((acc, { slug, status }) => (status === 'enabled' ? acc.concat(slug) : acc), []),
    [collectibles]
  );
};
