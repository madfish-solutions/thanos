import type { DerivationType } from '@taquito/ledger-signer';
import type { Estimate } from '@taquito/taquito';
import type { TempleDAppMetadata } from '@temple-wallet/dapp/dist/types';
import type { FeeValues, RpcTransactionRequest, TypedDataDefinition } from 'viem';

import type { DAppsSessionsRecord } from 'app/storage/dapps';
import type { PromisesQueueCounters } from 'lib/utils';
import type { TypedDataV1 } from 'temple/evm/typed-data-v1';
import type { EvmChain } from 'temple/front';
import type { StoredEvmNetwork, StoredTezosNetwork } from 'temple/networks';
import type { TempleChainKind } from 'temple/types';

import type {
  TempleSendPageEventRequest,
  TempleSendPageEventResponse,
  TempleSendTrackEventRequest,
  TempleSendTrackEventResponse
} from './analytics-types';

export { DerivationType };

export interface WalletSpecs {
  name: string;
  createdAt: number;
}

export interface TempleState {
  dAppQueueCounters: PromisesQueueCounters;
  status: TempleStatus;
  accounts: StoredAccount[];
  settings: TempleSettings | null;
}

export const TEZOS_MAINNET_CHAIN_ID = 'NetXdQprcVkpaWU';
export const TEZOS_GHOSTNET_CHAIN_ID = 'NetXnHfVqm9iesp';
export const ETHEREUM_MAINNET_CHAIN_ID = 1;
export const OTHER_COMMON_MAINNET_CHAIN_IDS = {
  polygon: 137,
  bsc: 56,
  avalanche: 43114,
  optimism: 10,
  arbitrum: 42161,
  base: 8453
};
export const ETH_SEPOLIA_CHAIN_ID = 11155111;

export enum TempleTezosChainId {
  Mainnet = TEZOS_MAINNET_CHAIN_ID,
  Ghostnet = TEZOS_GHOSTNET_CHAIN_ID,
  Paris = 'NetXXWAHLEvre9b',
  Dcp = 'NetXooyhiru73tk',
  DcpTest = 'NetXZb3Lz8FsrZx'
}

export enum TempleStatus {
  Idle,
  Locked,
  Ready
}

export type StoredAccount =
  | StoredHDAccount
  | StoredImportedAccount
  | StoredLedgerAccount
  | StoredManagedKTAccount
  | StoredWatchOnlyAccount;

interface StoredLedgerAccount extends StoredAccountBase {
  type: TempleAccountType.Ledger;
  tezosAddress: string;
  derivationPath: string;
}

interface StoredImportedAccount extends StoredAccountBase {
  type: TempleAccountType.Imported;
  chain: TempleChainKind;
  address: string;
}

export interface StoredHDAccount extends StoredAccountBase {
  type: TempleAccountType.HD;
  hdIndex: number;
  tezosAddress: string;
  evmAddress: string;
  walletId: string;
}

interface StoredManagedKTAccount extends StoredAccountBase {
  type: TempleAccountType.ManagedKT;
  tezosAddress: string;
  chainId: string;
  owner: string;
}

interface StoredWatchOnlyAccount extends StoredAccountBase {
  type: TempleAccountType.WatchOnly;
  chain: TempleChainKind;
  address: string;
  /** For contract addresses */
  chainId?: string;
}

export interface StoredAccountBase {
  id: string;
  type: TempleAccountType;
  name: string;
  derivationPath?: string;
  derivationType?: DerivationType;
  hidden?: boolean;
}

export enum TempleAccountType {
  HD,
  Imported,
  Ledger,
  ManagedKT,
  WatchOnly
}

export interface DisplayedGroup {
  id: string;
  name: string;
  accounts: StoredAccount[];
  type: TempleAccountType;
}

export interface TempleSettings {
  customTezosNetworks?: StoredTezosNetwork[];
  customEvmNetworks?: StoredEvmNetwork[];
  contacts?: TempleContact[];
  /** @deprecated */
  customNetworks?: StoredTezosNetwork[];
}

export enum TempleSharedStorageKey {
  /** @deprecated */
  DAppEnabled = 'dappenabled', // rm
  /** @deprecated */
  LockUpEnabled = 'lock_up',
  PasswordAttempts = 'passwordAttempts',
  TimeLock = 'timelock'
}

