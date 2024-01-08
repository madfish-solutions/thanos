import type { DerivationType } from '@taquito/ledger-signer';
import type { Estimate } from '@taquito/taquito';
import type { TempleDAppMetadata, TempleDAppNetwork } from '@temple-wallet/dapp/dist/types';

import type { TID } from 'lib/i18n/types';

import {
  TempleSendPageEventRequest,
  TempleSendPageEventResponse,
  TempleSendTrackEventRequest,
  TempleSendTrackEventResponse
} from './analytics-types';

type NonEmptyArray<T> = [T, ...T[]];

export { DerivationType };

export interface ReadyTempleState extends TempleState {
  status: TempleStatus.Ready;
  accounts: NonEmptyArray<TempleAccount>;
  networks: NonEmptyArray<TempleNetwork>;
  settings: TempleSettings;
}

export interface TempleDAppSession {
  network: TempleDAppNetwork;
  appMeta: TempleDAppMetadata;
  pkh: string;
  publicKey: string;
}

export interface TempleState {
  status: TempleStatus;
  accounts: TempleAccount[];
  networks: TempleNetwork[];
  settings: TempleSettings | null;
}

export enum TempleChainId {
  Mainnet = 'NetXdQprcVkpaWU',
  Ghostnet = 'NetXnHfVqm9iesp',
  Monday = 'NetXaqtQ8b5nihx',
  Mumbai = 'NetXgbcrNtXD2yA',
  Nairobi = 'NetXyuzvDo2Ugzb',
  Daily = 'NetXxkAx4woPLyu',
  Dcp = 'NetXooyhiru73tk',
  DcpTest = 'NetXX7Tz1sK8JTa'
}

export function isKnownChainId(chainId: string): chainId is TempleChainId {
  return Object.values(TempleChainId).includes(chainId as TempleChainId);
}

export enum TempleStatus {
  Idle,
  Locked,
  Ready
}

export type TempleAccount =
  | TempleHDAccount
  | TempleImportedAccount
  | TempleLedgerAccount
  | TempleManagedKTAccount
  | TempleWatchOnlyAccount;

interface TempleLedgerAccount extends TempleAccountBase {
  type: TempleAccountType.Ledger;
  derivationPath: string;
}

interface TempleImportedAccount extends TempleAccountBase {
  type: TempleAccountType.Imported;
}

interface TempleHDAccount extends TempleAccountBase {
  type: TempleAccountType.HD;
  hdIndex: number;
}

interface TempleManagedKTAccount extends TempleAccountBase {
  type: TempleAccountType.ManagedKT;
  chainId: string;
  owner: string;
}

interface TempleWatchOnlyAccount extends TempleAccountBase {
  type: TempleAccountType.WatchOnly;
  chainId?: string;
}

interface TempleAccountBase {
  type: TempleAccountType;
  name: string;
  publicKeyHash: string;
  hdIndex?: number;
  derivationPath?: string;
  derivationType?: DerivationType;
}

export enum TempleAccountType {
  HD,
  Imported,
  Ledger,
  ManagedKT,
  WatchOnly
}

interface TempleNetworkBase {
  id: string;
  name?: string;
  nameI18nKey?: TID;
  description: string;
  descriptionI18nKey?: string;
  type: TempleNetworkType;
  rpcBaseURL: string;
  color: string;
  disabled: boolean;
  hidden?: boolean;
}

export type TempleNetwork = TempleNetworkBase &
  (
    | {
        nameI18nKey: TID;
      }
    | {
        name: string;
      }
  );

export type TempleNetworkType = 'main' | 'test' | 'dcp';

export interface TempleSettings {
  customNetworks?: TempleNetwork[];
  contacts?: TempleContact[];
}

export enum TempleSharedStorageKey {
  DAppEnabled = 'dappenabled',
  LockUpEnabled = 'lock_up',
  PasswordAttempts = 'passwordAttempts',
  TimeLock = 'timelock'
}

export type TempleDAppSessions = Record<string, TempleDAppSession>;

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
}

interface TempleSignConfirmationPayload extends TempleConfirmationPayloadBase {
  type: 'sign';
  bytes: string;
  watermark?: string;
}

interface TempleOpsConfirmationPayload extends TempleConfirmationPayloadBase {
  type: 'operations';
  networkRpc: string;
  opParams: any[];
  bytesToSign?: string;
  rawToSign?: any;
  estimates?: Estimate[];
}

export type TempleConfirmationPayload = TempleSignConfirmationPayload | TempleOpsConfirmationPayload;

/**
 * DApp confirmation payloads
 */

export type DappMetadata = TempleDAppMetadata & {
  icon?: string;
};

