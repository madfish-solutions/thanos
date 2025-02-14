import { isDefined } from '@rnw-community/shared';
import { DerivationType } from '@taquito/ledger-signer';
import { TezosOperationError } from '@taquito/taquito';
import { char2Bytes } from '@taquito/utils';
import {
  TempleDAppMessageType,
  TempleDAppErrorType,
  TempleDAppRequest,
  TempleDAppResponse
} from '@temple-wallet/dapp/dist/types';
import browser, { Runtime } from 'webextension-polyfill';

import { BACKGROUND_IS_WORKER } from 'lib/env';
import { addLocalOperation } from 'lib/temple/activity';
import * as Beacon from 'lib/temple/beacon';
import { loadChainId } from 'lib/temple/helpers';
import {
  TempleState,
  TempleMessageType,
  TempleRequest,
  TempleSettings,
  TempleSharedStorageKey
} from 'lib/temple/types';
import { createQueue, delay } from 'lib/utils';

import {
  getCurrentPermission,
  requestPermission,
  requestOperation,
  requestSign,
  requestBroadcast,
  getAllDApps,
  removeDApp
} from './dapp';
import { intercom } from './defaults';
import type { DryRunResult } from './dryrun';
import { buildFinalOpParmas, dryRunOpParams } from './dryrun';
import {
  toFront,
  store,
  inited,
  locked,
  unlocked,
  accountsUpdated,
  settingsUpdated,
  withInited,
  withUnlocked
} from './store';
import { Vault } from './vault';

const ACCOUNT_NAME_PATTERN = /^.{0,16}$/;
const AUTODECLINE_AFTER = 60_000;
const BEACON_ID = `temple_wallet_${browser.runtime.id}`;
let initLocked = false;

const enqueueDApp = createQueue();
const enqueueUnlock = createQueue();

export async function init() {
  const vaultExist = await Vault.isExist();
  inited(vaultExist);

  if (initLocked) {
    initLocked = false;
    locked();
  }
}

export async function getFrontState(): Promise<TempleState> {
  const state = store.getState();
  if (state.inited) {
    if (BACKGROUND_IS_WORKER) return await enqueueUnlock(async () => toFront(store.getState()));
    else return toFront(state);
  } else {
    await delay(10);

    return getFrontState();
  }
}

export async function isDAppEnabled() {
  const bools = await Promise.all([
    Vault.isExist(),
    (async () => {
      const key = TempleSharedStorageKey.DAppEnabled;
      const items = await browser.storage.local.get([key]);
      return key in items ? items[key] : true;
    })()
  ]);

  return bools.every(Boolean);
}

export function registerNewWallet(password: string, mnemonic?: string) {
  return withInited(async () => {
    const accountPkh = await Vault.spawn(password, mnemonic);
    await unlock(password);

    return accountPkh;
  });
}

export async function lock() {
  if (!(await Vault.isExist())) {
    return;
  }

  if (!store.getState().inited) initLocked = true;
  if (BACKGROUND_IS_WORKER) await Vault.forgetSession();

  return withInited(() => {
    locked();
  });
}

export function unlock(password: string) {
  return withInited(() =>
    enqueueUnlock(async () => {
      const vault = await Vault.setup(password, BACKGROUND_IS_WORKER);
      const accounts = await vault.fetchAccounts();
      const settings = await vault.fetchSettings();
      unlocked({ vault, accounts, settings });
    })
  );
}

export async function unlockFromSession() {
  await enqueueUnlock(async () => {
    const vault = await Vault.recoverFromSession();
    if (vault == null) return;
    const accounts = await vault.fetchAccounts();
    const settings = await vault.fetchSettings();
    unlocked({ vault, accounts, settings });
  });
}

export function createHDAccount(name?: string) {
  return withUnlocked(async ({ vault }) => {
    if (name) {
      name = name.trim();
      if (!ACCOUNT_NAME_PATTERN.test(name)) {
        throw new Error('Invalid name. It should be: 1-16 characters, without special');
      }
    }

    const updatedAccounts = await vault.createHDAccount(name);
    accountsUpdated(updatedAccounts);
  });
}

