import { v4 as uuid } from 'uuid';
import { EIP1193Provider } from 'viem';

import { TempleWeb3Provider } from 'temple/evm/web3-provider';

interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns?: string;
}

console.log('inpage templewallet');
const provider = new TempleWeb3Provider();

setGlobalProvider(provider);

const info: EIP6963ProviderInfo = {
  uuid: uuid(),
  name: 'Temple Wallet',
  icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1s\
bnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzlfMTc4KSI+CjxwYXRoIGQ9Ik01NS4zOTA0IDI0LjY\
yNUg2Ny42ODczTDYxLjUzMSAwSDE4LjQ2ODVMMjQuNjA5MSAyNC42MjVIMzYuOTIxNkw0My4wNzc5IDQ5LjIzNDRIMzUuMzkwNEwzOC40Njg1IDYxLjU0Nj\
lINDYuMTU2TDQ5LjIzNDEgNzMuODU5NEg2Ny42ODczTDU1LjM5MDQgMjQuNjI1WiIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzlfMTc4KSIvPgo8cGF0a\
CBkPSJNNjEuNTMxMyAzMC43ODFINTYuOTIxOUw1NS4zOTA2IDI0LjYyNDhINjcuNjg3NUw2MS41MzEzIDMwLjc4MVoiIGZpbGw9InVybCgjcGFpbnQxX2xp\
bmVhcl85XzE3OCkiLz4KPHBhdGggZD0iTTU1LjM5MDYgMTIuMzEyM0gyNy42ODc1TDI2LjkyMTkgOS4yMzQxM0g1Ny43MDMxTDU1LjM5MDYgMTIuMzEyM1o\
iIGZpbGw9InVybCgjcGFpbnQyX2xpbmVhcl85XzE3OCkiLz4KPHBhdGggZD0iTTE4LjQ2ODggMzAuNzgxMkwxMi4zMTI1IDYuMTU2MjVMMTguNDY4OCAwTD\
I0LjYwOTQgMjQuNjI1TDE4LjQ2ODggMzAuNzgxMloiIGZpbGw9InVybCgjcGFpbnQzX2xpbmVhcl85XzE3OCkiLz4KPHBhdGggZD0iTTQ2LjE1NjIgNjEuN\
TQ2NkgzOC40Njg3TDMyLjMxMjUgNjcuNzAyOUg0MEw0Ni4xNTYyIDYxLjU0NjZaIiBmaWxsPSJ1cmwoI3BhaW50NF9saW5lYXJfOV8xNzgpIi8+CjxwYXRo\
IGQ9Ik0zMC43NjU0IDMwLjc4MUgxOC40Njg1TDI0LjYwOTEgMjQuNjI0OEgzNi45MjE2TDMwLjc2NTQgMzAuNzgxWiIgZmlsbD0idXJsKCNwYWludDVfbGl\
uZWFyXzlfMTc4KSIvPgo8cGF0aCBkPSJNNDMuMDc4NCA0OS4yMzQxSDM1LjM5MDlMMzAuNzY1OSAzMC43ODFMMzYuOTIyMSAyNC42MjQ4TDQzLjA3ODQgND\
kuMjM0MVoiIGZpbGw9InVybCgjcGFpbnQ2X2xpbmVhcl85XzE3OCkiLz4KPHBhdGggZD0iTTM4LjQ2ODggNjEuNTQ3MUwzNS4zOTA2IDQ5LjIzNDZMMjkuM\
jM0NCA1NS4zOTA5TDMyLjMxMjUgNjcuNzAzNEwzOC40Njg4IDYxLjU0NzFaIiBmaWxsPSJ1cmwoI3BhaW50N19saW5lYXJfOV8xNzgpIi8+CjxwYXRoIGQ9\
Ik00OS4yMzQ0IDczLjg1OTFMNDYuMTU2MyA2MS41NDY2TDQwIDY3LjcwMjlMNDMuMDc4MSA3OS45OTk4TDQ5LjIzNDQgNzMuODU5MVoiIGZpbGw9InVybCg\
jcGFpbnQ4X2xpbmVhcl85XzE3OCkiLz4KPHBhdGggZD0iTTYxLjUzMTIgNzMuODU5NEw0Ny42ODc1IDE4LjQ2ODhMNDUuMjM0NCAyMC45MjE5TDU4LjQ2OD\
cgNzMuODU5NEw1NiA3Ni4zMTI1SDU5LjA3ODFMNjEuNTMxMiA3My44NTk0WiIgZmlsbD0idXJsKCNwYWludDlfbGluZWFyXzlfMTc4KSIvPgo8cGF0aCBkP\
SJNNjAgMTguNDY4NUg1Ni45MjE5TDU1LjM5MDYgMTIuMzEyM0w1Ny43MDMxIDkuMjM0MTNMNjAgMTguNDY4NVoiIGZpbGw9InVybCgjcGFpbnQxMF9saW5l\
YXJfOV8xNzgpIi8+CjxwYXRoIGQ9Ik02MS41MzE1IDczLjg1OTlMNTkuMDc4NCA3Ni4zMTNINTYuMDAwM0w1OC40NjkgNzMuODU5OUg0OS4yMzQ2TDQzLjA\
3ODQgODAuMDAwNUg2MS41MzE1TDY3LjY4NzggNzMuODU5OUg2MS41MzE1WiIgZmlsbD0idXJsKCNwYWludDExX2xpbmVhcl85XzE3OCkiLz4KPC9nPgo8ZG\
Vmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzlfMTc4IiB4MT0iMTguNDYxMyIgeTE9IjM2LjkyODYiIHgyPSI2Ny42OTIxIiB5Mj0iM\
zYuOTI4NiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBvZmZzZXQ9IjAuMDAxODgwNzkiIHN0b3AtY29sb3I9IiNGQ0MzM0MiLz4K\
PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkZFRTUwIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQxX2xpbmV\
hcl85XzE3OCIgeDE9IjY3LjY5MjMiIHkxPSIyNy42OTc2IiB4Mj0iNTUuMzg0NiIgeTI9IjI3LjY5NzYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVX\
NlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZCOTgyOCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGOTZDMTMiLz4KPC9saW5lYXJHcmFkaWVud\
D4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDJfbGluZWFyXzlfMTc4IiB4MT0iNTcuNjk2IiB5MT0iMTAuNzc0NSIgeDI9IjI2LjkyMzEiIHkyPSIxMC43\
NzQ1IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiNGODQyMDAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWN\
vbG9yPSIjRjk2QzEzIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQzX2xpbmVhcl85XzE3OCIgeDE9IjE0Ljg1MDIiIH\
kxPSIwLjkwNTk1MyIgeDI9IjIyLjA3MjkiIHkyPSIyOS44NzQ0IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9I\
iNGOTZDMTMiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkI5ODI4Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0i\
cGFpbnQ0X2xpbmVhcl85XzE3OCIgeDE9IjMyLjMwNzYiIHkxPSI2NC42MjA3IiB4Mj0iNDYuMTUzOSIgeTI9IjY0LjYyMDciIGdyYWRpZW50VW5pdHM9InV\
zZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0Y4NDIwMCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGOTZDMTMiLz4KPC9saW\
5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDVfbGluZWFyXzlfMTc4IiB4MT0iMTguNDYxMyIgeTE9IjI3LjY5NzYiIHgyPSIzNi45M\
jI4IiB5Mj0iMjcuNjk3NiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjRjg0MjAwIi8+CjxzdG9wIG9mZnNl\
dD0iMSIgc3RvcC1jb2xvcj0iI0Y5NkMxMyIvPgo8L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50Nl9saW5lYXJfOV8xNzgiIHg\
xPSIzOS40NTAzIiB5MT0iNTAuMTQwNCIgeDI9IjMzLjMxMiIgeTI9IjI1LjUyMTEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3\
RvcC1jb2xvcj0iI0Y5NkMxMyIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGQjk4MjgiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyY\
WRpZW50IGlkPSJwYWludDdfbGluZWFyXzlfMTc4IiB4MT0iMzUuOTIyOSIgeTE9IjY2Ljc5NjciIHgyPSIzMS43Njk0IiB5Mj0iNTAuMTM3OSIgZ3JhZGll\
bnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjRkI5ODI4Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0Y5NkM\
xMyIvPgo8L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50OF9saW5lYXJfOV8xNzgiIHgxPSI0Ni42OTIxIiB5MT0iNzkuMTAzOS\
IgeDI9IjQyLjUzODciIHkyPSI2Mi40NDUxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiNGOTZDMTMiLz4KP\
HN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkI5ODI4Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQ5X2xpbmVh\
cl85XzE3OCIgeDE9IjU5LjA3NTkiIHkxPSI3Ni4zMTIzIiB4Mj0iNDQuODMxMyIgeTI9IjE5LjE4MDQiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXN\
lIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0Y5NkMxMyIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGODQyMDAiLz4KPC9saW5lYXJHcmFkaWVudD\
4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDEwX2xpbmVhcl85XzE3OCIgeDE9IjU4Ljc4MzYiIHkxPSIxOS43NjY4IiB4Mj0iNTYuNDgxOSIgeTI9IjEwL\
jUzNTQiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0Y4NDIwMCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3At\
Y29sb3I9IiNGOTZDMTMiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDExX2xpbmVhcl85XzE3OCIgeDE9IjQ1LjY1ODQ\
iIHkxPSI3Ni45MjkxIiB4Mj0iNjQuMDQ1IiB5Mj0iNzYuOTI5MSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPS\
IjRjg0MjAwIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0Y5NkMxMyIvPgo8L2xpbmVhckdyYWRpZW50Pgo8Y2xpcFBhdGggaWQ9ImNsaXAwX\
zlfMTc4Ij4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSJ3aGl0ZSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPgo=',
  rdns: 'com.templewallet'
};

window.addEventListener('eip6963:requestProvider', announceProvider);

announceProvider();

function setGlobalProvider(providerInstance: EIP1193Provider) {
  (window as Record<string, any>).ethereum = providerInstance;
  window.dispatchEvent(new Event('ethereum#initialized'));
}

function announceProvider() {
  window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider', {
      detail: Object.freeze({ info, provider })
    })
  );
}