export interface TempleContact {
  address: string;
  name: string;
  addedAt?: number;
  accountInWallet?: boolean;
}

/**
 * Internal confirmation payloads
 */
interface TempleConfirmationPayloadBase {
  type: string;
  sourcePkh: string;
  networkRpc: string;
}

interface TempleSignConfirmationPayload extends TempleConfirmationPayloadBase {
  type: 'sign';
  bytes: string;
  watermark?: string;
}

interface TempleOpsConfirmationPayload extends TempleConfirmationPayloadBase {
  type: 'operations';
  opParams: any[];
  bytesToSign?: string;
  rawToSign?: any;
  estimates?: Estimate[];
}

export type TempleConfirmationPayload = TempleSignConfirmationPayload | TempleOpsConfirmationPayload;

/**
 * DApp confirmation payloads
 */

export interface DAppMetadata extends TempleDAppMetadata {
  icon?: string;
}

interface TempleDAppPayloadBase {
  type: string;
  origin: string;
  appMeta: DAppMetadata;
  error?: any;
  chainType?: TempleChainKind;
}

interface TempleTezosDAppPayloadBase extends TempleDAppPayloadBase {
  networkRpc: string;
  chainType?: TempleChainKind.Tezos;
}

interface TempleEvmDAppPayloadBase extends TempleDAppPayloadBase {
  chainId: string;
  chainType: TempleChainKind.EVM;
}

interface TempleTezosDAppConnectPayload extends TempleTezosDAppPayloadBase {
  type: 'connect';
}

export interface TempleEvmDAppConnectPayload extends TempleEvmDAppPayloadBase {
  type: 'connect';
}

export interface TempleTezosDAppOperationsPayload extends TempleTezosDAppPayloadBase {
  type: 'confirm_operations';
  sourcePkh: string;
  sourcePublicKey: string;
  opParams: any[];
  bytesToSign?: string;
  rawToSign?: any;
  estimates?: Estimate[];
}

export interface TempleEvmDAppTransactionPayload extends TempleEvmDAppPayloadBase {
  type: 'confirm_operations';
  req: EvmTransactionRequestWithSender;
  estimatedFees?: FeeValues<HexString>;
}

export interface TempleTezosDAppSignPayload extends TempleTezosDAppPayloadBase {
  type: 'sign';
  sourcePkh: string;
  payload: string;
  preview: any;
}

interface TempleEvmDAppSignPayloadBase extends TempleEvmDAppPayloadBase {
  type: string;
  sourcePkh: HexString;
  payload: unknown;
}

export interface TempleEvmDAppSignTypedPayload extends TempleEvmDAppSignPayloadBase {
  type: 'sign_typed';
  payload: TypedDataDefinition | TypedDataV1;
}

export interface TempleEvmDAppPersonalSignPayload extends TempleEvmDAppSignPayloadBase {
  type: 'personal_sign';
  payload: string;
}

export type TempleEvmDAppSignPayload = TempleEvmDAppSignTypedPayload | TempleEvmDAppPersonalSignPayload;

export type TempleTezosDAppPayload =
  | TempleTezosDAppConnectPayload
  | TempleTezosDAppOperationsPayload
  | TempleTezosDAppSignPayload;

export type TempleEvmDAppPayload =
  | TempleEvmDAppConnectPayload
  | TempleEvmDAppTransactionPayload
  | TempleEvmDAppSignPayload;

export type TempleDAppPayload = TempleTezosDAppPayload | TempleEvmDAppPayload;

/**
 * Messages
 */

