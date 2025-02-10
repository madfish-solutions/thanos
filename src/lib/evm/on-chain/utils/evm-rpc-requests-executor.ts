import { Mutex, Semaphore } from 'async-mutex';

export class RequestAlreadyPendingError extends Error {}

export abstract class EvmRpcRequestsExecutor<T extends object, R, K extends string | number> {
  private requestsPools = new Map<K, { semaphore: Semaphore; pendingRequests: T[] }>();
  private mapMutex = new Mutex();

  constructor(private readonly rps = 15) {}

  protected abstract getRequestsPoolKey(payload: T): K;
  protected abstract requestsAreSame(a: T, b: T): boolean;
  protected abstract getResult(payload: T): Promise<R>;

  async poolIsEmpty(key: K) {
    return this.mapMutex.runExclusive(async () => {
      const pool = this.requestsPools.get(key);
      return !pool || pool.pendingRequests.length === 0;
    });
  }

  async allPoolsAreEmpty() {
    return this.mapMutex.runExclusive(() => {
      for (const key of this.requestsPools.keys()) {
        const pool = this.requestsPools.get(key);
        if (pool && pool.pendingRequests.length > 0) {
          return false;
        }
      }

      return true;
    });
  }

  async executeRequest(payload: T) {
    const chainId = this.getRequestsPoolKey(payload);

    const { pool, alreadyPending } = await this.mapMutex.runExclusive(async () => {
      let pool = this.requestsPools.get(chainId);
      if (!pool) {
        pool = {
          semaphore: new Semaphore(this.rps),
          pendingRequests: []
        };
        this.requestsPools.set(chainId, pool);
      }

      const alreadyPending = pool.pendingRequests.some(pendingRequest => this.requestsAreSame(pendingRequest, payload));
      if (!alreadyPending) {
        pool.pendingRequests.push(payload);
      }

      return { pool, alreadyPending };
    });

    if (alreadyPending) {
      throw new RequestAlreadyPendingError();
    }

    const [, release] = await pool.semaphore.acquire();
    setTimeout(release, 1000);

    return this.getResult(payload).finally(() => {
      this.mapMutex.runExclusive(() => {
        pool.pendingRequests = pool.pendingRequests.filter(
          pendingRequest => !this.requestsAreSame(pendingRequest, payload)
        );
      });
    });
  }
}
