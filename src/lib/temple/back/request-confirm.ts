import { identity } from 'lodash';
import browser, { Runtime } from 'webextension-polyfill';

import { TempleDAppPayload, TempleMessageType, TempleRequest } from 'lib/temple/types';

import { intercom } from './defaults';

export interface RequestConfirmParams<T extends TempleDAppPayload> {
  id: string;
  payload: T;
  onDecline: () => void;
  transformPayload?: (payload: T) => Promise<T>;
  handleIntercomRequest: (req: TempleRequest, decline: () => void) => Promise<any>;
}

const CONFIRM_WINDOW_WIDTH = 384;
const CONFIRM_WINDOW_HEIGHT = 600;
const AUTODECLINE_AFTER = 120_000;

export async function requestConfirm<T extends TempleDAppPayload>({
  id,
  payload,
  onDecline,
  transformPayload = identity,
  handleIntercomRequest
}: RequestConfirmParams<T>) {
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;

    try {
      stopTimeout();
      stopRequestListening();
      stopWinRemovedListening();

      await closeWindow();
    } catch (_err) {}
  };

  const declineAndClose = () => {
    onDecline();
    close();
  };

  let knownPort: Runtime.Port | undefined;
  const stopRequestListening = intercom.onRequest(async (req: TempleRequest, port) => {
    if (req?.type === TempleMessageType.DAppGetPayloadRequest && req.id === id) {
      knownPort = port;

      return {
        type: TempleMessageType.DAppGetPayloadResponse,
        payload: await transformPayload(payload)
      };
    } else {
      if (knownPort !== port) return;

      const result = await handleIntercomRequest(req, onDecline);
      if (result) {
        close();
        return result;
      }
    }
  });

  const confirmWin = await createConfirmationWindow(id);

  const closeWindow = async () => {
    if (confirmWin.id) {
      const win = await browser.windows.get(confirmWin.id);
      if (win.id) {
        await browser.windows.remove(win.id);
      }
    }
  };

  const handleWinRemoved = (winId: number) => {
    if (winId === confirmWin?.id) {
      declineAndClose();
    }
  };
  browser.windows.onRemoved.addListener(handleWinRemoved);
  const stopWinRemovedListening = () => browser.windows.onRemoved.removeListener(handleWinRemoved);

  // Decline after timeout
  const t = setTimeout(declineAndClose, AUTODECLINE_AFTER);
  const stopTimeout = () => clearTimeout(t);
}

async function createConfirmationWindow(confirmationId: string) {
  const isWin = (await browser.runtime.getPlatformInfo()).os === 'win';

  const height = isWin ? CONFIRM_WINDOW_HEIGHT + 17 : CONFIRM_WINDOW_HEIGHT;
  const width = isWin ? CONFIRM_WINDOW_WIDTH + 16 : CONFIRM_WINDOW_WIDTH;

  const [top, left] = (await getCenterPositionForWindow(width, height)) || [];

  const options: browser.Windows.CreateCreateDataType = {
    type: 'popup',
    url: browser.runtime.getURL(`confirm.html#?id=${confirmationId}`),
    width,
    height
  };

  try {
    /* Trying, because must have 50% of window in a viewport. Otherwise, error thrown. */
    const confirmWin = await browser.windows.create({ ...options, top, left });

    // Firefox currently ignores left/top for create, but it works for update
    if (left != null && confirmWin.id && confirmWin.state !== 'fullscreen' && confirmWin.left !== left)
      await browser.windows.update(confirmWin.id, { left, top }).catch(() => void 0);

    return confirmWin;
  } catch {
    return await browser.windows.create(options);
  }
}

/** Position window in the center of lastFocused window */
async function getCenterPositionForWindow(width: number, height: number): Promise<[number, number] | undefined> {
  const lastFocused = await browser.windows.getLastFocused().catch(() => void 0);

  if (lastFocused == null || lastFocused.width == null) return;

  const top = Math.round(lastFocused.top! + lastFocused.height! / 2 - height / 2);
  const left = Math.round(lastFocused.left! + lastFocused.width! / 2 - width / 2);

  return [top, left];
}