export enum TempleMessageType {
  // Aknowledge
  Acknowledge = 'TEMPLE_CONNECT_AKNOWLEDGE',
  // Notifications
  StateUpdated = 'TEMPLE_STATE_UPDATED',
  ConfirmationRequested = 'TEMPLE_CONFIRMATION_REQUESTED',
  ConfirmationExpired = 'TEMPLE_CONFIRMATION_EXPIRED',
  SelectedAccountChanged = 'TEMPLE_SELECTED_ACCOUNT_CHANGED',
  TempleEvmDAppsDisconnected = 'TEMPLE_EVM_DAPPS_DISCONNECTED',
  TempleEvmChainSwitched = 'TEMPLE_SWITCH_EVM_CHAIN',
  // Request-Response pairs
  GetStateRequest = 'TEMPLE_GET_STATE_REQUEST',
  GetStateResponse = 'TEMPLE_GET_STATE_RESPONSE',
  NewWalletRequest = 'TEMPLE_NEW_WALLET_REQUEST',
  NewWalletResponse = 'TEMPLE_NEW_WALLET_RESPONSE',
  UnlockRequest = 'TEMPLE_UNLOCK_REQUEST',
  UnlockResponse = 'TEMPLE_UNLOCK_RESPONSE',
  LockRequest = 'TEMPLE_LOCK_REQUEST',
  LockResponse = 'TEMPLE_LOCK_RESPONSE',
  FindFreeHDAccountIndexRequest = 'TEMPLE_FIND_FREE_HD_ACCOUNT_INDEX_REQUEST',
  FindFreeHDAccountIndexResponse = 'TEMPLE_FIND_FREE_HD_ACCOUNT_INDEX_RESPONSE',
  CreateAccountRequest = 'TEMPLE_CREATE_ACCOUNT_REQUEST',
  CreateAccountResponse = 'TEMPLE_CREATE_ACCOUNT_RESPONSE',
  RevealPublicKeyRequest = 'TEMPLE_REVEAL_PUBLIC_KEY_REQUEST',
  RevealPublicKeyResponse = 'TEMPLE_REVEAL_PUBLIC_KEY_RESPONSE',
  RevealPrivateKeyRequest = 'TEMPLE_REVEAL_PRIVATE_KEY_REQUEST',
  RevealPrivateKeyResponse = 'TEMPLE_REVEAL_PRIVATE_KEY_RESPONSE',
  RevealMnemonicRequest = 'TEMPLE_REVEAL_MNEMONIC_REQUEST',
  RevealMnemonicResponse = 'TEMPLE_REVEAL_MNEMONIC_RESPONSE',
  GenerateSyncPayloadRequest = 'TEMPLE_GENERATE_SYNC_PAYLOAD_REQUEST',
  GenerateSyncPayloadResponse = 'TEMPLE_GENERATE_SYNC_PAYLOAD_RESPONSE',
  RemoveAccountRequest = 'TEMPLE_REMOVE_ACCOUNT_REQUEST',
  RemoveAccountResponse = 'TEMPLE_REMOVE_ACCOUNT_RESPONSE',
  EditAccountRequest = 'TEMPLE_EDIT_ACCOUNT_REQUEST',
  EditAccountResponse = 'TEMPLE_EDIT_ACCOUNT_RESPONSE',
  SetAccountHiddenRequest = 'TEMPLE_SET_ACCOUNT_HIDDEN_REQUEST',
  SetAccountHiddenResponse = 'TEMPLE_SET_ACCOUNT_HIDDEN_RESPONSE',
  ImportAccountRequest = 'TEMPLE_IMPORT_ACCOUNT_REQUEST',
  ImportAccountResponse = 'TEMPLE_IMPORT_ACCOUNT_RESPONSE',
  ImportMnemonicAccountRequest = 'TEMPLE_IMPORT_MNEMONIC_ACCOUNT_REQUEST',
  ImportMnemonicAccountResponse = 'TEMPLE_IMPORT_MNEMONIC_ACCOUNT_RESPONSE',
  ImportWatchOnlyAccountRequest = 'TEMPLE_IMPORT_WATCH_ONLY_ACCOUNT_REQUEST',
  ImportWatchOnlyAccountResponse = 'TEMPLE_IMPORT_WATCH_ONLY_ACCOUNT_RESPONSE',
  CreateLedgerAccountRequest = 'TEMPLE_CREATE_LEDGER_ACCOUNT_REQUEST',
  CreateLedgerAccountResponse = 'TEMPLE_CREATE_LEDGER_ACCOUNT_RESPONSE',
  UpdateSettingsRequest = 'TEMPLE_UPDATE_SETTINGS_REQUEST',
  UpdateSettingsResponse = 'TEMPLE_UPDATE_SETTINGS_RESPONSE',
  RemoveHdWalletRequest = 'TEMPLE_REMOVE_HD_WALLET_REQUEST',
  RemoveHdWalletResponse = 'TEMPLE_REMOVE_HD_WALLET_RESPONSE',
  RemoveAccountsByTypeRequest = 'TEMPLE_REMOVE_ACCOUNTS_BY_TYPE_REQUEST',
  RemoveAccountsByTypeResponse = 'TEMPLE_REMOVE_ACCOUNTS_BY_TYPE_RESPONSE',
  CreateOrImportWalletRequest = 'TEMPLE_CREATE_OR_IMPORT_WALLET_REQUEST',
  CreateOrImportWalletResponse = 'TEMPLE_CREATE_OR_IMPORT_WALLET_RESPONSE',
  OperationsRequest = 'TEMPLE_OPERATIONS_REQUEST',
  OperationsResponse = 'TEMPLE_OPERATIONS_RESPONSE',
  SignRequest = 'TEMPLE_SIGN_REQUEST',
  SignResponse = 'TEMPLE_SIGN_RESPONSE',
  ConfirmationRequest = 'TEMPLE_CONFIRMATION_REQUEST',
  ConfirmationResponse = 'TEMPLE_CONFIRMATION_RESPONSE',
  PageRequest = 'TEMPLE_PAGE_REQUEST',
  PageResponse = 'TEMPLE_PAGE_RESPONSE',
  DAppGetPayloadRequest = 'TEMPLE_DAPP_GET_PAYLOAD_REQUEST',
  DAppGetPayloadResponse = 'TEMPLE_DAPP_GET_PAYLOAD_RESPONSE',
  DAppPermConfirmationRequest = 'TEMPLE_DAPP_PERM_CONFIRMATION_REQUEST',
  DAppPermConfirmationResponse = 'TEMPLE_DAPP_PERM_CONFIRMATION_RESPONSE',
  DAppTezosOpsConfirmationRequest = 'TEMPLE_DAPP_TEZOS_OPS_CONFIRMATION_REQUEST',
  DAppEvmOpsConfirmationRequest = 'TEMPLE_DAPP_EVM_OPS_CONFIRMATION_REQUEST',
  DAppOpsConfirmationResponse = 'TEMPLE_DAPP_OPS_CONFIRMATION_RESPONSE',
  DAppSignConfirmationRequest = 'TEMPLE_DAPP_SIGN_CONFIRMATION_REQUEST',
  DAppSignConfirmationResponse = 'TEMPLE_DAPP_SIGN_CONFIRMATION_RESPONSE',
  DAppRemoveSessionRequest = 'TEMPLE_DAPP_REMOVE_SESSION_REQUEST',
  DAppRemoveSessionResponse = 'TEMPLE_DAPP_REMOVE_SESSION_RESPONSE',
  DAppSwitchEvmChainRequest = 'TEMPLE_DAPP_SWITCH_EVM_CHAIN_REQUEST',
  DAppSwitchEvmChainResponse = 'TEMPLE_DAPP_SWITCH_EVM_CHAIN_RESPONSE',
  SendTrackEventRequest = 'SEND_TRACK_EVENT_REQUEST',
  SendTrackEventResponse = 'SEND_TRACK_EVENT_RESPONSE',
  SendPageEventRequest = 'SEND_PAGE_EVENT_REQUEST',
  SendPageEventResponse = 'SEND_PAGE_EVENT_RESPONSE',
  SendEvmTransactionRequest = 'SEND_EVM_TRANSACTION_REQUEST',
  SendEvmTransactionResponse = 'SEND_EVM_TRANSACTION_RESPONSE',
  ResetExtensionRequest = 'RESET_EXTENSION_REQUEST',
  ResetExtensionResponse = 'RESET_EXTENSION_RESPONSE'
}

