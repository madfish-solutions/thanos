import { Activity, EvmActivity, TezosActivity } from 'lib/activity';
import { toChainAssetSlug, toEvmAssetSlug } from 'lib/assets/utils';
import { useEvmGenericAssetsMetadataCheck, useTezosGenericAssetsMetadataCheck } from 'lib/metadata';
import { useMemoWithCompare } from 'lib/ui/hooks';
import { TempleChainKind } from 'temple/types';

import { isTezosActivity } from './utils';

interface Config {
  activities: Activity[];
  tezAccountPkh?: string;
  evmAccountPkh?: HexString;
  mainAsset?: {
    chainKind: TempleChainKind;
    chainId: string | number;
    slug: string;
  };
}

export const useAssetsFromActivitiesCheck = ({ activities, tezAccountPkh, evmAccountPkh, mainAsset }: Config) => {
  const { tezosSlugs, evmSlugs } = useMemoWithCompare(() => {
    const tezosSlugs = new Set<string>();
    const evmSlugs = new Set<string>();

    activities.forEach(activity => {
      return isTezosActivity(activity)
        ? handleActivity<TezosActivity>(
            activity,
            op => op.assetSlug,
            slug => tezosSlugs.add(slug)
          )
        : handleActivity<EvmActivity>(
            activity,
            op => {
              const assetBase = op.asset;

              return assetBase?.contract ? toEvmAssetSlug(assetBase.contract, assetBase.tokenId) : undefined;
            },
            slug => evmSlugs.add(slug)
          );
    });

    if (mainAsset) {
      const { chainKind, chainId, slug: assetSlug } = mainAsset;
      (chainKind === TempleChainKind.EVM ? evmSlugs : tezosSlugs).add(toChainAssetSlug(chainKind, chainId, assetSlug));
    }

    return { tezosSlugs: Array.from(tezosSlugs), evmSlugs: Array.from(evmSlugs) };
  }, [activities, mainAsset]);
  useTezosGenericAssetsMetadataCheck(tezosSlugs, tezAccountPkh);
  useEvmGenericAssetsMetadataCheck(evmSlugs, evmAccountPkh);
};

const handleActivity = <T extends Activity>(
  activity: T,
  getAssetSlug: (operation: T['operations'][0]) => string | undefined,
  onChainAssetSlug: SyncFn<string>
) => {
  const toThisChainAssetSlug = (assetSlug: string) =>
    toChainAssetSlug(
      isTezosActivity(activity) ? TempleChainKind.Tezos : TempleChainKind.EVM,
      activity.chainId,
      assetSlug
    );

  const { operationsCount, operations } = activity;
  if (operationsCount === 1) {
    const operation = operations.at(0);
    const assetSlug = getAssetSlug(operation as T['operations'][0]);

    if (assetSlug) {
      onChainAssetSlug(toThisChainAssetSlug(assetSlug));
    }
  } else {
    operations.forEach(op => {
      const assetSlug = getAssetSlug(op);

      if (assetSlug) {
        onChainAssetSlug(toThisChainAssetSlug(assetSlug));
      }
    });
  }
};
