import { DependencyList, useEffect } from 'react';

import { EmptyFn } from '../config/general';

export const useTimerEffect = (callback: EmptyFn, refreshInterval: number, deps: DependencyList = []) =>
  useEffect(() => {
    callback();

    const interval = setInterval(callback, refreshInterval);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);