export type TempleNotification =
  | TempleStateUpdated
  | TempleConfirmationRequested
  | TempleConfirmationExpired
  | TempleSelectedAccountChanged
  | TempleEvmDAppsDisconnected
  | TempleEvmChainSwitched;

export type TempleRequest =
  | TempleAcknowledgeRequest
  | TempleGetStateRequest
  | TempleNewWalletRequest
  | TempleUnlockRequest
  | TempleLockRequest
  | TempleFreeHDAccountIndexRequest
  | TempleCreateAccountRequest
  | TempleRevealPublicKeyRequest
  | TempleRevealPrivateKeyRequest
  | TempleRevealMnemonicRequest
  | TempleGenerateSyncPayloadRequest
  | TempleSetAccountHiddenRequest
  | TempleEditAccountRequest
  | TempleImportAccountRequest
  | TempleImportMnemonicAccountRequest
  | TempleImportWatchOnlyAccountRequest
  | TempleCreateLedgerAccountRequest
  | TempleOperationsRequest
  | TempleSignRequest
  | TempleConfirmationRequest
  | TempleRemoveAccountRequest
  | TempleRemoveHdWalletRequest
  | TempleRemoveAccountsByTypeRequest
  | TempleCreateOrImportWalletRequest
  | TemplePageRequest
  | TempleDAppGetPayloadRequest
  | TempleDAppPermConfirmationRequest
  | TempleTezosDAppOpsConfirmationRequest
  | TempleEvmDAppOpsConfirmationRequest
  | TempleDAppSignConfirmationRequest
  | TempleUpdateSettingsRequest
  | TempleRemoveDAppSessionRequest
  | TempleSwitchDAppEvmChainRequest
  | TempleSendTrackEventRequest
  | TempleSendPageEventRequest
  | TempleSendEvmTransactionRequest
  | TempleResetExtensionRequest;

