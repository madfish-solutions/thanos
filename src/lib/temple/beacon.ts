import bs58check from 'bs58check';
import { Buffer } from 'buffer';
import {
  crypto_generichash,
  crypto_box_seal,
  ready,
  crypto_secretbox_NONCEBYTES,
  crypto_secretbox_MACBYTES,
  crypto_sign_seed_keypair,
  from_string,
  randombytes_buf,
  crypto_kx_server_session_keys,
  crypto_secretbox_easy,
  crypto_secretbox_open_easy,
  crypto_kx_client_session_keys,
  crypto_sign_ed25519_pk_to_curve25519,
  crypto_sign_ed25519_sk_to_curve25519,
  KeyPair,
  CryptoKX
} from 'libsodium-wrappers';
import memoizee from 'memoizee';
import browser from 'webextension-polyfill';

interface AppMetadata {
  senderId: string;
  name: string;
  icon?: string;
}

type NetworkType = 'mainnet' | 'custom';

interface Network {
  type: NetworkType;
  name?: string;
  rpcUrl?: string;
}

export enum SigningType {
  RAW = 'raw', // Arbitrary payload (string), which will be hashed before signing
  OPERATION = 'operation', // "03" prefix
  MICHELINE = 'micheline' // "05" prefix
}

export type Request =
  | PermissionRequest
  | OperationRequest
  | SignRequest
  | BroadcastRequest
  | DisconnectMessage
  | PostMessagePairingRequest;

export type Response =
  | ErrorResponse
  | PermissionResponse
  | OperationResponse
  | SignResponse
  | BroadcastResponse
  | AcknowledgeResponse
  | DisconnectMessage
  | PostMessagePairingResponse;

export enum MessageType {
  Acknowledge = 'acknowledge',

  PermissionRequest = 'permission_request',
  SignPayloadRequest = 'sign_payload_request',
  OperationRequest = 'operation_request',
  BroadcastRequest = 'broadcast_request',
  PermissionResponse = 'permission_response',
  SignPayloadResponse = 'sign_payload_response',
  OperationResponse = 'operation_response',
  BroadcastResponse = 'broadcast_response',
  Disconnect = 'disconnect',
  Error = 'error',
  // Handshake
  HandshakeRequest = 'postmessage-pairing-request',
  HandshakeResponse = 'postmessage-pairing-response'
}

interface BaseMessage {
  type: MessageType;
  version: string;
  id: string; // ID of the message. The same ID is used in the request and response
  beaconId?: string;
  senderId?: string; // ID of the sender. This is used to identify the sender of the message
}

export enum PermissionScope {
  SIGN = 'sign',
  OPERATION_REQUEST = 'operation_request',
  THRESHOLD = 'threshold'
}

export interface PermissionRequest extends BaseMessage {
  type: MessageType.PermissionRequest;
  appMetadata: AppMetadata;
  network: Network;
  scopes: PermissionScope[];
}

interface PermissionResponse extends BaseMessage {
  type: MessageType.PermissionResponse;
  network: Network; // Network on which the permissions have been granted
  publicKey: string; // Public Key, because it can be used to verify signatures
  scopes: PermissionScope[]; // Permissions that have been granted for this specific address / account
  threshold?: {
    amount: string;
    timeframe: string;
  };
}

interface AcknowledgeResponse {
  type: MessageType.Acknowledge;
  version: string;
  senderId: string;
  id: string;
}

export interface OperationRequest extends BaseMessage {
  type: MessageType.OperationRequest;
  network: Network;
  operationDetails: any[];
  sourceAddress: string;
}

interface OperationResponse extends BaseMessage {
  type: MessageType.OperationResponse;
  transactionHash: string;
}

interface SignRequest extends BaseMessage {
  type: MessageType.SignPayloadRequest;
  sourceAddress: string;
  payload: string;
  signingType?: SigningType;
}

interface SignResponse extends BaseMessage {
  type: MessageType.SignPayloadResponse;
  signature: string;
}

interface BroadcastRequest extends BaseMessage {
  type: MessageType.BroadcastRequest;
  network: Network; // Network on which the transaction will be broadcast
  signedTransaction: string; // Signed transaction that will be broadcast
}

interface BroadcastResponse extends BaseMessage {
  type: MessageType.BroadcastResponse;
  transactionHash: string; // Hash of the broadcast transaction
}

