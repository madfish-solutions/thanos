import { useDidMount, useDidUpdate, useSafeState, useAbortSignal } from 'lib/ui/hooks';
import { useWillUnmount } from 'lib/ui/hooks/useWillUnmount';

export const RETRY_AFTER_ERROR_TIMEOUT = 5_000;

export function useActivitiesLoadingLogic<A>(
  loadActivities: (initial: boolean, signal: AbortSignal) => Promise<void>,
  resetDeps: unknown[],
  onReset?: EmptyFn,
  initialIsLoading = true
) {
  const [isLoading, setIsLoading] = useSafeState(initialIsLoading);
  const [activities, setActivities] = useSafeState<A[]>([]);
  const [reachedTheEnd, setReachedTheEnd] = useSafeState(false);
  const [error, setError] = useSafeState<unknown>(null);

  const { abort: abortLoading, abortAndRenewSignal } = useAbortSignal();

  function loadNext() {
    if (isLoading || reachedTheEnd || error) return;

    loadActivities(false, abortAndRenewSignal());
  }

  useDidMount(() => void loadActivities(true, abortAndRenewSignal()));

  useWillUnmount(abortLoading);

  useDidUpdate(() => {
    setActivities([]);
    setIsLoading(true);
    setReachedTheEnd(false);
    setError(null);
    onReset?.();

    loadActivities(true, abortAndRenewSignal());
  }, resetDeps);

  return {
    activities,
    isLoading,
    reachedTheEnd,
    error,
    setActivities,
    setIsLoading,
    setReachedTheEnd,
    setError,
    loadNext
  };
}

/* interface ActivityFragment<A, C> {
  activities: A[];
  oldestCursor?: C;
  newestCursor?: C;
}

export function useActivitiesLoadingLogicV2<A, P>(fragments: ActivityFragment<A, P>[]) {} */
