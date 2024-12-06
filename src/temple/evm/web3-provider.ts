import { v4 as uuid } from 'uuid';
import {
  EIP1193EventMap,
  EIP1193Parameters,
  EIP1193RequestFn,
  EIP1474Methods,
  ProviderConnectInfo,
  ProviderMessage,
  ProviderRpcError,
  PublicClient,
  recoverMessageAddress,
  RpcSchema,
  RpcSchemaOverride,
  toHex,
  WalletPermission
} from 'viem';

import { DISCONNECT_DAPP_EVENT, PASS_TO_BG_EVENT, RESPONSE_FROM_BG_EVENT, SWITCH_CHAIN_EVENT } from 'lib/constants';
import { ETHEREUM_MAINNET_CHAIN_ID } from 'lib/temple/types';

import {
  evmRpcMethodsNames,
  GET_DEFAULT_WEB3_PARAMS_METHOD_NAME,
  INVALID_INPUT_ERROR_CODE,
  METHOD_NOT_SUPPORTED_BY_PROVIDER_ERROR_CODE,
  RETURNED_ACCOUNTS_CAVEAT_NAME
} from './constants';
import { getReadOnlyEvm } from './get-read-only-evm';
import { TypedDataV1 } from './typed-data-v1';
import { ErrorWithCode } from './types';

const ETH_MAINNET_RPC_URL = 'https://cloudflare-eth.com';

interface EIP1193Callbacks {
  accountsChanged: SyncFn<HexString[]>[];
  chainChanged: SyncFn<HexString>[];
  networkChanged: SyncFn<HexString>[];
  connect: SyncFn<ProviderConnectInfo>[];
  disconnect: SyncFn<ProviderRpcError>[];
  message: SyncFn<ProviderMessage>[];
}

export interface PassToBgEventDetail {
  origin: string;
  args: any;
  chainId: string;
  iconUrl?: string;
  requestId: string;
}

type ExtraSignMethods = [
  {
    Method: 'eth_signTypedData';
    Parameters: [message: TypedDataV1, address: HexString];
    ReturnType: HexString;
  },
  {
    Method: 'eth_signTypedData_v1';
    Parameters: [message: TypedDataV1, address: HexString];
    ReturnType: HexString;
  },
  {
    Method: 'eth_signTypedData_v3';
    Parameters: [address: HexString, message: string];
    ReturnType: HexString;
  },
  {
    Method: 'personal_ecRecover';
    Parameters: [message: string, signature: HexString];
    ReturnType: HexString;
  }
];
type InternalServiceMethods = [
  {
    Method: typeof GET_DEFAULT_WEB3_PARAMS_METHOD_NAME;
    Parameters?: null;
    ReturnType: { chainId: HexString; rpcUrls: string[]; accounts: HexString[] };
  }
];
type KnownMethods = [...EIP1474Methods, ...ExtraSignMethods, ...InternalServiceMethods];

type RequestParameters = EIP1193Parameters<KnownMethods>;

type DerivedRpcSchema<
  rpcSchema extends RpcSchema | undefined,
  rpcSchemaOverride extends RpcSchemaOverride | undefined
> = rpcSchemaOverride extends RpcSchemaOverride ? [rpcSchemaOverride & { Method: string }] : rpcSchema;

type RequestArgs<M extends RequestParameters['method']> = Extract<
  EIP1193Parameters<DerivedRpcSchema<KnownMethods, undefined>>,
  { method: M }
>;
type ProviderResponse<M extends RequestParameters['method']> = Extract<
  DerivedRpcSchema<KnownMethods, undefined>[number],
  { Method: M }
>['ReturnType'];

