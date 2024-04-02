import { useMemo } from 'react';

import { TEZOS_METADATA, FILM_METADATA } from 'lib/metadata/defaults';
import { TempleTezosChainId } from 'lib/temple/types';
import { useTezosChainIdLoadingValue, useTezosNetwork } from 'temple/front';

export { useAllAvailableTokens, useEnabledAccountTokensSlugs } from './tokens';
export { useAccountCollectibles, useEnabledAccountCollectiblesSlugs } from './collectibles';

const KNOWN_DCP_CHAIN_IDS: string[] = [TempleTezosChainId.Dcp, TempleTezosChainId.DcpTest];

export const useGasToken = (networkRpc?: string) => {
  const { rpcBaseURL, isDcp: isDefaultDcp } = useTezosNetwork();
  const suspense = Boolean(networkRpc) && networkRpc !== rpcBaseURL;
  const chainId = useTezosChainIdLoadingValue(networkRpc ?? rpcBaseURL, suspense);

  const isDcpNetwork = useMemo(
    () => (suspense ? KNOWN_DCP_CHAIN_IDS.includes(chainId!) : isDefaultDcp),
    [chainId, suspense, isDefaultDcp]
  );

  return useMemo(
    () =>
      isDcpNetwork
        ? {
            logo: 'misc/token-logos/film.png',
            symbol: 'ф',
            assetName: 'FILM',
            metadata: FILM_METADATA,
            isDcpNetwork: true
          }
        : {
            logo: 'misc/token-logos/tez.svg',
            symbol: 'ꜩ',
            assetName: 'tez',
            metadata: TEZOS_METADATA
          },
    [isDcpNetwork]
  );
};
