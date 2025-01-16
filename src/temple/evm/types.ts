import { evmRpcMethodsNames } from './constants';

export class ErrorWithCode extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

export interface ChangePermissionsPayload {
  [evmRpcMethodsNames.eth_accounts]: StringRecord<unknown>;
}
