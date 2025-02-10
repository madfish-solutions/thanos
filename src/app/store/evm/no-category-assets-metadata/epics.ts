import { isEqual } from 'lodash';
import { Action } from 'redux';
import { combineEpics, Epic } from 'redux-observable';
import { EMPTY, forkJoin, from, of } from 'rxjs';
import { bufferTime, concatMap, exhaustMap, map, mergeMap, withLatestFrom } from 'rxjs/operators';
import { ofType, toPayload } from 'ts-action-operators';

import { RootState } from 'app/store/root-state.type';
import { fromAssetSlug } from 'lib/assets';
import { fetchEvmAssetMetadataFromChain } from 'lib/evm/on-chain/metadata';
import { EvmRpcRequestsExecutor } from 'lib/evm/on-chain/utils/evm-rpc-requests-executor';

import {
  loadNoCategoryEvmAssetsMetadataActions,
  refreshNoCategoryEvmAssetsMetadataActions,
  AssetsMetadataInput
} from './actions';
import { NoCategoryAssetMetadata } from './state';

interface GetEvmAssetMetadataPayload {
  rpcUrl: string;
  chainId: number;
  assetSlug: string;
}

class GetEvmAssetMetadataExecutor extends EvmRpcRequestsExecutor<
  GetEvmAssetMetadataPayload,
  NoCategoryAssetMetadata | undefined,
  string
> {
  constructor() {
    super(3);
  }

  protected getRequestsPoolKey(payload: GetEvmAssetMetadataPayload) {
    return payload.rpcUrl;
  }

  protected requestsAreSame(a: GetEvmAssetMetadataPayload, b: GetEvmAssetMetadataPayload) {
    return isEqual(a, b);
  }

  protected async getResult(payload: GetEvmAssetMetadataPayload) {
    console.log('evm fetch', { payload, ts: Date.now() });
    return fetchEvmAssetMetadataFromChain({ chainId: payload.chainId, rpcBaseURL: payload.rpcUrl }, payload.assetSlug);
  }
}

const getEvmAssetMetadataExecutor = new GetEvmAssetMetadataExecutor();

const getAssetsMetadata$ = (rpcUrl: string, chainId: number, slugs: string[]) => {
  return slugs.length === 0
    ? of<AssetsMetadataInput>({})
    : from(slugs).pipe(
        mergeMap(assetSlug =>
          from(
            getEvmAssetMetadataExecutor
              .executeRequest({ rpcUrl, chainId, assetSlug })
              .then(res => [chainId, assetSlug, res] as const)
              .catch(() => [chainId, assetSlug, undefined] as const)
          )
        ),
        bufferTime(1000),
        map(results =>
          results.reduce<AssetsMetadataInput>((acc, [chainId, assetSlug, metadata]) => {
            if (!metadata) {
              return acc;
            }

            acc[chainId] = acc[chainId] || {};
            acc[chainId][assetSlug] = metadata;

            return acc;
          }, {})
        )
      );
};

const loadNoCategoryAssetsMetadataEpic: Epic = action$ =>
  action$.pipe(
    ofType(loadNoCategoryEvmAssetsMetadataActions.submit),
    toPayload(),
    mergeMap(({ rpcUrl, chainId, associatedAccountPkh, slugs }) => {
      console.log('evm load 1', { rpcUrl, chainId, associatedAccountPkh, slugs, ts: Date.now() });

      return getAssetsMetadata$(rpcUrl, chainId, slugs).pipe(
        concatMap(records => forkJoin([of(records), from(getEvmAssetMetadataExecutor.allPoolsAreEmpty())])),
        concatMap(([records, poolsAreEmpty]) => {
          if (Object.keys(records).length === 0 && !poolsAreEmpty) {
            return EMPTY;
          }

          console.log('evm load 2', { records, associatedAccountPkh, poolsAreEmpty, ts: Date.now() });

          return of(loadNoCategoryEvmAssetsMetadataActions.success({ records, associatedAccountPkh, poolsAreEmpty }));
        })
      );
    })
  );

const refreshAllAssetsMetadataEpic: Epic<Action, Action, RootState> = (action$, state$) =>
  action$.pipe(
    ofType(refreshNoCategoryEvmAssetsMetadataActions.submit),
    toPayload(),
    withLatestFrom(state$),
    exhaustMap(([{ rpcUrls, associatedAccountPkh }, { evmNoCategoryAssetMetadata }]) => {
      const { contractsChainIds, accountToAssetAssociations } = evmNoCategoryAssetMetadata;
      const slugs = accountToAssetAssociations[associatedAccountPkh] || [];
      console.log('evm refresh 1', { slugs, associatedAccountPkh, ts: Date.now() });

      const slugsByChainIds = slugs.reduce<Record<number, string[]>>((acc, slug) => {
        const [address] = fromAssetSlug(slug);
        const chainId = contractsChainIds[address];
        if (rpcUrls[chainId]) {
          acc[chainId] = acc[chainId] || [];
          acc[chainId].push(slug);
        }

        return acc;
      }, {});

      return Object.keys(slugsByChainIds).length === 0
        ? EMPTY
        : from(Object.entries(slugsByChainIds)).pipe(
            mergeMap(([chainId, slugs]) => getAssetsMetadata$(rpcUrls[Number(chainId)], Number(chainId), slugs))
          );
    }),
    concatMap(results => forkJoin([of(results), from(getEvmAssetMetadataExecutor.allPoolsAreEmpty())])),
    concatMap(([records, poolsAreEmpty]) => {
      if (Object.keys(records).length === 0 && !poolsAreEmpty) {
        return EMPTY;
      }

      console.log('evm refresh 2', { records, poolsAreEmpty, ts: Date.now() });

      return of(
        refreshNoCategoryEvmAssetsMetadataActions.success({
          records,
          poolsAreEmpty
        })
      );
    })
  );

export const evmNoCategoryAssetsMetadataEpics = combineEpics(
  loadNoCategoryAssetsMetadataEpic,
  refreshAllAssetsMetadataEpic
);