interface TempleDAppPayloadBase {
  type: string;
  origin: string;
  networkRpc: string;
  appMeta: DappMetadata;
  error?: any;
}

interface TempleDAppConnectPayload extends TempleDAppPayloadBase {
  type: 'connect';
}

export interface TempleDAppOperationsPayload extends TempleDAppPayloadBase {
  type: 'confirm_operations';
  sourcePkh: string;
  sourcePublicKey: string;
  opParams: any[];
  bytesToSign?: string;
  rawToSign?: any;
  estimates?: Estimate[];
}

export interface TempleDAppSignPayload extends TempleDAppPayloadBase {
  type: 'sign';
  sourcePkh: string;
  payload: string;
  preview: any;
}

export type TempleDAppPayload = TempleDAppConnectPayload | TempleDAppOperationsPayload | TempleDAppSignPayload;

/**
 * Messages
 */

export enum TempleMessageType {
  // Acknowledge
  Acknowledge = 'TEMPLE_CONNECT_AKNOWLEDGE',
  GoogleAuthTokenReceiveAcknowledge = 'GOOGLE_AUTH_TOKEN_RECEIVE_ACKNOWLEDGE',
  // Notifications
  StateUpdated = 'TEMPLE_STATE_UPDATED',
  ConfirmationRequested = 'TEMPLE_CONFIRMATION_REQUESTED',
  ConfirmationExpired = 'TEMPLE_CONFIRMATION_EXPIRED',
  SelectedAccountChanged = 'TEMPLE_SELECTED_ACCOUNT_CHANGED',
  GoogleAuthTokenReceived = 'GOOGLE_AUTH_TOKEN_RECEIVED',
  // Request-Response pairs
  GetStateRequest = 'TEMPLE_GET_STATE_REQUEST',
  GetStateResponse = 'TEMPLE_GET_STATE_RESPONSE',
  NewWalletRequest = 'TEMPLE_NEW_WALLET_REQUEST',
  NewWalletResponse = 'TEMPLE_NEW_WALLET_RESPONSE',
  UnlockRequest = 'TEMPLE_UNLOCK_REQUEST',
  UnlockResponse = 'TEMPLE_UNLOCK_RESPONSE',
  LockRequest = 'TEMPLE_LOCK_REQUEST',
  LockResponse = 'TEMPLE_LOCK_RESPONSE',
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
  ImportAccountRequest = 'TEMPLE_IMPORT_ACCOUNT_REQUEST',
  ImportAccountResponse = 'TEMPLE_IMPORT_ACCOUNT_RESPONSE',
  ImportMnemonicAccountRequest = 'TEMPLE_IMPORT_MNEMONIC_ACCOUNT_REQUEST',
  ImportMnemonicAccountResponse = 'TEMPLE_IMPORT_MNEMONIC_ACCOUNT_RESPONSE',
  ImportFundraiserAccountRequest = 'TEMPLE_IMPORT_FUNDRAISER_ACCOUNT_REQUEST',
  ImportFundraiserAccountResponse = 'TEMPLE_IMPORT_FUNDRAISER_ACCOUNT_RESPONSE',
  ImportManagedKTAccountRequest = 'TEMPLE_IMPORT_MANAGED_KT_ACCOUNT_REQUEST',
  ImportManagedKTAccountResponse = 'TEMPLE_IMPORT_MANAGED_KT_ACCOUNT_RESPONSE',
  ImportWatchOnlyAccountRequest = 'TEMPLE_IMPORT_WATCH_ONLY_ACCOUNT_REQUEST',
  ImportWatchOnlyAccountResponse = 'TEMPLE_IMPORT_WATCH_ONLY_ACCOUNT_RESPONSE',
  CreateLedgerAccountRequest = 'TEMPLE_CREATE_LEDGER_ACCOUNT_REQUEST',
  CreateLedgerAccountResponse = 'TEMPLE_CREATE_LEDGER_ACCOUNT_RESPONSE',
  UpdateSettingsRequest = 'TEMPLE_UPDATE_SETTINGS_REQUEST',
  UpdateSettingsResponse = 'TEMPLE_UPDATE_SETTINGS_RESPONSE',
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
  DAppOpsConfirmationRequest = 'TEMPLE_DAPP_OPS_CONFIRMATION_REQUEST',
  DAppOpsConfirmationResponse = 'TEMPLE_DAPP_OPS_CONFIRMATION_RESPONSE',
  DAppSignConfirmationRequest = 'TEMPLE_DAPP_SIGN_CONFIRMATION_REQUEST',
  DAppSignConfirmationResponse = 'TEMPLE_DAPP_SIGN_CONFIRMATION_RESPONSE',
  DAppGetAllSessionsRequest = 'TEMPLE_DAPP_GET_ALL_SESSIONS_REQUEST',
  DAppGetAllSessionsResponse = 'TEMPLE_DAPP_GET_ALL_SESSIONS_RESPONSE',
  DAppRemoveSessionRequest = 'TEMPLE_DAPP_REMOVE_SESSION_REQUEST',
  DAppRemoveSessionResponse = 'TEMPLE_DAPP_REMOVE_SESSION_RESPONSE',
  SendTrackEventRequest = 'SEND_TRACK_EVENT_REQUEST',
  SendTrackEventResponse = 'SEND_TRACK_EVENT_RESPONSE',
  SendPageEventRequest = 'SEND_PAGE_EVENT_REQUEST',
  SendPageEventResponse = 'SEND_PAGE_EVENT_RESPONSE',
  GoogleAuthTokenReceivedRequest = 'GOOGLE_AUTH_TOKEN_RECEIVED_REQUEST'
}

