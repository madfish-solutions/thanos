import { dispatch } from 'app/store';
import {
  loadAccountTokensActions,
  loadAccountCollectiblesActions,
  loadTokensWhitelistActions,
  setAssetsIsLoadingAction,
  addAccountTokensAction,
  addAccountCollectiblesAction
} from 'app/store/assets/actions';
import { useAreAssetsLoading } from 'app/store/assets/selectors';
import { loadAccountCollectibles, loadAccountTokens, mergeAssetsMetadata } from 'app/store/assets/utils';
import { putTokensBalancesAction } from 'app/store/balances/actions';
import { fixBalances } from 'app/store/balances/utils';
import { putCollectiblesMetadataAction } from 'app/store/collectibles-metadata/actions';
import { useAllCollectiblesMetadataSelector } from 'app/store/collectibles-metadata/selectors';
import { putTokensMetadataAction } from 'app/store/tokens-metadata/actions';
import { useAllTokensMetadataSelector } from 'app/store/tokens-metadata/selectors';
import { isKnownChainId } from 'lib/apis/tzkt';
import { ASSETS_SYNC_INTERVAL } from 'lib/fixed-times';
import { useDidMount, useInterval, useMemoWithCompare, useUpdatableRef } from 'lib/ui/hooks';
import { isTruthy } from 'lib/utils';
import { useAllTezosChains } from 'temple/front';

export const useAssetsLoading = (publicKeyHash: string) => {
  useDidMount(() => void dispatch(loadTokensWhitelistActions.submit()));

  const allTezosNetworks = useAllTezosChains();

  const networks = useMemoWithCompare(
    () =>
      Object.values(allTezosNetworks)
        .map(({ chainId, rpcBaseURL }) => (isKnownChainId(chainId) ? { chainId, rpcBaseURL } : null))
        .filter(isTruthy),
    [allTezosNetworks]
  );

  const allTokensMetadata = useAllTokensMetadataSelector();
  const allTokensMetadataRef = useUpdatableRef(allTokensMetadata);
  const allCollectiblesMetadata = useAllCollectiblesMetadataSelector();
  const allCollectiblesMetadataRef = useUpdatableRef(allCollectiblesMetadata);

  const tokensAreLoading = useAreAssetsLoading('tokens');

  // useInterval(
  //   () => {
  //     if (!tokensAreLoading) dispatch(loadAccountTokensActions.submit({ account: publicKeyHash, networks }));
  //   },
  //   ASSETS_SYNC_INTERVAL,
  //   [publicKeyHash, networks]
  // );

  useInterval(
    () => {
      if (tokensAreLoading) return;

      dispatch(setAssetsIsLoadingAction({ type: 'tokens', value: true, resetError: true }));

      const knownMetadata = mergeAssetsMetadata(allTokensMetadataRef.current, allCollectiblesMetadataRef.current);

      Promise.allSettled(
        networks.map(async network => {
          const chainId = network.chainId;

          const { slugs, balances, newMeta } = await loadAccountTokens(
            publicKeyHash,
            chainId,
            network.rpcBaseURL,
            knownMetadata
          );

          dispatch(addAccountTokensAction({ account: publicKeyHash, chainId, slugs }));
          dispatch(putTokensBalancesAction({ publicKeyHash, chainId, balances: fixBalances(balances) }));
          dispatch(putTokensMetadataAction({ records: newMeta }));
        })
      ).then(() => void dispatch(setAssetsIsLoadingAction({ type: 'tokens', value: false })));
    },
    [tokensAreLoading, publicKeyHash, networks],
    ASSETS_SYNC_INTERVAL
  );

  const collectiblesAreLoading = useAreAssetsLoading('collectibles');

  useInterval(
    () => {
      if (collectiblesAreLoading) return;

      dispatch(setAssetsIsLoadingAction({ type: 'collectibles', value: true, resetError: true }));

      const knownMetadata = mergeAssetsMetadata(allTokensMetadataRef.current, allCollectiblesMetadataRef.current);

      Promise.allSettled(
        networks.map(async network => {
          const chainId = network.chainId;

          const { slugs, balances, newMeta } = await loadAccountCollectibles(publicKeyHash, chainId, knownMetadata);

          dispatch(addAccountCollectiblesAction({ account: publicKeyHash, chainId, slugs }));
          dispatch(putTokensBalancesAction({ publicKeyHash, chainId, balances: fixBalances(balances) }));
          dispatch(putCollectiblesMetadataAction({ records: newMeta }));
        })
      ).then(() => void dispatch(setAssetsIsLoadingAction({ type: 'collectibles', value: false })));
    },
    [collectiblesAreLoading, publicKeyHash, networks],
    ASSETS_SYNC_INTERVAL
  );
};
