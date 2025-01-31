import { useMemo } from 'react';

import { ChainIds } from '@taquito/taquito';
import { sortBy, uniqBy } from 'lodash';

import { useRawEvmAccountTokensSelector, useRawEvmChainAccountTokensSelector } from 'app/store/evm/assets/selectors';
import {
  useRawEvmAccountBalancesSelector,
  useRawEvmChainAccountBalancesSelector
} from 'app/store/evm/balances/selectors';
import {
  useAllTokensSelector,
  useChainAccountTokensSelector,
  useMainnetTokensWhitelistSelector
} from 'app/store/tezos/assets/selectors';
import { getAccountAssetsStoreKey } from 'app/store/tezos/assets/utils';
import { useAllAccountBalancesSelector, useBalancesAtomicRecordSelector } from 'app/store/tezos/balances/selectors';
import { getKeyForBalancesRecord } from 'app/store/tezos/balances/utils';
import { PREDEFINED_TOKENS_METADATA } from 'lib/assets/known-tokens';
import type { AccountAsset } from 'lib/assets/types';
import { toChainAssetSlug, tokenToSlug } from 'lib/assets/utils';
import { useMemoWithCompare } from 'lib/ui/hooks';
import { EMPTY_FROZEN_OBJ } from 'lib/utils';
import { useEnabledEvmChains, useEnabledTezosChains } from 'temple/front';
import { TempleChainKind } from 'temple/types';

import { getAssetStatus, isAssetStatusIdle } from './utils';

interface AccountToken extends AccountAsset {
  chainId: string | number;
  predefined?: boolean;
}

export const useEnabledAccountChainTokenSlugs = (accountTezAddress: string, accountEvmAddress: HexString) => {
  const tezTokens = useEnabledTezosAccountTokenSlugs(accountTezAddress);
  const evmTokens = useEnabledEvmAccountTokenSlugs(accountEvmAddress);

  return useMemo(() => [...tezTokens, ...evmTokens], [tezTokens, evmTokens]);
};

export const useEnabledTezosAccountTokenSlugs = (publicKeyHash: string) => {
  const tokens = useTezosAccountTokens(publicKeyHash);

  return useMemoWithCompare(
    () =>
      tokens
        .filter(({ status }) => status === 'enabled')
        .map(({ chainId, slug }) => toChainAssetSlug(TempleChainKind.Tezos, chainId, slug)),
    [tokens]
  );
};

export const useEnabledTezosChainAccountTokenSlugs = (publicKeyHash: string, chainId: string) => {
  const tokens = useTezosChainAccountTokens(publicKeyHash, chainId);

  return useMemoWithCompare(
    () => tokens.filter(({ status }) => status === 'enabled').map(({ slug }) => slug),
    [tokens]
  );
};

export const useTezosAccountTokens = (account: string) => {
  const storedRecord = useAllTokensSelector();
  const enabledChains = useEnabledTezosChains();

  const mainnetWhitelist = useMainnetTokensWhitelistSelector();

  const balancesRecord = useBalancesAtomicRecordSelector();

  return useMemo<AccountToken[]>(() => {
    let predefined: AccountToken[] = [];
    let stored: AccountToken[] = [];
    let whitelisted: AccountToken[] = [];

    for (const chain of enabledChains) {
      const chainId = chain.chainId;

      const assetsKey = getAccountAssetsStoreKey(account, chainId);
      const balancesKey = getKeyForBalancesRecord(account, chainId);

      const storedRaw = storedRecord[assetsKey] ?? EMPTY_FROZEN_OBJ;
      const balances = balancesRecord[balancesKey]?.data ?? EMPTY_FROZEN_OBJ;

      // 1. Stored
      stored = stored.concat(
        Object.entries(storedRaw).map<AccountToken>(([slug, { status }]) => ({
          slug,
          status: getAssetStatus(balances[slug], status),
          chainId
        }))
      );

      // 2. Predefined
      const predefinedMetadata = PREDEFINED_TOKENS_METADATA[chain.chainId];

      predefined = predefined.concat(
        predefinedMetadata
          ? predefinedMetadata.map<AccountToken>(metadata => {
              const slug = tokenToSlug(metadata);
              const storedStatus = storedRaw[slug]?.status;
              const status = isAssetStatusIdle(storedStatus) ? 'enabled' : storedStatus;

              return { slug, status, predefined: true, chainId };
            })
          : []
      );

      // 3. Whitelisted
      whitelisted = whitelisted.concat(
        chain.chainId === ChainIds.MAINNET
          ? mainnetWhitelist.map<AccountToken>(slug => ({
              slug,
              status: getAssetStatus(balances[slug]),
              chainId
            }))
          : []
      );
    }

    // Keep this order to preserve correct statuses & flags
    const concatenated: AccountToken[] = predefined.concat(stored).concat(whitelisted);

    return sortBy(
      uniqBy(concatenated, ({ chainId, slug }) => toChainAssetSlug(TempleChainKind.Tezos, chainId, slug)),
      TOKENS_SORT_ITERATEES
    );
  }, [enabledChains, account, storedRecord, balancesRecord, mainnetWhitelist]);
};

