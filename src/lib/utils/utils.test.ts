import { isTruthy, createQueue, delay, fifoResolve } from './index';

/** See: https://developer.mozilla.org/en-US/docs/Glossary/Falsy */
const ALL_FALSY_VALUES = [false, 0, -0, BigInt(0), '', NaN, null, undefined];

const SOME_TRUTHY_VALUES = [123, '123', true, {}, Infinity];

describe('isTruthy', () => {
  it("should return `false` for all 'falsy' values", () => {
    expect(ALL_FALSY_VALUES.some(val => isTruthy(val))).toEqual(false);
  });

  it("should return `true` for all 'truthy' values", () => {
    expect(SOME_TRUTHY_VALUES.every(val => isTruthy(val))).toEqual(true);
  });
});

describe('Queue', () => {
  it('queue', async () => {
    const enqueue = createQueue();

    const result: number[] = [];
    await Promise.all([
      enqueue(() =>
        withDelay(300, () => {
          result.push(1);
        })
      ),
      enqueue(() =>
        withDelay(200, () => {
          result.push(2);
        })
      ),
      enqueue(() =>
        withDelay(100, () => {
          result.push(3);
        })
      ),
      enqueue(() =>
        withDelay(0, () => {
          result.push(4);
        })
      )
    ]);

    expect(result).toStrictEqual([1, 2, 3, 4]);
  });
});

describe('fifoResolve', () => {
  it('should run promises parallelly but resolve them in FIFO order', async () => {
    const t0 = Date.now();
    const ids: number[] = [];
    const fn = fifoResolve((ms: number) => delay(ms));

    const pushAfterFnResolves = (ms: number, id: number) => fn(ms).then(() => ids.push(id));

    await Promise.all([
      pushAfterFnResolves(300, 1),
      pushAfterFnResolves(200, 2),
      pushAfterFnResolves(100, 3),
      pushAfterFnResolves(0, 4),
      pushAfterFnResolves(300, 5),
      pushAfterFnResolves(200, 6),
      pushAfterFnResolves(100, 7),
      pushAfterFnResolves(0, 8)
    ]);

    const t1 = Date.now();
    expect(t1 - t0).toBeGreaterThanOrEqual(300);
    expect(t1 - t0).toBeLessThan(400);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

async function withDelay(ms: number, factory: () => any) {
  await delay(ms);

  return factory();
}