type BackgroundResponseDataOverrides = {
  wallet_switchEthereumChain: { chainId: HexString; rpcUrls: string[] };
  eth_requestAccounts: { accounts: HexString[]; rpcUrls: string[] };
  wallet_requestPermissions: { permissions: WalletPermission[]; rpcUrls: string[] };
  wallet_revokePermissions: object;
};
type BackgroundResponseData<M extends RequestParameters['method']> = M extends keyof BackgroundResponseDataOverrides
  ? BackgroundResponseDataOverrides[M]
  : ProviderResponse<M>;

interface BackgroundErrorResponse {
  error: {
    code: number;
    message: string;
  };
  requestId: string;
}

interface BackgroundSuccessResponse<M extends RequestParameters['method']> {
  data: BackgroundResponseData<M>;
  requestId: string;
}

type BackgroundResponse<M extends RequestParameters['method']> = BackgroundSuccessResponse<M> | BackgroundErrorResponse;

type RpcSignMethod =
  | 'personal_sign'
  | 'eth_signTypedData'
  | 'eth_signTypedData_v1'
  | 'eth_signTypedData_v3'
  | 'eth_signTypedData_v4';

const identity = <T>(x: T) => x;
const noop = () => {};

export class TempleWeb3Provider {
  private baseProvider: PublicClient;
  private accounts: HexString[];
  private chainId: HexString;
  private callbacks: EIP1193Callbacks;

  // Other extensions do the same
  readonly isMetaMask = true;

  private async handleRequest<M extends RequestParameters['method']>(
    args: RequestArgs<M>,
    effectFn: (data: BackgroundResponseData<M>) => void,
    toProviderResponse: (data: BackgroundResponseData<M>) => ProviderResponse<M>,
    requiredAccount: HexString | undefined
  ) {
    if (requiredAccount && !this.accounts.some(acc => acc.toLowerCase() === requiredAccount.toLowerCase())) {
      throw new ErrorWithCode(INVALID_INPUT_ERROR_CODE, 'Account is not available');
    }

    const iconsTags = Array.from(document?.head?.querySelectorAll('link[rel*="icon"]') ?? []) as HTMLLinkElement[];
    const { CID } = await import('multiformats/cid');
    const iconUrl = iconsTags
      .map(tag => tag.href)
      .find(url => {
        const parsedUrl = new URL(url);
        let endsWithIpfsCid: boolean;
        try {
          CID.parse(parsedUrl.pathname.split('/').at(-1) ?? '');
          endsWithIpfsCid = true;
        } catch {
          endsWithIpfsCid = false;
        }
        const isHttpImgUrl =
          parsedUrl.protocol.match(/^https?:$/) &&
          (parsedUrl.pathname.match(/\.(png|jpe?g|gif|svg|ico)$/) || endsWithIpfsCid);
        const isDataImgUrl = parsedUrl.protocol === 'data:' && parsedUrl.pathname.match(/^image\/(png|jpe?g|gif|svg)$/);

        return isHttpImgUrl || isDataImgUrl;
      });
    const requestId = uuid();
    window.dispatchEvent(
      new CustomEvent<PassToBgEventDetail>(PASS_TO_BG_EVENT, {
        detail: { args, origin: window.origin, chainId: this.chainId, iconUrl, requestId }
      })
    );

    return new Promise<ProviderResponse<M>>((resolve, reject) => {
      const listener = (evt: Event) => {
        const { requestId: reqIdFromEvent, ...responseContent } = (evt as CustomEvent<BackgroundResponse<M>>).detail;

        if (reqIdFromEvent !== requestId) {
          return;
        }

        window.removeEventListener(RESPONSE_FROM_BG_EVENT, listener);

        if ('error' in responseContent) {
          console.error('inpage got error from bg', responseContent);
          reject(new ErrorWithCode(responseContent.error.code, responseContent.error.message));

          return;
        }

        const { data } = responseContent;

        effectFn(data);
        // @ts-expect-error
        resolve(toProviderResponse(data));
      };
      window.addEventListener(RESPONSE_FROM_BG_EVENT, listener);
    });
  }

