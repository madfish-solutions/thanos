import memoizee from 'memoizee';
import browser, { Runtime } from 'webextension-polyfill';
import { ValidationError } from 'yup';

import { getStoredAppInstallIdentity } from 'app/storage/app-install-id';
import { importExtensionAdsReferralsModule } from 'lib/ads/import-extension-ads-module';
import { updateRulesStorage } from 'lib/ads/update-rules-storage';
import {
  fetchReferralsAffiliateLinks,
  fetchReferralsRules,
  postAdImpression,
  postAnonymousAdImpression,
  postReferralClick
} from 'lib/apis/ads-api';
import { ADS_VIEWER_ADDRESS_STORAGE_KEY, ContentScriptType } from 'lib/constants';
import { E2eMessageType } from 'lib/e2e/types';
import { BACKGROUND_IS_WORKER, EnvVars } from 'lib/env';
import { fetchFromStorage } from 'lib/storage';
import { encodeMessage, encryptMessage, getSenderId, MessageType, Response } from 'lib/temple/beacon';
import { clearAsyncStorages } from 'lib/temple/reset';
import { StoredHDAccount, TempleMessageType, TempleRequest, TempleResponse } from 'lib/temple/types';
import { getTrackedCashbackServiceDomain, getTrackedUrl } from 'lib/utils/url-track/url-track.utils';
import { EVMErrorCodes } from 'temple/evm/constants';
import { ErrorWithCode } from 'temple/evm/types';
import { parseTransactionRequest } from 'temple/evm/utils';
import { TempleChainKind } from 'temple/types';

import * as Actions from './actions';
import * as Analytics from './analytics';
import { intercom } from './defaults';
import { store, toFront } from './store';

const frontStore = store.map(toFront);

export const start = async () => {
  intercom.onRequest(processRequestWithErrorsLogged);
  await Actions.init();

  if (BACKGROUND_IS_WORKER) await Actions.unlockFromSession().catch(e => console.error(e));

  frontStore.watch(() => {
    intercom.broadcast({ type: TempleMessageType.StateUpdated });
  });
};

const processRequestWithErrorsLogged = (...args: Parameters<typeof processRequest>) =>
  processRequest(...args).catch(error => {
    console.error(error);
    throw error;
  });