export type TempleResponse =
  | TempleGetStateResponse
  | TempleAcknowledgeResponse
  | TempleNewWalletResponse
  | TempleUnlockResponse
  | TempleLockResponse
  | TempleFreeHDAccountIndexResponse
  | TempleCreateAccountResponse
  | TempleRevealPublicKeyResponse
  | TempleRevealPrivateKeyResponse
  | TempleRevealMnemonicResponse
  | TempleGenerateSyncPayloadResponse
  | TempleSetAccountHiddenResponse
  | TempleEditAccountResponse
  | TempleImportAccountResponse
  | TempleImportMnemonicAccountResponse
  | TempleImportWatchOnlyAccountResponse
  | TempleCreateLedgerAccountResponse
  | TempleOperationsResponse
  | TempleSignResponse
  | TempleConfirmationResponse
  | TempleRemoveAccountResponse
  | TempleRemoveHdWalletResponse
  | TempleRemoveAccountsByTypeResponse
  | TempleCreateOrImportWalletResponse
  | TemplePageResponse
  | TempleDAppGetPayloadResponse
  | TempleDAppPermConfirmationResponse
  | TempleDAppOpsConfirmationResponse
  | TempleDAppSignConfirmationResponse
  | TempleUpdateSettingsResponse
  | TempleRemoveDAppSessionResponse
  | TempleSwitchDAppEvmChainResponse
  | TempleSendTrackEventResponse
  | TempleSendPageEventResponse
  | TempleSendEvmTransactionResponse
  | TempleResetExtensionResponse;

export interface TempleMessageBase {
  type: TempleMessageType;
}

interface TempleStateUpdated extends TempleMessageBase {
  type: TempleMessageType.StateUpdated;
}

interface TempleConfirmationRequested extends TempleMessageBase {
  type: TempleMessageType.ConfirmationRequested;
  id: string;
  payload: TempleConfirmationPayload;
  error?: any;
}

interface TempleConfirmationExpired extends TempleMessageBase {
  type: TempleMessageType.ConfirmationExpired;
  id: string;
}

interface TempleSelectedAccountChanged extends TempleMessageBase {
  type: TempleMessageType.SelectedAccountChanged;
  accountPublicKeyHash: string;
}

interface TempleEvmDAppsDisconnected extends TempleMessageBase {
  type: TempleMessageType.TempleEvmDAppsDisconnected;
  origins: string[];
}

interface TempleEvmChainSwitched extends TempleMessageBase {
  type: TempleMessageType.TempleEvmChainSwitched;
  origin: string;
  chainId: number;
}

interface TempleGetStateRequest extends TempleMessageBase {
  type: TempleMessageType.GetStateRequest;
}

