import { TempleMessageType } from 'lib/temple/types';

import { getIntercom } from './intercom-client';

enum AuthEventType {
  AuthRequest = 'authrequest',
  AuthAck = 'authack'
}

window.addEventListener('message', async (e: MessageEvent) => {
  try {
    if (e.data?.type === AuthEventType.AuthRequest) {
      await getIntercom().request({
        type: TempleMessageType.GoogleAuthTokenReceivedRequest,
        authToken: e.data.content
      });
      window.postMessage({ type: AuthEventType.AuthAck }, '*');
    }
  } catch (error) {
    console.error(error);
  }
});