/**
 * Sorting is needed to preserve some tokens order (avoid UI listing jumps)
 * after merge of multiple sources (e.g. stored, predefined, whitelist)
 */
const TOKENS_SORT_ITERATEES: (keyof AccountToken)[] = ['predefined', 'slug'];

export const useTezosChainAccountTokens = (account: string, chainId: string) => {
  const storedRaw = useChainAccountTokensSelector(account, chainId);
  const whitelistSlugs = useWhitelistSlugs(chainId);

  const balances = useAllAccountBalancesSelector(account, chainId);

  return useMemo<AccountToken[]>(() => {
    // 1. Stored
    const stored = Object.entries(storedRaw).map<AccountToken>(([slug, { status }]) => ({
      slug,
      status: getAssetStatus(balances[slug], status),
      chainId
    }));

    // 2. Predefined
    const predefinedMetadata = PREDEFINED_TOKENS_METADATA[chainId];

    const predefined = predefinedMetadata
      ? predefinedMetadata.map<AccountToken>(metadata => {
          const slug = tokenToSlug(metadata);
          const storedStatus = storedRaw[slug]?.status;
          const status = isAssetStatusIdle(storedStatus) ? 'enabled' : storedStatus;

          return { slug, status, predefined: true, chainId };
        })
      : [];

    // 3. Whitelisted
    const whitelisted = whitelistSlugs.map<AccountToken>(slug => ({
      slug,
      status: getAssetStatus(balances[slug]),
      chainId
    }));

    // Keep this order to preserve correct statuses & flags
    const concatenated: AccountToken[] = predefined.concat(stored).concat(whitelisted);

    return sortBy(
      uniqBy(concatenated, t => t.slug),
      TOKENS_SORT_ITERATEES
    );
  }, [chainId, storedRaw, whitelistSlugs, balances]);
};

export const useEvmAccountTokens = (account: HexString) => {
  const enabledChains = useEnabledEvmChains();

  const tokensRecord = useRawEvmAccountTokensSelector(account);
  const balancesRecord = useRawEvmAccountBalancesSelector(account);

  return useMemo<AccountToken[]>(() => {
    let accountTokens: AccountToken[] = [];

    for (const chain of enabledChains) {
      const chainId = chain.chainId;

      const chainTokensRecord = tokensRecord[chainId];

      if (!chainTokensRecord) continue;

      accountTokens = accountTokens.concat(
        Object.entries(chainTokensRecord).map<AccountToken>(([slug, { status }]) => ({
          slug,
          status: getAssetStatus(balancesRecord[chainId]?.[slug], status),
          chainId
        }))
      );
    }

    return accountTokens;
  }, [enabledChains, tokensRecord, balancesRecord]);
};

export const useEvmChainAccountTokens = (account: HexString, chainId: number) => {
  const storedRaw = useRawEvmChainAccountTokensSelector(account, chainId);
  const balances = useRawEvmChainAccountBalancesSelector(account, chainId);
  console.log(storedRaw, 'storedRaw');

  return useMemoWithCompare<AccountToken[]>(
    () =>
      Object.entries(storedRaw).map<AccountToken>(([slug, { status }]) => ({
        slug,
        status: getAssetStatus(balances[slug], status),
        chainId
      })),
    [storedRaw, balances, chainId]
  );
};

export const useEnabledEvmAccountTokenSlugs = (publicKeyHash: HexString) => {
  const tokens = useEvmAccountTokens(publicKeyHash);

  return useMemoWithCompare(
    () =>
      tokens
        .filter(({ status }) => status === 'enabled')
        .map(({ chainId, slug }) => toChainAssetSlug(TempleChainKind.EVM, chainId, slug)),
    [tokens]
  );
};

export const useEnabledEvmChainAccountTokenSlugs = (publicKeyHash: HexString, chainId: number) => {
  const tokens = useEvmChainAccountTokens(publicKeyHash, chainId);

  return useMemo(() => tokens.filter(({ status }) => status === 'enabled').map(({ slug }) => slug), [tokens]);
};

const useWhitelistSlugs = (chainId: string) => {
  const mainnetWhitelist = useMainnetTokensWhitelistSelector();

  return useMemoWithCompare(
    () => (chainId === ChainIds.MAINNET ? mainnetWhitelist : []),
    [chainId, mainnetWhitelist],
    (a, b) => a.join('') === b.join('')
  );
};