const processRequest = async (req: TempleRequest, port: Runtime.Port): Promise<TempleResponse | void> => {
  switch (req.type) {
    case TempleMessageType.SendTrackEventRequest:
      await Analytics.trackEvent(req);
      return { type: TempleMessageType.SendTrackEventResponse };

    case TempleMessageType.SendPageEventRequest:
      await Analytics.pageEvent(req);
      return { type: TempleMessageType.SendPageEventResponse };

    case TempleMessageType.GetStateRequest:
      const state = await Actions.getFrontState();
      return {
        type: TempleMessageType.GetStateResponse,
        state
      };

    case TempleMessageType.SendEvmTransactionRequest:
      const txHash = await Actions.sendEvmTransaction(
        req.accountPkh,
        req.network,
        parseTransactionRequest(req.txParams)
      );
      return { type: TempleMessageType.SendEvmTransactionResponse, txHash };

    case TempleMessageType.NewWalletRequest:
      const accountPkh = await Actions.registerNewWallet(req.password, req.mnemonic);
      return { type: TempleMessageType.NewWalletResponse, accountPkh };

    case TempleMessageType.UnlockRequest:
      await Actions.unlock(req.password);
      return { type: TempleMessageType.UnlockResponse };

    case TempleMessageType.LockRequest:
      await Actions.lock();
      return { type: TempleMessageType.LockResponse };

    case TempleMessageType.FindFreeHDAccountIndexRequest:
      const responsePayload = await Actions.findFreeHDAccountIndex(req.walletId);
      return {
        type: TempleMessageType.FindFreeHDAccountIndexResponse,
        ...responsePayload
      };

    case TempleMessageType.CreateAccountRequest:
      await Actions.createHDAccount(req.walletId, req.name, req.hdIndex);
      return { type: TempleMessageType.CreateAccountResponse };

    case TempleMessageType.RevealPublicKeyRequest:
      const publicKey = await Actions.revealPublicKey(req.accountAddress);
      return {
        type: TempleMessageType.RevealPublicKeyResponse,
        publicKey
      };

    case TempleMessageType.RevealPrivateKeyRequest:
      const privateKey = await Actions.revealPrivateKey(req.address, req.password);
      return {
        type: TempleMessageType.RevealPrivateKeyResponse,
        privateKey
      };

    case TempleMessageType.RevealMnemonicRequest:
      const mnemonic = await Actions.revealMnemonic(req.walletId, req.password);
      return {
        type: TempleMessageType.RevealMnemonicResponse,
        mnemonic
      };

    case TempleMessageType.GenerateSyncPayloadRequest:
      const payload = await Actions.generateSyncPayload(req.password, req.walletId);
      return {
        type: TempleMessageType.GenerateSyncPayloadResponse,
        payload
      };

    case TempleMessageType.RemoveAccountRequest:
      await Actions.removeAccount(req.id, req.password);
      return {
        type: TempleMessageType.RemoveAccountResponse
      };

    case TempleMessageType.EditAccountRequest:
      await Actions.editAccount(req.id, req.name);
      return {
        type: TempleMessageType.EditAccountResponse
      };

    case TempleMessageType.SetAccountHiddenRequest:
      await Actions.setAccountHidden(req.id, req.value);
      return {
        type: TempleMessageType.SetAccountHiddenResponse
      };

    case TempleMessageType.ImportAccountRequest:
      await Actions.importAccount(req.chain, req.privateKey, req.encPassword);
      return {
        type: TempleMessageType.ImportAccountResponse
      };

    case TempleMessageType.ImportMnemonicAccountRequest:
      await Actions.importMnemonicAccount(req.mnemonic, req.password, req.derivationPath);
      return {
        type: TempleMessageType.ImportMnemonicAccountResponse
      };

    case TempleMessageType.ImportWatchOnlyAccountRequest:
      await Actions.importWatchOnlyAccount(req.chain, req.address, req.chainId);
      return {
        type: TempleMessageType.ImportWatchOnlyAccountResponse
      };

    case TempleMessageType.CreateLedgerAccountRequest:
      await Actions.createLedgerAccount(req.name, req.derivationPath, req.derivationType);
      return {
        type: TempleMessageType.CreateLedgerAccountResponse
      };

    case TempleMessageType.UpdateSettingsRequest:
      await Actions.updateSettings(req.settings);
      return {
        type: TempleMessageType.UpdateSettingsResponse
      };

    case TempleMessageType.RemoveHdWalletRequest:
      await Actions.removeHdWallet(req.id, req.password);
      return {
        type: TempleMessageType.RemoveHdWalletResponse
      };

    case TempleMessageType.RemoveAccountsByTypeRequest:
      await Actions.removeAccountsByType(req.accountsType, req.password);
      return {
        type: TempleMessageType.RemoveAccountsByTypeResponse
      };

    case TempleMessageType.CreateOrImportWalletRequest:
      await Actions.createOrImportWallet(req.mnemonic);
      return {
        type: TempleMessageType.CreateOrImportWalletResponse
      };

    case TempleMessageType.OperationsRequest:
      const { opHash } = await Actions.sendOperations(
        port,
        req.id,
        req.sourcePkh,
        req.networkRpc,
        req.opParams,
        req.straightaway
      );
      return {
        type: TempleMessageType.OperationsResponse,
        opHash
      };

    case TempleMessageType.SignRequest:
      const result = await Actions.sign(port, req.id, req.sourcePkh, req.networkRpc, req.bytes, req.watermark);
      return {
        type: TempleMessageType.SignResponse,
        result
      };

    case TempleMessageType.DAppRemoveSessionRequest:
      const sessions = await Actions.removeDAppSession(req.origins);
      return {
        type: TempleMessageType.DAppRemoveSessionResponse,
        sessions
      };

    case TempleMessageType.DAppSwitchEvmChainRequest:
      await Actions.switchEvmChain(req.origin, req.chainId, true);
      return { type: TempleMessageType.DAppSwitchEvmChainResponse };

    case TempleMessageType.Acknowledge: {
      if (req.payload !== 'PING' && req.payload !== 'ping' && req.beacon) {
        const {
          req: res,
          recipientPubKey,
          payload
        } = await Actions.getBeaconMessage(req.origin, req.payload, req.encrypted);
        if (payload) {
          return;
        }
        if (!req) {
          return;
        }

        const response: {
          type: MessageType.Acknowledge;
          version: string;
          id: string;
          senderId: string;
        } = {
          version: '2',
          senderId: await getSenderId(),
          id: res?.id ?? '',
          type: MessageType.Acknowledge
        };

        return {
          type: TempleMessageType.Acknowledge,
          payload: await encryptMessage(encodeMessage<Response>(response), recipientPubKey ?? ''),
          encrypted: true
        };
      }
      break;
    }

    case TempleMessageType.PageRequest:
      const dAppEnabled = await Actions.canInteractWithDApps();

      if (!dAppEnabled && req.chainType === TempleChainKind.EVM) {
        return {
          type: TempleMessageType.PageResponse,
          payload: {
            error: {
              code: EVMErrorCodes.NOT_AUTHORIZED,
              message: 'DApp interaction is disabled'
            }
          }
        };
      }

      if (!dAppEnabled) {
        return;
      }

      if (req.chainType === TempleChainKind.EVM) {
        let resPayload: any;
        try {
          resPayload = { data: await Actions.processEvmDApp(req.origin, req.payload, req.chainId, req.iconUrl) };
        } catch (e) {
          console.error(e);
          if (e instanceof ErrorWithCode) {
            resPayload = {
              error: {
                code: e.code,
                message: e.message
              }
            };
          } else if (e instanceof ValidationError) {
            resPayload = {
              error: {
                code: EVMErrorCodes.INVALID_PARAMS,
                message: e.message
              }
            };
          } else {
            resPayload = {
              error: {
                code: EVMErrorCodes.INTERNAL_ERROR,
                message: e instanceof Error ? e.message : 'Unknown error'
              }
            };
          }
        }

        return { type: TempleMessageType.PageResponse, payload: resPayload };
      }

      if (req.payload === 'PING') {
        return {
          type: TempleMessageType.PageResponse,
          payload: 'PONG'
        };
      } else if (req.beacon && req.payload === 'ping') {
        return {
          type: TempleMessageType.PageResponse,
          payload: 'pong'
        };
      }

      if (!req.beacon) {
        const resPayload = await Actions.processDApp(req.origin, req.payload);
        return {
          type: TempleMessageType.PageResponse,
          payload: resPayload ?? null
        };
      } else {
        const res = await Actions.processBeacon(req.origin, req.payload, req.encrypted);
        return {
          type: TempleMessageType.PageResponse,
          payload: res?.payload ?? null,
          encrypted: res?.encrypted
        };
      }

    case TempleMessageType.ResetExtensionRequest:
      await Actions.resetExtension(req.password);
      return {
        type: TempleMessageType.ResetExtensionResponse
      };
  }
};