export enum ErrorType {
  BROADCAST_ERROR = 'BROADCAST_ERROR', // Broadcast | Operation Request: Will be returned if the user chooses that the transaction is broadcast but there is an error (eg. node not available).
  NETWORK_NOT_SUPPORTED = 'NETWORK_NOT_SUPPORTED', // Permission: Will be returned if the selected network is not supported by the wallet / extension.
  NO_ADDRESS_ERROR = 'NO_ADDRESS_ERROR', // Permission: Will be returned if there is no address present for the protocol / network requested.
  NO_PRIVATE_KEY_FOUND_ERROR = 'NO_PRIVATE_KEY_FOUND_ERROR', // Sign: Will be returned if the private key matching the sourceAddress could not be found.
  NOT_GRANTED_ERROR = 'NOT_GRANTED_ERROR', // Sign: Will be returned if the signature was blocked // (Not needed?) Permission: Will be returned if the permissions requested by the App were not granted.
  PARAMETERS_INVALID_ERROR = 'PARAMETERS_INVALID_ERROR', // Operation Request: Will be returned if any of the parameters are invalid.
  TOO_MANY_OPERATIONS = 'TOO_MANY_OPERATIONS', // Operation Request: Will be returned if too many operations were in the request and they were not able to fit into a single operation group.
  TRANSACTION_INVALID_ERROR = 'TRANSACTION_INVALID_ERROR', // Broadcast: Will be returned if the transaction is not parsable or is rejected by the node.
  ABORTED_ERROR = 'ABORTED_ERROR', // Permission | Operation Request | Sign Request | Broadcast: Will be returned if the request was aborted by the user or the wallet.
  UNKNOWN_ERROR = 'UNKNOWN_ERROR' // Used as a wildcard if an unexpected error occurred.
}

interface ErrorResponse extends BaseMessage {
  type: MessageType.Error;
  errorType: ErrorType;
  errorData?: any[];
}

interface DisconnectMessage extends BaseMessage {
  type: MessageType.Disconnect;
}

export interface PostMessagePairingRequest extends BaseMessage {
  type: MessageType.HandshakeRequest;
  name: string;
  icon?: string; // TODO: Should this be a URL or base64 image?
  appUrl?: string;
  publicKey: string;
}

interface PostMessagePairingResponse extends BaseMessage {
  type: MessageType.HandshakeResponse;
  name: string;
  icon?: string; // TODO: Should this be a URL or base64 image?
  appUrl?: string;
  publicKey: string;
}

export function encodeMessage<T = unknown>(msg: T): string {
  return bs58check.encode(Buffer.from(JSON.stringify(msg)));
}

export function decodeMessage<T = unknown>(encoded: string): T {
  return JSON.parse(bs58check.decode(encoded).toString());
}

export function formatOpParams(op: any) {
  const { fee, gas_limit, storage_limit, ...rest } = op;
  if (op.kind === 'transaction') {
    const { to, destination, amount, parameter, parameters, ...txRest } = rest;
    return {
      ...txRest,
      to: to ?? destination,
      amount: +amount,
      mutez: true,
      parameter: parameter ?? parameters,
      fee,
      gasLimit: gas_limit,
      storageLimit: storage_limit
    };
  }

  if (op.kind === 'origination') {
    return {
      mutez: true,
      ...rest
    };
  }
  return rest;
}

/**
 * Beacon V2
 */
export const PAIRING_RESPONSE_BASE: Partial<PostMessagePairingResponse> = {
  type: MessageType.HandshakeResponse,
  name: 'Temple - Tezos Wallet',
  icon: 'https://templewallet.com/logo.png',
  appUrl: browser.runtime.getURL('fullpage.html')
};

const KEYPAIR_SEED_STORAGE_KEY = 'beacon_keypair_seed';

export async function getSenderId(): Promise<string> {
  await ready;
  const keyPair = await getOrCreateKeyPair();
  const buffer = Buffer.from(crypto_generichash(5, keyPair.publicKey));
  return bs58check.encode(buffer);
}

export async function encryptMessage(message: string, recipientPublicKey: string): Promise<string> {
  const keyPair = await getOrCreateKeyPair();
  const { sharedTx } = await createCryptoBoxClient(recipientPublicKey, keyPair);

  return encryptCryptoboxPayload(message, sharedTx);
}

export async function decryptMessage(payload: string, senderPublicKey: string) {
  const keyPair = await getOrCreateKeyPair();
  const { sharedRx } = await createCryptoBoxServer(senderPublicKey, keyPair);

  const hexPayload = Buffer.from(payload, 'hex');

  if (hexPayload.length >= crypto_secretbox_NONCEBYTES + crypto_secretbox_MACBYTES) {
    try {
      return await decryptCryptoboxPayload(hexPayload, sharedRx);
    } catch (decryptionError) {
      /* NO-OP. We try to decode every message, but some might not be addressed to us. */
    }
  }

  throw new Error('Could not decrypt message');
}

