import BigNumber from 'bignumber.js';

export const checkZeroBalance = (balance: BigNumber, nativeBalance: BigNumber, isNativeAsset: boolean) => {
  if (balance.isZero()) throw new Error('Balance is 0');

  if (!isNativeAsset) {
    if (nativeBalance.isZero()) {
      throw new Error('Gas token balance is 0');
    }
  }
};