  private updateChainId(chainId: HexString) {
    if (this.chainId === chainId) {
      return;
    }

    console.log('oy vey 1', this.chainId, chainId);
    this.chainId = chainId;
    this.callbacks.chainChanged.forEach(listener => listener(chainId));
    this.callbacks.networkChanged.forEach(listener => listener(chainId));
  }

  private handleDisconnect() {
    this.updateAccounts([]);
  }

  private updateAccounts(accounts: HexString[]) {
    if (JSON.stringify(this.accounts.toSorted()) === JSON.stringify(accounts.toSorted())) {
      return;
    }

    console.log('oy vey 2', this.accounts, accounts);
    this.accounts = accounts;
    this.callbacks.accountsChanged.forEach(listener => listener(accounts));
  }

  private handleConnect(args: RequestArgs<'eth_requestAccounts'>) {
    return this.handleRequest(
      args,
      ({ accounts, rpcUrls }) => {
        this.updateAccounts(accounts);
        this.baseProvider = getReadOnlyEvm(rpcUrls);
      },
      ({ accounts }) => accounts,
      undefined
    );
  }

  private handleSign(args: RequestArgs<RpcSignMethod>) {
    return this.handleRequest(
      args,
      noop,
      identity,
      args.method === 'eth_signTypedData_v3' || args.method === 'eth_signTypedData_v4' ? args.params[0] : args.params[1]
    );
  }

  private handleChainChange(args: RequestArgs<'wallet_switchEthereumChain'>) {
    return this.handleRequest(
      args,
      ({ chainId, rpcUrls }) => this.switchChain(chainId, rpcUrls),
      () => null,
      undefined
    );
  }

  private switchChain(chainId: HexString, rpcUrls: string[]) {
    console.log('ebota 1');
    this.baseProvider = getReadOnlyEvm(rpcUrls);
    console.log('ebota 2');
    this.updateChainId(chainId);
  }

  private handleNewPermissionsRequest(args: RequestArgs<'wallet_requestPermissions'>) {
    return this.handleRequest(
      args,
      ({ permissions, rpcUrls }) => {
        // TODO: add handling other permissions than for reading accounts
        const ethAccountsPermission = permissions.find(
          ({ parentCapability }) => parentCapability === evmRpcMethodsNames.eth_accounts
        );

        if (!ethAccountsPermission) {
          return;
        }

        const returnedAccountsCaveat = ethAccountsPermission.caveats.find(
          ({ type }) => type === RETURNED_ACCOUNTS_CAVEAT_NAME
        );

        if (returnedAccountsCaveat) {
          this.updateAccounts(returnedAccountsCaveat.value);
        }
        this.baseProvider = getReadOnlyEvm(rpcUrls);
      },
      ({ permissions }) => permissions,
      undefined
    );
  }

  private handleRevokePermissionsRequest(args: RequestArgs<'wallet_revokePermissions'>) {
    // TODO: add handling other permissions than for reading accounts
    return this.handleRequest(args, this.handleDisconnect, () => null, undefined);
  }

  private handleGetPermissionsRequest(args: RequestArgs<'wallet_getPermissions'>) {
    return this.handleRequest(args, noop, identity, undefined);
  }

  constructor() {
    this.baseProvider = getReadOnlyEvm(ETH_MAINNET_RPC_URL);
    this.accounts = [];
    this.chainId = toHex(ETHEREUM_MAINNET_CHAIN_ID);
    this.callbacks = {
      accountsChanged: [],
      chainChanged: [],
      networkChanged: [],
      connect: [],
      disconnect: [],
      message: []
    };

    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleRequest(
      { method: GET_DEFAULT_WEB3_PARAMS_METHOD_NAME, params: null },
      ({ chainId, rpcUrls, accounts }) => {
        this.baseProvider = getReadOnlyEvm(rpcUrls);
        this.updateChainId(chainId);

        if (accounts.length > 0) {
          this.updateAccounts(accounts);
        }
      },
      identity,
      undefined
    ).catch(error => console.error(error));
    window.addEventListener(DISCONNECT_DAPP_EVENT, this.handleDisconnect);
    window.addEventListener(SWITCH_CHAIN_EVENT, e => {
      const { chainId, rpcUrls } = (e as CustomEvent<{ chainId: number; rpcUrls: string[] }>).detail;

      this.switchChain(toHex(chainId), rpcUrls);
    });
  }