export async function sealCryptobox(payload: string | Buffer, publicKey: Uint8Array): Promise<string> {
  await ready;

  const kxSelfPublicKey = crypto_sign_ed25519_pk_to_curve25519(Buffer.from(publicKey)); // Secret bytes to scalar bytes
  const encryptedMessage = crypto_box_seal(payload, kxSelfPublicKey);

  return toHex(encryptedMessage);
}

export async function encryptCryptoboxPayload(message: string, sharedKey: Uint8Array): Promise<string> {
  await ready;

  const nonce = Buffer.from(randombytes_buf(crypto_secretbox_NONCEBYTES));
  const combinedPayload = Buffer.concat([
    nonce,
    Buffer.from(crypto_secretbox_easy(Buffer.from(message, 'utf8'), nonce, sharedKey))
  ]);

  return toHex(combinedPayload);
}

export async function decryptCryptoboxPayload(payload: Uint8Array, sharedKey: Uint8Array): Promise<string> {
  await ready;

  const nonce = payload.slice(0, crypto_secretbox_NONCEBYTES);
  const ciphertext = payload.slice(crypto_secretbox_NONCEBYTES);

  return Buffer.from(crypto_secretbox_open_easy(ciphertext, nonce, sharedKey)).toString('utf8');
}

export async function createCryptoBoxServer(otherPublicKey: string, selfKeyPair: KeyPair): Promise<CryptoKX> {
  const keys = await createCryptoBox(otherPublicKey, selfKeyPair);

  return crypto_kx_server_session_keys(...keys);
}

export async function createCryptoBoxClient(otherPublicKey: string, selfKeyPair: KeyPair): Promise<CryptoKX> {
  const keys = await createCryptoBox(otherPublicKey, selfKeyPair);

  return crypto_kx_client_session_keys(...keys);
}

export async function createCryptoBox(
  otherPublicKey: string,
  selfKeyPair: KeyPair
): Promise<[Uint8Array, Uint8Array, Uint8Array]> {
  // TODO: Don't calculate it every time?
  const kxSelfPrivateKey = crypto_sign_ed25519_sk_to_curve25519(Buffer.from(selfKeyPair.privateKey)); // Secret bytes to scalar bytes
  const kxSelfPublicKey = crypto_sign_ed25519_pk_to_curve25519(Buffer.from(selfKeyPair.publicKey)); // Secret bytes to scalar bytes
  const kxOtherPublicKey = crypto_sign_ed25519_pk_to_curve25519(Buffer.from(otherPublicKey, 'hex')); // Secret bytes to scalar bytes

  return [Buffer.from(kxSelfPublicKey), Buffer.from(kxSelfPrivateKey), Buffer.from(kxOtherPublicKey)];
}

export const getOrCreateKeyPair = memoizee(
  async () => {
    const items = await browser.storage.local.get([KEYPAIR_SEED_STORAGE_KEY]);
    const exist = KEYPAIR_SEED_STORAGE_KEY in items;

    let seed: string;
    if (exist) {
      seed = items[KEYPAIR_SEED_STORAGE_KEY];
    } else {
      const newSeed = generateNewSeed();
      await browser.storage.local.set({ [KEYPAIR_SEED_STORAGE_KEY]: newSeed });
      seed = newSeed;
    }

    await ready;
    return crypto_sign_seed_keypair(crypto_generichash(32, from_string(seed)));
  },
  { maxAge: 60_000, promise: true }
);

export async function getDAppPublicKey(origin: string) {
  const key = toPubKeyStorageKey(origin);
  const items = await browser.storage.local.get([key]);
  return key in items ? (items[key] as string) : null;
}

export async function saveDAppPublicKey(origin: string, publicKey: string) {
  await browser.storage.local.set({
    [toPubKeyStorageKey(origin)]: publicKey
  });
}

export async function removeDAppPublicKey(origin: string) {
  await browser.storage.local.remove([toPubKeyStorageKey(origin)]);
}

export function generateNewSeed() {
  const view = new Uint8Array(32);
  crypto.getRandomValues(view);
  return toHex(view);
}

export function toHex(term: Uint8Array | Buffer) {
  return Buffer.from(term).toString('hex');
}

export function fromHex(term: string) {
  return Buffer.from(term, 'hex');
}

export function toPubKeyStorageKey(origin: string) {
  return `beacon_${origin}_pubkey`;
}
