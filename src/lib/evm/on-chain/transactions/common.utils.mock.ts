export const detectEvmTokenStandard = jest.fn();

jest.mock('../utils/common.utils', () => ({
  detectEvmTokenStandard
}));
