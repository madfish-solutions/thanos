import { useMemo } from 'react';

import { useChainId, useNetwork, useAccount, useAccountPkh } from 'lib/temple/front/ready';
import { TempleAccountType, TempleChainId, NewTempleAccountBase } from 'lib/temple/types';

// @ts-expect-error
// ts-prune-ignore-next
interface TezosNetwork {
  rpcUrl: string;
  chainId: string;
  isMainnet: boolean;
}

export const useTezosNetwork = () => {
  const chainId = useChainId(true)!;
  const { rpcBaseURL: rpcUrl } = useNetwork();

  return useMemo(
    () => ({
      rpcUrl,
      chainId,
      isMainnet: chainId === TempleChainId.Mainnet,
      isDcp: chainId === TempleChainId.Dcp || chainId === TempleChainId.DcpTest
    }),
    [rpcUrl, chainId]
  );
};

// @ts-expect-error
// ts-prune-ignore-next
interface TezosAccount extends NewTempleAccountBase {
  //
}

export const useTezosAccount = () => {
  const { publicKeyHash: address, type, derivationPath, name } = useAccount();

  return useMemo(
    () => ({
      address,
      type,
      isWatchOnly: type === TempleAccountType.WatchOnly,
      derivationPath,
      title: name
    }),
    [address, type, name, derivationPath]
  );
};

export const useTezosAccountAddress = () => useAccountPkh();
