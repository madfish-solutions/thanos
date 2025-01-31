import { useCallback, useEffect, useRef, useState } from 'react';

import { useIsMounted } from './useIsMounted';

export function useSafeState<T>(initialState: T | (() => T), dep?: any): [T, ReactSetStateFn<T>] {
  const isMounted = useIsMounted();
  const [state, setStatePure] = useState(initialState);

  const setState = useCallback<ReactSetStateFn<T>>(
    val => {
      if (isMounted()) {
        setStatePure(val);
      }
    },
    [isMounted, setStatePure]
  );

  const depRef = useRef(dep);

  useEffect(() => {
    if (depRef.current !== dep) {
      setState(initialState);
    }
    depRef.current = dep;
  }, [dep, setState, initialState]);

  return [state, setState];
}