export function revealMnemonic(password: string) {
  return withUnlocked(() => Vault.revealMnemonic(password));
}

export function generateSyncPayload(password: string) {
  return withUnlocked(() => Vault.generateSyncPayload(password));
}

export function revealPrivateKey(accPublicKeyHash: string, password: string) {
  return withUnlocked(() => Vault.revealPrivateKey(accPublicKeyHash, password));
}

export function revealPublicKey(accPublicKeyHash: string) {
  return withUnlocked(({ vault }) => vault.revealPublicKey(accPublicKeyHash));
}

export function removeAccount(accPublicKeyHash: string, password: string) {
  return withUnlocked(async () => {
    const updatedAccounts = await Vault.removeAccount(accPublicKeyHash, password);
    accountsUpdated(updatedAccounts);
  });
}

export function editAccount(accPublicKeyHash: string, name: string) {
  return withUnlocked(async ({ vault }) => {
    name = name.trim();
    if (!ACCOUNT_NAME_PATTERN.test(name)) {
      throw new Error('Invalid name. It should be: 1-16 characters, without special');
    }

    const updatedAccounts = await vault.editAccountName(accPublicKeyHash, name);
    accountsUpdated(updatedAccounts);
  });
}

export function importAccount(privateKey: string, encPassword?: string) {
  return withUnlocked(async ({ vault }) => {
    const updatedAccounts = await vault.importAccount(privateKey, encPassword);
    accountsUpdated(updatedAccounts);
  });
}

export function importMnemonicAccount(mnemonic: string, password?: string, derivationPath?: string) {
  return withUnlocked(async ({ vault }) => {
    const updatedAccounts = await vault.importMnemonicAccount(mnemonic, password, derivationPath);
    accountsUpdated(updatedAccounts);
  });
}

export function importFundraiserAccount(email: string, password: string, mnemonic: string) {
  return withUnlocked(async ({ vault }) => {
    const updatedAccounts = await vault.importFundraiserAccount(email, password, mnemonic);
    accountsUpdated(updatedAccounts);
  });
}

export function importManagedKTAccount(address: string, chainId: string, owner: string) {
  return withUnlocked(async ({ vault }) => {
    const updatedAccounts = await vault.importManagedKTAccount(address, chainId, owner);
    accountsUpdated(updatedAccounts);
  });
}

export function importWatchOnlyAccount(address: string, chainId?: string) {
  return withUnlocked(async ({ vault }) => {
    const updatedAccounts = await vault.importWatchOnlyAccount(address, chainId);
    accountsUpdated(updatedAccounts);
  });
}

export function createLedgerAccount(name: string, derivationPath?: string, derivationType?: DerivationType) {
  return withUnlocked(async ({ vault }) => {
    const updatedAccounts = await vault.createLedgerAccount(name, derivationPath, derivationType);
    accountsUpdated(updatedAccounts);
  });
}

export function updateSettings(settings: Partial<TempleSettings>) {
  return withUnlocked(async ({ vault }) => {
    const updatedSettings = await vault.updateSettings(settings);
    createCustomNetworksSnapshot(updatedSettings);
    settingsUpdated(updatedSettings);
  });
}

export function getAllDAppSessions() {
  return getAllDApps();
}

export function removeDAppSession(origin: string) {
  return removeDApp(origin);
}

export function sendOperations(
  port: Runtime.Port,
  id: string,
  sourcePkh: string,
  networkRpc: string,
  opParams: any[]
): Promise<{ opHash: string }> {
  return withUnlocked(async () => {
    const sourcePublicKey = await revealPublicKey(sourcePkh);
    const dryRunResult = await dryRunOpParams({
      opParams,
      networkRpc,
      sourcePkh,
      sourcePublicKey
    });
    if (dryRunResult && dryRunResult.result) {
      opParams = (dryRunResult.result as any).opParams;
    }

    return new Promise((resolve, reject) =>
      promisableUnlock(resolve, reject, port, id, sourcePkh, networkRpc, opParams, dryRunResult)
    );
  });
}