interface TempleGetStateResponse extends TempleMessageBase {
  type: TempleMessageType.GetStateResponse;
  state: TempleState;
}

interface TempleAcknowledgeResponse extends TempleMessageBase {
  type: TempleMessageType.Acknowledge;
  payload: string;
  encrypted?: boolean;
}

interface TempleNewWalletRequest extends TempleMessageBase {
  type: TempleMessageType.NewWalletRequest;
  password: string;
  mnemonic?: string;
}

interface TempleNewWalletResponse extends TempleMessageBase {
  type: TempleMessageType.NewWalletResponse;
  accountPkh: string;
}

interface TempleUnlockRequest extends TempleMessageBase {
  type: TempleMessageType.UnlockRequest;
  password: string;
}

interface TempleUnlockResponse extends TempleMessageBase {
  type: TempleMessageType.UnlockResponse;
}

interface TempleLockRequest extends TempleMessageBase {
  type: TempleMessageType.LockRequest;
}

interface TempleLockResponse extends TempleMessageBase {
  type: TempleMessageType.LockResponse;
}

interface TempleFreeHDAccountIndexRequest extends TempleMessageBase {
  type: TempleMessageType.FindFreeHDAccountIndexRequest;
  walletId: string;
}

interface TempleFreeHDAccountIndexResponse extends TempleMessageBase {
  type: TempleMessageType.FindFreeHDAccountIndexResponse;
  hdIndex: number;
  firstSkippedAccount: StoredAccount | undefined;
}

interface TempleCreateAccountRequest extends TempleMessageBase {
  type: TempleMessageType.CreateAccountRequest;
  walletId: string;
  name?: string;
  hdIndex?: number;
}

interface TempleCreateAccountResponse extends TempleMessageBase {
  type: TempleMessageType.CreateAccountResponse;
}

interface TempleRevealPublicKeyRequest extends TempleMessageBase {
  type: TempleMessageType.RevealPublicKeyRequest;
  accountAddress: string;
}

interface TempleRevealPublicKeyResponse extends TempleMessageBase {
  type: TempleMessageType.RevealPublicKeyResponse;
  publicKey: string;
}

interface TempleRevealPrivateKeyRequest extends TempleMessageBase {
  type: TempleMessageType.RevealPrivateKeyRequest;
  address: string;
  password: string;
}

interface TempleRevealPrivateKeyResponse extends TempleMessageBase {
  type: TempleMessageType.RevealPrivateKeyResponse;
  privateKey: string;
}

interface TempleRevealMnemonicRequest extends TempleMessageBase {
  type: TempleMessageType.RevealMnemonicRequest;
  walletId: string;
  password: string;
}

interface TempleRevealMnemonicResponse extends TempleMessageBase {
  type: TempleMessageType.RevealMnemonicResponse;
  mnemonic: string;
}

interface TempleGenerateSyncPayloadRequest extends TempleMessageBase {
  type: TempleMessageType.GenerateSyncPayloadRequest;
  password: string;
  walletId: string;
}

interface TempleGenerateSyncPayloadResponse extends TempleMessageBase {
  type: TempleMessageType.GenerateSyncPayloadResponse;
  payload: string;
}

interface TempleRemoveAccountRequest extends TempleMessageBase {
  type: TempleMessageType.RemoveAccountRequest;
  id: string;
  password: string;
}

interface TempleRemoveAccountResponse extends TempleMessageBase {
  type: TempleMessageType.RemoveAccountResponse;
}

interface TempleEditAccountRequest extends TempleMessageBase {
  type: TempleMessageType.EditAccountRequest;
  id: string;
  name: string;
}

interface TempleEditAccountResponse extends TempleMessageBase {
  type: TempleMessageType.EditAccountResponse;
}

interface TempleSetAccountHiddenRequest extends TempleMessageBase {
  type: TempleMessageType.SetAccountHiddenRequest;
  id: string;
  value: boolean;
}

interface TempleSetAccountHiddenResponse extends TempleMessageBase {
  type: TempleMessageType.SetAccountHiddenResponse;
}

interface TempleImportAccountRequest extends TempleMessageBase {
  type: TempleMessageType.ImportAccountRequest;
  chain: TempleChainKind;
  privateKey: string;
  encPassword?: string;
}