export type TempleNotification =
  | TempleStateUpdated
  | TempleConfirmationRequested
  | TempleConfirmationExpired
  | TempleSelectedAccountChanged
  | TempleGoogleAuthTokenReceived;

export type TempleRequest =
  | TempleAcknowledgeRequest
  | TempleGetStateRequest
  | TempleNewWalletRequest
  | TempleUnlockRequest
  | TempleLockRequest
  | TempleCreateAccountRequest
  | TempleRevealPublicKeyRequest
  | TempleRevealPrivateKeyRequest
  | TempleRevealMnemonicRequest
  | TempleGenerateSyncPayloadRequest
  | TempleEditAccountRequest
  | TempleImportAccountRequest
  | TempleImportMnemonicAccountRequest
  | TempleImportFundraiserAccountRequest
  | TempleImportManagedKTAccountRequest
  | TempleImportWatchOnlyAccountRequest
  | TempleCreateLedgerAccountRequest
  | TempleOperationsRequest
  | TempleSignRequest
  | TempleConfirmationRequest
  | TempleRemoveAccountRequest
  | TemplePageRequest
  | TempleDAppGetPayloadRequest
  | TempleDAppPermConfirmationRequest
  | TempleDAppOpsConfirmationRequest
  | TempleDAppSignConfirmationRequest
  | TempleUpdateSettingsRequest
  | TempleGetAllDAppSessionsRequest
  | TempleRemoveDAppSessionRequest
  | TempleSendTrackEventRequest
  | TempleSendPageEventRequest
  | TempleGoogleAuthTokenReceivedRequest;

export type TempleResponse =
  | TempleGetStateResponse
  | TempleAcknowledgeResponse
  | TempleGoogleAuthTokenReceiveAcknowledgeResponse
  | TempleNewWalletResponse
  | TempleUnlockResponse
  | TempleLockResponse
  | TempleCreateAccountResponse
  | TempleRevealPublicKeyResponse
  | TempleRevealPrivateKeyResponse
  | TempleRevealMnemonicResponse
  | TempleGenerateSyncPayloadResponse
  | TempleEditAccountResponse
  | TempleImportAccountResponse
  | TempleImportMnemonicAccountResponse
  | TempleImportFundraiserAccountResponse
  | TempleImportManagedKTAccountResponse
  | TempleImportWatchOnlyAccountResponse
  | TempleCreateLedgerAccountResponse
  | TempleOperationsResponse
  | TempleSignResponse
  | TempleConfirmationResponse
  | TempleRemoveAccountResponse
  | TemplePageResponse
  | TempleDAppGetPayloadResponse
  | TempleDAppPermConfirmationResponse
  | TempleDAppOpsConfirmationResponse
  | TempleDAppSignConfirmationResponse
  | TempleUpdateSettingsResponse
  | TempleGetAllDAppSessionsResponse
  | TempleRemoveDAppSessionResponse
  | TempleSendTrackEventResponse
  | TempleSendPageEventResponse;

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

