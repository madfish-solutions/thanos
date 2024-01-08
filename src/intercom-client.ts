import { IntercomClient } from 'lib/intercom/client';

let intercom: IntercomClient;
export function getIntercom() {
  if (!intercom) {
    intercom = new IntercomClient();
  }
  return intercom;
}
