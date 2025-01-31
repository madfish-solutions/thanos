import { useEffect, useState } from 'react';

export const useVanishingState = <S = string>(timeout = 20_000): [S | null, ReactSetStateFn<S | null>] => {
  const [state, setState] = useState<S | null>(null);

  useEffect(() => {
    if (state === null) return;

    const timer = setTimeout(() => setState(null), timeout);

    return () => clearTimeout(timer);
  }, [state, setState]);

  return [state, setState];
};
