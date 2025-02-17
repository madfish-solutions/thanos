export enum EVMErrorCodes {
  USER_REJECTED_REQUEST = 4001,
  NOT_AUTHORIZED = 4100,
  METHOD_NOT_SUPPORTED = 4200,
  PROVIDER_DISCONNECTED = 4900,
  CHAIN_DISCONNECTED = 4901,
  CHAIN_NOT_RECOGNIZED = 4902,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  INVALID_INPUT = -32000
}

// Enum doesn't always work as expected in TypeScript
export const evmRpcMethodsNames = {
  eth_accounts: 'eth_accounts',
  eth_requestAccounts: 'eth_requestAccounts',
  wallet_watchAsset: 'wallet_watchAsset',
  wallet_addEthereumChain: 'wallet_addEthereumChain',
  wallet_switchEthereumChain: 'wallet_switchEthereumChain',
  eth_signTypedData: 'eth_signTypedData',
  eth_signTypedData_v1: 'eth_signTypedData_v1',
  eth_signTypedData_v3: 'eth_signTypedData_v3',
  eth_signTypedData_v4: 'eth_signTypedData_v4',
  personal_sign: 'personal_sign',
  wallet_getPermissions: 'wallet_getPermissions',
  wallet_requestPermissions: 'wallet_requestPermissions',
  wallet_revokePermissions: 'wallet_revokePermissions',
  personal_ecRecover: 'personal_ecRecover',
  wallet_sendTransaction: 'wallet_sendTransaction',
  eth_sendTransaction: 'eth_sendTransaction',
  eth_chainId: 'eth_chainId',
  eth_gasPrice: 'eth_gasPrice'
} as const;

export const RETURNED_ACCOUNTS_CAVEAT_NAME = 'restrictReturnedAccounts';

export const GET_DEFAULT_WEB3_PARAMS_METHOD_NAME = 'getDefaultRpc';