const promisableUnlock = async (
  resolve: (arg: { opHash: string }) => void,
  reject: (err: Error) => void,
  port: Runtime.Port,
  id: string,
  sourcePkh: string,
  networkRpc: string,
  opParams: any[],
  dryRunResult: DryRunResult | null
) => {
  intercom.notify(port, {
    type: TempleMessageType.ConfirmationRequested,
    id,
    payload: {
      type: 'operations',
      sourcePkh,
      networkRpc,
      opParams,
      ...((dryRunResult && dryRunResult.result) ?? {})
    },
    ...(dryRunResult && dryRunResult.error ? { error: dryRunResult } : {})
  });

  let closing = false;

  const decline = () => {
    reject(new Error('Declined'));
  };
  const declineAndClose = () => {
    decline();
    closing = close(closing, port, id, stopTimeout, stopRequestListening, stopDisconnectListening);
  };

  const stopRequestListening = intercom.onRequest(async (req: TempleRequest, reqPort) => {
    if (reqPort === port && req?.type === TempleMessageType.ConfirmationRequest && req?.id === id) {
      if (req.confirmed) {
        try {
          const op = await withUnlocked(({ vault }) =>
            vault.sendOperations(
              sourcePkh,
              networkRpc,
              buildFinalOpParmas(opParams, req.modifiedTotalFee, req.modifiedStorageLimit)
            )
          );

          await safeAddLocalOperation(networkRpc, op);

          resolve({ opHash: op.hash });
        } catch (err: any) {
          if (err instanceof TezosOperationError) {
            reject(err);
          } else {
            throw err;
          }
        }
      } else {
        decline();
      }

      closing = close(closing, port, id, stopTimeout, stopRequestListening, stopDisconnectListening);

      return {
        type: TempleMessageType.ConfirmationResponse
      };
    }
    return undefined;
  });

  const stopDisconnectListening = intercom.onDisconnect(port, declineAndClose);

  // Decline after timeout
  const t = setTimeout(declineAndClose, AUTODECLINE_AFTER);
  const stopTimeout = () => clearTimeout(t);
};

const safeAddLocalOperation = async (networkRpc: string, op: any) => {
  try {
    const chainId = await loadChainId(networkRpc);
    await addLocalOperation(chainId, op.hash, op.results);
  } catch {}
  return undefined;
};

export function sign(port: Runtime.Port, id: string, sourcePkh: string, bytes: string, watermark?: string) {
  return withUnlocked(
    () =>
      new Promise(async (resolve, reject) => {
        intercom.notify(port, {
          type: TempleMessageType.ConfirmationRequested,
          id,
          payload: {
            type: 'sign',
            sourcePkh,
            bytes,
            watermark
          }
        });

        let closing = false;

        const decline = () => {
          reject(new Error('Declined'));
        };
        const declineAndClose = () => {
          decline();
          closing = close(closing, port, id, stopTimeout, stopRequestListening, stopDisconnectListening);
        };

        const stopRequestListening = intercom.onRequest(async (req: TempleRequest, reqPort) => {
          if (reqPort === port && req?.type === TempleMessageType.ConfirmationRequest && req?.id === id) {
            if (req.confirmed) {
              const result = await withUnlocked(({ vault }) => vault.sign(sourcePkh, bytes, watermark));
              resolve(result);
            } else {
              decline();
            }

            closing = close(closing, port, id, stopTimeout, stopRequestListening, stopDisconnectListening);

            return {
              type: TempleMessageType.ConfirmationResponse
            };
          }
          return undefined;
        });

        const stopDisconnectListening = intercom.onDisconnect(port, declineAndClose);

        // Decline after timeout
        const t = setTimeout(declineAndClose, AUTODECLINE_AFTER);
        const stopTimeout = () => clearTimeout(t);
      })
  );
}

