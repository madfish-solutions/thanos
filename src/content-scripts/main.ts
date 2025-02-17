import type { AccountInfo } from '@airgap/beacon-types/dist/esm';
import { TemplePageMessage, TemplePageMessageType } from '@temple-wallet/dapp/dist/types';
import browser from 'webextension-polyfill';

import {
  APP_TITLE,
  ContentScriptType,
  DISCONNECT_DAPP_MSG_TYPE,
  PASS_TO_BG_EVENT,
  RESPONSE_FROM_BG_MSG_TYPE,
  SWITCH_CHAIN_MSG_TYPE,
  WEBSITES_ANALYTICS_ENABLED
} from 'lib/constants';
import { serealizeError } from 'lib/intercom/helpers';
import { TempleMessageType, TempleNotification, TempleResponse } from 'lib/temple/types';
import type { PassToBgEventDetail } from 'temple/evm/web3-provider';
import { TempleChainKind } from 'temple/types';

import { getIntercom } from '../intercom-client';

const TRACK_URL_CHANGE_INTERVAL = 5000;

enum BeaconMessageTarget {
  Page = 'toPage',
  Extension = 'toExtension'
}

type BeaconMessage =
  | {
      target: BeaconMessageTarget;
      payload: any;
    }
  | {
      target: BeaconMessageTarget;
      encryptedPayload: any;
    };
type BeaconPageMessage = BeaconMessage | { message: BeaconMessage; sender: { id: string } };

// Prevents the script from running in an Iframe
if (window.frameElement === null) {
  browser.storage.local.get(WEBSITES_ANALYTICS_ENABLED).then(storage => {
    if (storage[WEBSITES_ANALYTICS_ENABLED]) {
      let oldHref = '';

      const trackUrlChange = () => {
        let newHref: string;
        try {
          newHref = window.parent.location.href;
        } catch {
          newHref = window.location.href;
        }
        if (oldHref !== newHref) {
          oldHref = newHref;

          browser.runtime.sendMessage({
            type: ContentScriptType.ExternalLinksActivity,
            url: newHref
          });
        }
      };

      trackUrlChange();

      // Track url changes without page reload
      setInterval(trackUrlChange, TRACK_URL_CHANGE_INTERVAL);
    }
  });
}

const SENDER = {
  id: browser.runtime.id,
  name: APP_TITLE,
  iconUrl: 'https://templewallet.com/logo.png'
};

getIntercom().subscribe((msg?: TempleNotification) => {
  switch (msg?.type) {
    case TempleMessageType.TempleEvmDAppsDisconnected:
      const { origins } = msg;

      if (origins.some(origin => window.origin === origin)) {
        window.postMessage({ type: DISCONNECT_DAPP_MSG_TYPE }, window.origin);
      }
      break;
    case TempleMessageType.TempleTezosDAppsDisconnected:
      const { messagePayloads } = msg;

      if (messagePayloads[window.origin]) {
        const message = {
          target: BeaconMessageTarget.Page,
          encryptedPayload: messagePayloads[window.origin]
        };
        send({ message, sender: { id: SENDER.id } }, window.origin);
      }
      break;
    case TempleMessageType.TempleEvmChainSwitched:
      const { origin, type, ...chainSwitchPayload } = msg;
      if (origin === window.origin) {
        window.postMessage({ type: SWITCH_CHAIN_MSG_TYPE, ...chainSwitchPayload }, window.origin);
      }
  }
});

window.addEventListener(PASS_TO_BG_EVENT, evt => {
  const { origin, args: payload, chainId, iconUrl, requestId } = (evt as CustomEvent<PassToBgEventDetail>).detail;
  getIntercom()
    .request({
      type: TempleMessageType.PageRequest,
      origin,
      iconUrl,
      payload,
      chainId,
      chainType: TempleChainKind.EVM
    })
    .then((res: TempleResponse) => {
      if (res?.type === TempleMessageType.PageResponse && res.payload) {
        window.postMessage({ type: RESPONSE_FROM_BG_MSG_TYPE, payload: res.payload, requestId }, window.origin);
      }
    })
    .catch(err => console.error(err));
});

