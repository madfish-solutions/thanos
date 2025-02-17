import BigNumber from 'bignumber.js';

export const ZERO = new BigNumber(0);
export const ONE = new BigNumber(1);

export const isPositiveNumber = (value?: number): value is number => value != null && value > 0;

const THOUSAND = 1_000;
const MILLION = 1_000_000;
const BILLION = 1_000_000_000;

export const ONE_HOUR_MS = 3600_000;

export const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export const ONE_MINUTE_S = 60;

// TODO: Use this formatter for inputs in a swap route view
// ts-prune-ignore-next
export const kFormatter = (num: number): string => {
  if (isNaN(num)) {
    return '';
  }

  const sign = Math.sign(num);

  const formattedValue = Math.abs(num);

  if (formattedValue >= BILLION) {
    return (sign * Math.round(formattedValue / BILLION)).toLocaleString() + 'B';
  }

  if (formattedValue >= MILLION) {
    return (sign * Math.round(formattedValue / MILLION)).toLocaleString() + 'M';
  }

  if (formattedValue >= THOUSAND) {
    return (sign * Math.round(formattedValue / THOUSAND)).toLocaleString() + 'K';
  }

  return (sign * formattedValue).toLocaleString();
};

export const toBigNumber = (x: bigint) => new BigNumber(x.toString());

export const toBigInt = (x: BigNumber) => BigInt(x.integerValue().toString());