  async enable() {
    return this.handleConnect({ method: evmRpcMethodsNames.eth_requestAccounts });
  }

  private async handlePersonalSignRecoverRequest(args: RequestArgs<'personal_ecRecover'>) {
    const [message, signature] = args.params;

    return (
      await recoverMessageAddress({ message: Buffer.from(message.slice(2), 'hex').toString('utf8'), signature })
    ).toLowerCase();
  }

  // @ts-expect-error
  request: EIP1193RequestFn<KnownMethods> = async args => {
    console.log('oy vey 3', args, this.chainId, this.accounts);
    switch (args.method) {
      case evmRpcMethodsNames.eth_accounts:
        return this.accounts;
      case evmRpcMethodsNames.eth_requestAccounts:
        if (this.accounts.length === 0) {
          return this.handleConnect({ method: evmRpcMethodsNames.eth_requestAccounts });
        } else {
          return this.accounts;
        }
      case evmRpcMethodsNames.wallet_switchEthereumChain:
        return this.handleChainChange(args as RequestArgs<'wallet_switchEthereumChain'>);
      case evmRpcMethodsNames.eth_signTypedData:
      case evmRpcMethodsNames.eth_signTypedData_v1:
      case evmRpcMethodsNames.eth_signTypedData_v3:
      case evmRpcMethodsNames.eth_signTypedData_v4:
      case evmRpcMethodsNames.personal_sign:
        return this.handleSign(args as RequestArgs<RpcSignMethod>);
      case evmRpcMethodsNames.wallet_getPermissions:
        return this.handleGetPermissionsRequest(args as RequestArgs<'wallet_getPermissions'>);
      case evmRpcMethodsNames.wallet_requestPermissions:
        return this.handleNewPermissionsRequest(args as RequestArgs<'wallet_requestPermissions'>);
      case evmRpcMethodsNames.wallet_revokePermissions:
        return this.handleRevokePermissionsRequest(args as RequestArgs<'wallet_revokePermissions'>);
      /* Not going to support eth_sign */
      case 'wallet_grantPermissions':
      case 'eth_sendUserOperation':
      case 'eth_sendTransaction':
      case 'eth_sendRawTransaction':
      case 'eth_signTransaction':
      case 'eth_syncing':
      case 'wallet_addEthereumChain':
      case 'wallet_getCallsStatus':
      case 'wallet_getCapabilities':
      case 'wallet_sendCalls':
      case 'wallet_sendTransaction':
      case 'wallet_showCallsStatus':
      case 'wallet_watchAsset':
      case 'eth_sign':
        throw new ErrorWithCode(METHOD_NOT_SUPPORTED_BY_PROVIDER_ERROR_CODE, 'Method not supported');
      case 'personal_ecRecover':
        return this.handlePersonalSignRecoverRequest(args as RequestArgs<'personal_ecRecover'>);
      default:
        // @ts-expect-error
        return this.baseProvider.request(args);
    }
  };

  on<event extends keyof EIP1193EventMap>(event: event, listener: EIP1193EventMap[event]) {
    // @ts-expect-error
    this.callbacks[event].push(listener);
  }
  removeListener<event extends keyof EIP1193EventMap>(event: event, listener: EIP1193EventMap[event]) {
    this.callbacks[event] = this.callbacks[event].filter(
      currentListener => currentListener !== listener
    ) as EIP1193Callbacks[event];
  }
}