window.addEventListener(
  'message',
  evt => {
    if (evt.source !== window) return;

    const isTempleRequest = evt.data?.type === TemplePageMessageType.Request;
    const isBeaconRequest =
      evt.data?.target === BeaconMessageTarget.Extension && (evt.data?.targetId === SENDER.id || !evt.data?.targetId);

    if (isTempleRequest) {
      templeRequest(evt);
    } else if (isBeaconRequest) {
      beaconRequest(evt);
    } else {
      return;
    }
  },
  false
);

function templeRequest(evt: MessageEvent) {
  const { payload, reqId } = evt.data as TemplePageMessage;

  getIntercom()
    .request({
      type: TempleMessageType.PageRequest,
      origin: evt.origin,
      payload
    })
    .then((res: TempleResponse) => {
      if (res?.type === TempleMessageType.PageResponse) {
        send(
          {
            type: TemplePageMessageType.Response,
            payload: res.payload,
            reqId
          },
          evt.origin
        );
      }
    })
    .catch(err => {
      send(
        {
          type: TemplePageMessageType.ErrorResponse,
          payload: serealizeError(err),
          reqId
        },
        evt.origin
      );
    });
}

function beaconRequest(evt: MessageEvent) {
  const { origin, data } = evt;
  const encrypted = Boolean(data.encryptedPayload);
  getIntercom()
    .request({
      type: TempleMessageType.PageRequest,
      origin: origin,
      payload: data.encryptedPayload ?? data.payload,
      beacon: true,
      encrypted: Boolean(data.encryptedPayload)
    })
    .then((res: TempleResponse) => {
      if (res?.type === TempleMessageType.PageResponse && res.payload) {
        const message = {
          target: BeaconMessageTarget.Page,
          ...(res.encrypted ? { encryptedPayload: res.payload } : { payload: res.payload })
        };
        send(
          res.payload === 'pong'
            ? { ...message, sender: SENDER }
            : {
                message,
                sender: { id: SENDER.id }
              },
          origin
        );
      }
    })
    .catch(err => console.error(err));

  getIntercom()
    .request({
      type: TempleMessageType.Acknowledge,
      origin: origin,
      payload: data.encryptedPayload ?? data.payload,
      beacon: true,
      encrypted: encrypted
    })
    .then((res: TempleResponse) => {
      if (res?.type === TempleMessageType.Acknowledge) {
        const acknowledgeMessage = {
          target: BeaconMessageTarget.Page,
          ...(res.encrypted ? { encryptedPayload: res.payload } : { payload: res.payload })
        };
        send(
          {
            message: acknowledgeMessage,
            sender: { id: SENDER.id }
          },
          origin
        );
      }
    })
    .catch(err => console.error(err));
}

function send(msg: TemplePageMessage | BeaconPageMessage, targetOrigin: string) {
  if (!targetOrigin || targetOrigin === '*') return;
  window.postMessage(msg, targetOrigin);
}

const TRACK_BEACON_DISCONNECTION_INTERVAL = 5000;
function beaconIsConnected() {
  try {
    const activeAccountId = localStorage.getItem('beacon:active-account');
    const accounts: AccountInfo[] = JSON.parse(localStorage.getItem('beacon:accounts') || '[]');

    if (!Array.isArray(accounts)) return false;

    const account = accounts.find(acc => acc.accountIdentifier === activeAccountId);

    return account?.origin?.id === browser.runtime.id;
  } catch (e) {
    return false;
  }
}

let beaconWasConnected = beaconIsConnected();
setInterval(async () => {
  const isConnected = beaconIsConnected();
  if (!isConnected && beaconWasConnected) {
    beaconRequest(
      new MessageEvent('message', {
        data: {
          // {"type":"disconnect"} in base58 encoding
          payload: 'rYiNcfGAJNzHCNK4eUj1VPy1xAWiwkXfRN',
          target: BeaconMessageTarget.Extension,
          targetId: SENDER.id
        },
        origin: window.location.origin
      })
    );
  }
  beaconWasConnected = isConnected;
}, TRACK_BEACON_DISCONNECTION_INTERVAL);