export async function processDApp(origin: string, req: TempleDAppRequest): Promise<TempleDAppResponse | void> {
  switch (req?.type) {
    case TempleDAppMessageType.GetCurrentPermissionRequest:
      return withInited(() => getCurrentPermission(origin));

    case TempleDAppMessageType.PermissionRequest:
      return withInited(() => enqueueDApp(() => requestPermission(origin, req)));

    case TempleDAppMessageType.OperationRequest:
      return withInited(() => enqueueDApp(() => requestOperation(origin, req)));

    case TempleDAppMessageType.SignRequest:
      return withInited(() => enqueueDApp(() => requestSign(origin, req)));

    case TempleDAppMessageType.BroadcastRequest:
      return withInited(() => requestBroadcast(origin, req));
  }
}

export async function getBeaconMessage(origin: string, msg: string, encrypted = false) {
  let recipientPubKey: string | null = null;
  let payload = null;

  if (encrypted) {
    try {
      recipientPubKey = await Beacon.getDAppPublicKey(origin);
      if (!recipientPubKey) throw new Error('<stub>');

      try {
        msg = await Beacon.decryptMessage(msg, recipientPubKey);
      } catch (err: any) {
        await Beacon.removeDAppPublicKey(origin);
        throw err;
      }
    } catch {
      payload = {
        payload: Beacon.encodeMessage<Beacon.Response>({
          version: '2',
          senderId: await Beacon.getSenderId(),
          id: 'stub',
          type: Beacon.MessageType.Disconnect
        })
      };
    }
  }

  let req: Beacon.Request | null;
  try {
    req = Beacon.decodeMessage<Beacon.Request>(msg);
  } catch {
    req = null;
  }

  return {
    recipientPubKey,
    req,
    payload
  };
}

type ProcessedBeaconMessage = {
  payload: string;
  encrypted?: boolean;
};

export async function processBeacon(
  origin: string,
  msg: string,
  encrypted = false
): Promise<ProcessedBeaconMessage | undefined> {
  const { req, recipientPubKey, payload } = await getBeaconMessage(origin, msg, encrypted);
  if (payload) {
    return payload;
  }
  if (!req) {
    return;
  }

  // Process Disconnect
  if (req.type === Beacon.MessageType.Disconnect) {
    await removeDApp(origin);
    return;
  }

  const resBase = {
    version: req.version,
    id: req.id,
    ...(req.beaconId ? { beaconId: BEACON_ID } : { senderId: await Beacon.getSenderId() })
  };

  // Process handshake
  if (req.type === Beacon.MessageType.HandshakeRequest) {
    await Beacon.saveDAppPublicKey(origin, req.publicKey);
    const keyPair = await Beacon.getOrCreateKeyPair();
    return {
      payload: await Beacon.sealCryptobox(
        JSON.stringify({
          ...resBase,
          ...Beacon.PAIRING_RESPONSE_BASE,
          publicKey: Beacon.toHex(keyPair.publicKey)
        }),
        Beacon.fromHex(req.publicKey)
      )
    };
  }

  const res = await getBeaconResponse(req, resBase, origin);
  // const res = null;

  const resMsg = Beacon.encodeMessage<Beacon.Response>(res);
  if (encrypted && recipientPubKey) {
    return {
      payload: await Beacon.encryptMessage(resMsg, recipientPubKey),
      encrypted: true
    };
  }
  return { payload: resMsg };
}

const getBeaconResponse = async (req: Beacon.Request, resBase: any, origin: string): Promise<Beacon.Response> => {
  try {
    try {
      return await formatTempleReq(getTempleReq(req), req, resBase, origin);
    } catch (err: any) {
      if (err instanceof TezosOperationError) {
        throw err;
      }

      // Map Temple DApp error to Beacon error
      const beaconErrorType = (() => {
        switch (err?.message) {
          case TempleDAppErrorType.InvalidParams:
            return Beacon.ErrorType.PARAMETERS_INVALID_ERROR;

          case TempleDAppErrorType.NotFound:
          case TempleDAppErrorType.NotGranted:
            return req.beaconId ? Beacon.ErrorType.NOT_GRANTED_ERROR : Beacon.ErrorType.ABORTED_ERROR;

          default:
            return err?.message;
        }
      })();

      throw new Error(beaconErrorType);
    }
  } catch (err: any) {
    return {
      ...resBase,
      type: Beacon.MessageType.Error,
      errorType: (() => {
        switch (true) {
          case err instanceof TezosOperationError:
            return Beacon.ErrorType.TRANSACTION_INVALID_ERROR;

          case err?.message in Beacon.ErrorType:
            return err.message;

          default:
            return Beacon.ErrorType.UNKNOWN_ERROR;
        }
      })(),
      errorData: getErrorData(err)
    };
  }
};

