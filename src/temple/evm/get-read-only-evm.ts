import memoizee from 'memoizee';
import {
  Chain,
  FallbackTransport,
  HttpTransport,
  HttpTransportConfig,
  PublicClient,
  createPublicClient,
  fallback,
  http
} from 'viem';

import { MAX_MEMOIZED_TOOLKITS } from 'temple/misc';

/** See: https://viem.sh/docs/clients/transports/http */
const READ_ONLY_CLIENT_TRANSPORT_CONFIG: HttpTransportConfig = {
  /** Defaults to 3 */
  retryCount: 1,
  /** Defaults to 150 */
  retryDelay: 300
};

type HttpPublicClient<C extends Chain | undefined> = PublicClient<HttpTransport, C>;
type HttpFallbacksPublicClient<C extends Chain | undefined> = PublicClient<FallbackTransport<HttpTransport[]>, C>;

function getReadOnlyEvmBeforeMemo(rpcUrl: string, chain?: undefined): HttpPublicClient<undefined>;
function getReadOnlyEvmBeforeMemo(rpcUrl: string, chain: Chain): HttpPublicClient<Chain>;
function getReadOnlyEvmBeforeMemo(rpcUrls: string[], chain?: undefined): HttpFallbacksPublicClient<undefined>;
function getReadOnlyEvmBeforeMemo(rpcUrls: string[], chain: Chain): HttpFallbacksPublicClient<Chain>;
function getReadOnlyEvmBeforeMemo(
  rpcUrls: string | string[],
  chain?: Chain
): HttpPublicClient<Chain | undefined> | HttpFallbacksPublicClient<Chain | undefined> {
  if (typeof rpcUrls === 'string') {
    return createPublicClient({ transport: http(rpcUrls, READ_ONLY_CLIENT_TRANSPORT_CONFIG), chain });
  }

  return createPublicClient({
    transport: fallback(
      rpcUrls.map(url => http(url, READ_ONLY_CLIENT_TRANSPORT_CONFIG)),
      { key: rpcUrls.join() }
    ),
    chain
  });
}

export const getReadOnlyEvm = memoizee(getReadOnlyEvmBeforeMemo, {
  max: MAX_MEMOIZED_TOOLKITS,
  normalizer: args => JSON.stringify(args)
});