interface TempleImportAccountResponse extends TempleMessageBase {
  type: TempleMessageType.ImportAccountResponse;
}

interface TempleImportMnemonicAccountRequest extends TempleMessageBase {
  type: TempleMessageType.ImportMnemonicAccountRequest;
  mnemonic: string;
  password?: string;
  derivationPath?: string;
}

interface TempleImportMnemonicAccountResponse extends TempleMessageBase {
  type: TempleMessageType.ImportMnemonicAccountResponse;
}

interface TempleImportWatchOnlyAccountRequest extends TempleMessageBase {
  type: TempleMessageType.ImportWatchOnlyAccountRequest;
  address: string;
  chain: TempleChainKind;
  chainId?: string;
}

interface TempleImportWatchOnlyAccountResponse extends TempleMessageBase {
  type: TempleMessageType.ImportWatchOnlyAccountResponse;
}

interface TempleCreateLedgerAccountRequest extends TempleMessageBase {
  type: TempleMessageType.CreateLedgerAccountRequest;
  name: string;
  derivationPath?: string;
  derivationType?: DerivationType;
}

interface TempleCreateLedgerAccountResponse extends TempleMessageBase {
  type: TempleMessageType.CreateLedgerAccountResponse;
}

interface TempleUpdateSettingsRequest extends TempleMessageBase {
  type: TempleMessageType.UpdateSettingsRequest;
  settings: Partial<TempleSettings>;
}

interface TempleUpdateSettingsResponse extends TempleMessageBase {
  type: TempleMessageType.UpdateSettingsResponse;
}

interface TempleRemoveHdWalletRequest extends TempleMessageBase {
  type: TempleMessageType.RemoveHdWalletRequest;
  id: string;
  password: string;
}

interface TempleRemoveHdWalletResponse extends TempleMessageBase {
  type: TempleMessageType.RemoveHdWalletResponse;
}

interface TempleRemoveAccountsByTypeRequest extends TempleMessageBase {
  type: TempleMessageType.RemoveAccountsByTypeRequest;
  accountsType: Exclude<TempleAccountType, TempleAccountType.HD>;
  password: string;
}

interface TempleRemoveAccountsByTypeResponse extends TempleMessageBase {
  type: TempleMessageType.RemoveAccountsByTypeResponse;
}

interface TempleCreateOrImportWalletRequest extends TempleMessageBase {
  type: TempleMessageType.CreateOrImportWalletRequest;
  mnemonic?: string;
}

interface TempleCreateOrImportWalletResponse extends TempleMessageBase {
  type: TempleMessageType.CreateOrImportWalletResponse;
}

interface TempleOperationsRequest extends TempleMessageBase {
  type: TempleMessageType.OperationsRequest;
  id: string;
  sourcePkh: string;
  networkRpc: string;
  opParams: any[];
  /** send operations without old confirmation page */
  straightaway?: boolean;
}

interface TempleOperationsResponse extends TempleMessageBase {
  type: TempleMessageType.OperationsResponse;
  opHash: string;
}

interface TempleSignRequest extends TempleMessageBase {
  type: TempleMessageType.SignRequest;
  id: string;
  sourcePkh: string;
  networkRpc: string;
  bytes: string;
  watermark?: string;
}

interface TempleSignResponse extends TempleMessageBase {
  type: TempleMessageType.SignResponse;
  result: any;
}

interface TempleConfirmationRequest extends TempleMessageBase {
  type: TempleMessageType.ConfirmationRequest;
  id: string;
  confirmed: boolean;
  modifiedTotalFee?: number;
  modifiedStorageLimit?: number;
}

interface TempleConfirmationResponse extends TempleMessageBase {
  type: TempleMessageType.ConfirmationResponse;
}

interface TempleSendEvmTransactionRequest extends TempleMessageBase {
  type: TempleMessageType.SendEvmTransactionRequest;
  accountPkh: HexString;
  network: EvmChain;
  txParams: RpcTransactionRequest;
}

interface TempleSendEvmTransactionResponse extends TempleMessageBase {
  type: TempleMessageType.SendEvmTransactionResponse;
  txHash: HexString;
}

