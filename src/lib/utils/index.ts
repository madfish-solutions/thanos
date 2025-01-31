import { Mutex } from 'async-mutex';
import EventEmitter from 'events';
import { capitalize } from 'lodash';

export { arrayBufferToString, stringToArrayBuffer, uInt8ArrayToString, stringToUInt8Array } from './buffers';

/** From lodash */
type Truthy<T> = T extends null | undefined | void | false | '' | 0 | 0n ? never : T;

export const EMPTY_FROZEN_OBJ: StringRecord<never> = {};
Object.freeze(EMPTY_FROZEN_OBJ);

/** From lodash */
function noop() {}

export const isTruthy = <T>(value: T): value is Truthy<T> => Boolean(value);

/** With strict equality check (i.e. `===`) */
export const filterUnique = <T>(array: T[]) => Array.from(new Set(array));

/** Creates the function that runs promises paralelly but resolves them in FIFO order. */
export const fifoResolve = <A extends unknown[], T>(fn: (...args: A) => Promise<T>) => {
  const queueMutex = new Mutex();
  const queue: Array<Promise<T>> = [];

  return async (...args: A): Promise<T> => {
    const promise = fn(...args);
    await queueMutex.runExclusive(() => queue.push(promise));

    try {
      const prevPromises = await queueMutex.runExclusive(() => queue.slice(0, queue.indexOf(promise)));
      await Promise.all(prevPromises.map(promise => promise.catch(noop)));

      return await promise;
    } finally {
      await queueMutex.runExclusive(() => queue.splice(queue.indexOf(promise), 1));
    }
  };
};

const DEFAULT_DELAY = 300;

export const delay = (ms = DEFAULT_DELAY) => new Promise(res => setTimeout(res, ms));

export const rejectOnTimeout = <R>(promise: Promise<R>, timeout: number, timeoutRejectValue: unknown) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(timeoutRejectValue), timeout))
  ]) as Promise<R>;

class AssertionError extends Error {
  constructor(message?: string, public actual?: any) {
    super(message);
  }
}

export const assert: (value: any, errorMessage?: string) => asserts value = (
  value,
  errorMessage = `The value ${value} is not truthy`
) => {
  if (!value) throw new AssertionError(errorMessage, value);
};

export interface PromisesQueueCounters {
  length: number;
  maxLength: number;
}

export const DEFAULT_PROMISES_QUEUE_COUNTERS: PromisesQueueCounters = { length: 0, maxLength: 0 };

export class PromisesQueue extends EventEmitter {
  private _counters = { ...DEFAULT_PROMISES_QUEUE_COUNTERS };
  private worker: Promise<void> = Promise.resolve();
  static COUNTERS_CHANGE_EVENT_NAME = 'countersChange';

  get counters() {
    return { ...this._counters };
  }

  enqueue<T>(factory: () => Promise<T>) {
    return new Promise<T>((res, rej) => {
      this._counters.length++;
      this._counters.maxLength++;
      this.emitCountersChange();
      this.worker = this.worker.then(() =>
        factory()
          .then(result => {
            // Decrementing in `finally` is not completely testable
            this.decrement();
            res(result);
          })
          .catch(err => {
            this.decrement();
            rej(err);
          })
      );
    });
  }

  private emitCountersChange() {
    this.emit(PromisesQueue.COUNTERS_CHANGE_EVENT_NAME, this.counters);
  }

  private decrement() {
    this._counters.length--;
    if (this._counters.length === 0) {
      this._counters.maxLength = 0;
    }
    this.emitCountersChange();
  }
}

export const openLink = (href: string, newTab = true, noreferrer = false) => {
  const anchor = document.createElement('a');
  anchor.href = href;
  if (newTab) anchor.target = '_blank';
  if (noreferrer) anchor.rel = 'noreferrer';
  anchor.click();
};

const getEntityNameTokens = (input: string) => input.split(/[^a-z0-9]/i).filter(Boolean);

export const generateEntityNameFromUrl = (url: string) => {
  const { hostname, pathname } = new URL(url);

  return getEntityNameTokens(hostname).slice(0, -1).concat(getEntityNameTokens(pathname)).map(capitalize).join(' ');
};