interface TempleGoogleAuthTokenReceived extends TempleMessageBase {
  type: TempleMessageType.GoogleAuthTokenReceived;
  authToken: string;
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

interface TempleGoogleAuthTokenReceiveAcknowledgeResponse extends TempleMessageBase {
  type: TempleMessageType.GoogleAuthTokenReceiveAcknowledge;
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

interface TempleCreateAccountRequest extends TempleMessageBase {
  type: TempleMessageType.CreateAccountRequest;
  name?: string;
}

interface TempleCreateAccountResponse extends TempleMessageBase {
  type: TempleMessageType.CreateAccountResponse;
}

interface TempleRevealPublicKeyRequest extends TempleMessageBase {
  type: TempleMessageType.RevealPublicKeyRequest;
  accountPublicKeyHash: string;
}

interface TempleRevealPublicKeyResponse extends TempleMessageBase {
  type: TempleMessageType.RevealPublicKeyResponse;
  publicKey: string;
}

interface TempleRevealPrivateKeyRequest extends TempleMessageBase {
  type: TempleMessageType.RevealPrivateKeyRequest;
  accountPublicKeyHash: string;
  password: string;
}

interface TempleRevealPrivateKeyResponse extends TempleMessageBase {
  type: TempleMessageType.RevealPrivateKeyResponse;
  privateKey: string;
}

interface TempleRevealMnemonicRequest extends TempleMessageBase {
  type: TempleMessageType.RevealMnemonicRequest;
  password: string;
}

interface TempleRevealMnemonicResponse extends TempleMessageBase {
  type: TempleMessageType.RevealMnemonicResponse;
  mnemonic: string;
}

interface TempleGenerateSyncPayloadRequest extends TempleMessageBase {
  type: TempleMessageType.GenerateSyncPayloadRequest;
  password: string;
}

interface TempleGenerateSyncPayloadResponse extends TempleMessageBase {
  type: TempleMessageType.GenerateSyncPayloadResponse;
  payload: string;
}

interface TempleRemoveAccountRequest extends TempleMessageBase {
  type: TempleMessageType.RemoveAccountRequest;
  accountPublicKeyHash: string;
  password: string;
}

interface TempleRemoveAccountResponse extends TempleMessageBase {
  type: TempleMessageType.RemoveAccountResponse;
}

interface TempleEditAccountRequest extends TempleMessageBase {
  type: TempleMessageType.EditAccountRequest;
  accountPublicKeyHash: string;
  name: string;
}

interface TempleEditAccountResponse extends TempleMessageBase {
  type: TempleMessageType.EditAccountResponse;
}

interface TempleImportAccountRequest extends TempleMessageBase {
  type: TempleMessageType.ImportAccountRequest;
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

interface TempleImportFundraiserAccountRequest extends TempleMessageBase {
  type: TempleMessageType.ImportFundraiserAccountRequest;
  email: string;
  password: string;
  mnemonic: string;
}

interface TempleImportFundraiserAccountResponse extends TempleMessageBase {
  type: TempleMessageType.ImportFundraiserAccountResponse;
}

interface TempleImportManagedKTAccountRequest extends TempleMessageBase {
  type: TempleMessageType.ImportManagedKTAccountRequest;
  address: string;
  chainId: string;
  owner: string;
}

interface TempleImportManagedKTAccountResponse extends TempleMessageBase {
  type: TempleMessageType.ImportManagedKTAccountResponse;
}

interface TempleImportWatchOnlyAccountRequest extends TempleMessageBase {
  type: TempleMessageType.ImportWatchOnlyAccountRequest;
  address: string;
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

interface TempleOperationsRequest extends TempleMessageBase {
  type: TempleMessageType.OperationsRequest;
  id: string;
  sourcePkh: string;
  networkRpc: string;
  opParams: any[];
}

interface TempleOperationsResponse extends TempleMessageBase {
  type: TempleMessageType.OperationsResponse;
  opHash: string;
}

interface TempleSignRequest extends TempleMessageBase {
  type: TempleMessageType.SignRequest;
  id: string;
  sourcePkh: string;
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

interface TemplePageRequest extends TempleMessageBase {
  type: TempleMessageType.PageRequest;
  origin: string;
  payload: any;
  beacon?: boolean;
  encrypted?: boolean;
}

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

interface TempleDAppOpsConfirmationRequest extends TempleMessageBase {
  type: TempleMessageType.DAppOpsConfirmationRequest;
  id: string;
  confirmed: boolean;
  modifiedTotalFee?: number;
  modifiedStorageLimit?: number;
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

interface TempleGetAllDAppSessionsRequest extends TempleMessageBase {
  type: TempleMessageType.DAppGetAllSessionsRequest;
}

interface TempleGetAllDAppSessionsResponse extends TempleMessageBase {
  type: TempleMessageType.DAppGetAllSessionsResponse;
  sessions: TempleDAppSessions;
}

interface TempleRemoveDAppSessionRequest extends TempleMessageBase {
  type: TempleMessageType.DAppRemoveSessionRequest;
  origin: string;
}

interface TempleRemoveDAppSessionResponse extends TempleMessageBase {
  type: TempleMessageType.DAppRemoveSessionResponse;
  sessions: TempleDAppSessions;
}

interface TempleGoogleAuthTokenReceivedRequest extends TempleMessageBase {
  type: TempleMessageType.GoogleAuthTokenReceivedRequest;
  authToken: string;
}

export type OperationsPreview = any[] | { branch: string; contents: any[] };
