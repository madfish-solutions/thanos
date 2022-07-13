import { useCallback, useEffect, useRef, useState } from 'react';

import constate from 'constate';

import { TzktAccountTokenBalance } from 'lib/tzkt';
import { fetchTokenBalances, fetchTokenBalancesCount } from 'lib/tzkt/client';

import { useAccount, useChainId } from './ready';

export const [FungibleTokensBalancesProvider, useFungibleTokensBalances] = constate(() => {
  const chainId = useChainId(true)!;
  const account = useAccount();
  const address = account.publicKeyHash;
  const [items, setItems] = useState<Array<TzktAccountTokenBalance>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pageToLoad = useRef(0);
  const initialPageLoaded = useRef(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (initialPageLoaded.current) {
      initialPageLoaded.current = false;
      setItems([]);
    }
  }, [address, chainId]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    const count = await fetchTokenBalancesCount(chainId, address);
    const data = await fetchTokenBalances(chainId, address, pageToLoad.current);
    pageToLoad.current = pageToLoad.current + 1;
    setHasMore(items.length < count);
    setItems(prevItems => [...prevItems, ...data]);
    setIsLoading(false);
  }, [address, chainId, items.length]);

  useEffect(() => {
    if (initialPageLoaded.current) {
      return;
    }
    pageToLoad.current = 0;

    loadItems();
    initialPageLoaded.current = true;
  }, [loadItems]);

  return {
    items,
    hasMore,
    isLoading,
    setItems,
    loadItems
  };
});