const getTempleReq = (req: Beacon.Request): TempleDAppRequest | void => {
  switch (req.type) {
    case Beacon.MessageType.PermissionRequest:
      const network =
        req.network.type === 'custom'
          ? {
              name: req.network.name!,
              rpc: req.network.rpcUrl!
            }
          : req.network.type;

      return {
        type: TempleDAppMessageType.PermissionRequest,
        network: network as any,
        appMeta: req.appMetadata,
        force: true
      };

    case Beacon.MessageType.OperationRequest:
      return {
        type: TempleDAppMessageType.OperationRequest,
        sourcePkh: req.sourceAddress,
        opParams: req.operationDetails.map(Beacon.formatOpParams)
      };

    case Beacon.MessageType.SignPayloadRequest:
      return {
        type: TempleDAppMessageType.SignRequest,
        sourcePkh: req.sourceAddress,
        payload: req.signingType === Beacon.SigningType.RAW ? generateRawPayloadBytes(req.payload) : req.payload
      };

    case Beacon.MessageType.BroadcastRequest:
      return {
        type: TempleDAppMessageType.BroadcastRequest,
        signedOpBytes: req.signedTransaction
      };
  }
};

const formatTempleReq = async (
  templeReq: TempleDAppRequest | void,
  req: Beacon.Request,
  resBase: any,
  origin: string
) => {
  if (templeReq) {
    const templeRes = await processDApp(origin, templeReq);

    if (templeRes) {
      // Map Temple DApp response to Beacon response
      switch (templeRes.type) {
        case TempleDAppMessageType.PermissionResponse:
          return {
            ...resBase,
            type: Beacon.MessageType.PermissionResponse,
            publicKey: (templeRes as any).publicKey,
            network: (req as Beacon.PermissionRequest).network,
            scopes: [Beacon.PermissionScope.OPERATION_REQUEST, Beacon.PermissionScope.SIGN]
          };

        case TempleDAppMessageType.OperationResponse:
          return {
            ...resBase,
            type: Beacon.MessageType.OperationResponse,
            transactionHash: templeRes.opHash
          };

        case TempleDAppMessageType.SignResponse:
          return {
            ...resBase,
            type: Beacon.MessageType.SignPayloadResponse,
            signature: templeRes.signature
          };

        case TempleDAppMessageType.BroadcastResponse:
          return {
            ...resBase,
            type: Beacon.MessageType.BroadcastResponse,
            transactionHash: templeRes.opHash
          };
      }
    }
  }

  throw new Error(Beacon.ErrorType.UNKNOWN_ERROR);
};

async function createCustomNetworksSnapshot(settings: TempleSettings) {
  try {
    if (settings.customNetworks) {
      await browser.storage.local.set({
        custom_networks_snapshot: settings.customNetworks
      });
    }
  } catch {}
}

function getErrorData(err: any) {
  return err instanceof TezosOperationError ? err.errors.map(({ contract_code, ...rest }: any) => rest) : undefined;
}

function generateRawPayloadBytes(payload: string) {
  const alreadyHexMatch = payload.match(/^(0x)?([0-9a-fA-F]+)$/);
  const hexString = alreadyHexMatch?.[2];

  return isDefined(hexString) && hexString.length % 2 === 0 ? hexString : char2Bytes(payload);
}

const close = (
  closing: boolean,
  port: Runtime.Port,
  id: string,
  stopTimeout: any,
  stopRequestListening: any,
  stopDisconnectListening: any
) => {
  let innerClosing = closing;
  if (innerClosing) return innerClosing;
  innerClosing = true;

  try {
    stopTimeout();
    stopRequestListening();
    stopDisconnectListening();

    intercom.notify(port, {
      type: TempleMessageType.ConfirmationExpired,
      id
    });
  } catch (_err) {}
  return innerClosing;
};