interface TemplePageRequestBase extends TempleMessageBase {
  type: TempleMessageType.PageRequest;
  origin: string;
  payload: any;
  iconUrl?: string;
  chainType?: TempleChainKind;
}

interface TempleTezosPageRequest extends TemplePageRequestBase {
  chainType?: TempleChainKind.Tezos;
  beacon?: boolean;
  encrypted?: boolean;
}

interface TempleEvmPageRequest extends TemplePageRequestBase {
  chainType: TempleChainKind.EVM;
  chainId: string;
}

type TemplePageRequest = TempleTezosPageRequest | TempleEvmPageRequest;

interface TempleAcknowledgeRequest extends TempleMessageBase {
  type: TempleMessageType.Acknowledge;
  origin: string;
  payload: any;
  beacon?: boolean;
  encrypted?: boolean;
}

interface TemplePageResponse extends TempleMessageBase {
  type: TempleMessageType.PageResponse;
  payload: any;
  encrypted?: boolean;
}

interface TempleDAppGetPayloadRequest extends TempleMessageBase {
  type: TempleMessageType.DAppGetPayloadRequest;
  id: string;
}

interface TempleDAppGetPayloadResponse extends TempleMessageBase {
  type: TempleMessageType.DAppGetPayloadResponse;
  payload: TempleDAppPayload;
}

interface TempleDAppPermConfirmationRequest extends TempleMessageBase {
  type: TempleMessageType.DAppPermConfirmationRequest;
  id: string;
  confirmed: boolean;
  accountPublicKey: string;
  accountPublicKeyHash: string;
}

interface TempleDAppPermConfirmationResponse extends TempleMessageBase {
  type: TempleMessageType.DAppPermConfirmationResponse;
}

interface TempleDAppOpsConfirmationRequestBase extends TempleMessageBase {
  type: TempleMessageType.DAppTezosOpsConfirmationRequest | TempleMessageType.DAppEvmOpsConfirmationRequest;
  id: string;
  confirmed: boolean;
}

interface TempleTezosDAppOpsConfirmationRequest extends TempleDAppOpsConfirmationRequestBase {
  type: TempleMessageType.DAppTezosOpsConfirmationRequest;
  modifiedTotalFee?: number;
  modifiedStorageLimit?: number;
}

interface TempleEvmDAppOpsConfirmationRequest extends TempleDAppOpsConfirmationRequestBase {
  type: TempleMessageType.DAppEvmOpsConfirmationRequest;
  modifiedReq: EvmTransactionRequestWithSender;
}

interface TempleDAppOpsConfirmationResponse extends TempleMessageBase {
  type: TempleMessageType.DAppOpsConfirmationResponse;
}

interface TempleDAppSignConfirmationRequest extends TempleMessageBase {
  type: TempleMessageType.DAppSignConfirmationRequest;
  id: string;
  confirmed: boolean;
}

interface TempleDAppSignConfirmationResponse extends TempleMessageBase {
  type: TempleMessageType.DAppSignConfirmationResponse;
}

interface TempleRemoveDAppSessionRequest extends TempleMessageBase {
  type: TempleMessageType.DAppRemoveSessionRequest;
  origins: string[];
}

interface TempleRemoveDAppSessionResponse extends TempleMessageBase {
  type: TempleMessageType.DAppRemoveSessionResponse;
  sessions: {
    [k in TempleChainKind]: DAppsSessionsRecord<k>;
  };
}

interface TempleSwitchDAppEvmChainRequest extends TempleMessageBase {
  type: TempleMessageType.DAppSwitchEvmChainRequest;
  origin: string;
  chainId: number;
}

interface TempleSwitchDAppEvmChainResponse extends TempleMessageBase {
  type: TempleMessageType.DAppSwitchEvmChainResponse;
}

interface TempleResetExtensionRequest extends TempleMessageBase {
  type: TempleMessageType.ResetExtensionRequest;
  password: string;
}

interface TempleResetExtensionResponse extends TempleMessageBase {
  type: TempleMessageType.ResetExtensionResponse;
}

export type EvmTransactionRequestWithSender = RpcTransactionRequest & { from: HexString };

export type OperationsPreview = any[] | { branch: string; contents: any[] };