browser.runtime.onMessage.addListener(async msg => {
  try {
    switch (msg?.type) {
      case ContentScriptType.UpdateAdsRules:
        await updateRulesStorage();
        return;

      case E2eMessageType.ResetRequest:
        return clearAsyncStorages().then(() => ({ type: E2eMessageType.ResetResponse }));

      case ContentScriptType.ExternalLinksActivity:
        const trackedCashbackServiceDomain = getTrackedCashbackServiceDomain(msg.url);

        if (trackedCashbackServiceDomain) {
          await Analytics.client.track('External Cashback Links Activity', { domain: trackedCashbackServiceDomain });
        }

        const trackedUrl = getTrackedUrl(msg.url);

        if (trackedUrl) {
          const accountPkh = await getAdsViewerPkh();
          await Analytics.client.track('External links activity', { url: trackedUrl, accountPkh });
        }

        break;

      case ContentScriptType.ExternalAdsActivity: {
        const urlDomain = new URL(msg.url).hostname;
        const accountPkh = await getAdsViewerPkh();

        if (accountPkh) await postAdImpression(accountPkh, msg.provider, { urlDomain });
        else {
          const identity = await getStoredAppInstallIdentity();
          if (!identity) throw new Error('App identity not found');
          const installId = identity.publicKeyHash;
          await postAnonymousAdImpression(installId, urlDomain, msg.provider);
        }
        break;
      }

      case ContentScriptType.FetchReferralsRules: {
        return await getReferralsRules();
      }

      case ContentScriptType.FetchReferrals: {
        if (BACKGROUND_IS_WORKER) {
          const { buildTakeadsClient } = await importExtensionAdsReferralsModule();
          const takeads = buildTakeadsClient(EnvVars.TAKE_ADS_TOKEN);
          return await takeads.affiliateLinks(msg.links);
        }

        // Not requesting from BG page because of CORS.
        return await fetchReferralsAffiliateLinks(msg.links);
      }

      case ContentScriptType.ReferralClick: {
        const { urlDomain, pageDomain } = msg;
        const accountPkh = await getAdsViewerPkh();

        if (accountPkh) await postReferralClick(accountPkh, undefined, { urlDomain, pageDomain });
        else {
          const identity = await getStoredAppInstallIdentity();
          if (!identity) throw new Error('App identity not found');
          const installId = identity.publicKeyHash;
          await postReferralClick(undefined, installId, { urlDomain, pageDomain });
        }
        break;
      }
    }
  } catch (e) {
    console.error(e);
  }

  return;
});

async function getAdsViewerPkh() {
  const accountPkhFromStorage = await fetchFromStorage<string>(ADS_VIEWER_ADDRESS_STORAGE_KEY);

  if (accountPkhFromStorage) {
    return accountPkhFromStorage;
  }

  const frontState = await Actions.getFrontState();

  return (frontState.accounts[0] as StoredHDAccount | undefined)?.tezosAddress;
}

const getReferralsRules = memoizee(fetchReferralsRules, {
  promise: true,
  max: 1,
  maxAge: 5 * 60_000
});
