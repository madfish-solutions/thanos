import { chunk } from 'lodash';
import { Action } from 'redux';
import { combineEpics, Epic } from 'redux-observable';
import { forkJoin, from, of } from 'rxjs';
import { catchError, concatMap, exhaustMap, map, withLatestFrom } from 'rxjs/operators';
import { ofType, toPayload } from 'ts-action-operators';

import { RootState } from 'app/store/root-state.type';
import { METADATA_API_LOAD_CHUNK_SIZE } from 'lib/apis/temple';
import { fromAssetSlug } from 'lib/assets';
import { FetchedMetadataRecord, loadTokensMetadata } from 'lib/metadata/fetch';

import {
  putNoCategoryAssetsMetadataAction,
  loadNoCategoryTezosAssetsMetadataAction,
  setNoCategoryAssetsMetadataLoadingAction,
  refreshNoCategoryTezosAssetsMetadataActions
} from './actions';

const loadNoCategoryAssetsMetadataEpic: Epic = action$ =>
  action$.pipe(
    ofType(loadNoCategoryTezosAssetsMetadataAction),
    toPayload(),
    concatMap(({ rpcUrl, chainId, associatedAccountPkh, slugs }) => {
      console.log('tez load 1', { rpcUrl, chainId, associatedAccountPkh, slugs });

      return from(loadTokensMetadata(rpcUrl, slugs)).pipe(
        map(records => {
          console.log('tez load 2', { records, chainId, associatedAccountPkh });

          return putNoCategoryAssetsMetadataAction({ records, chainId, associatedAccountPkh, resetLoading: true });
        }),
        catchError(() => of(setNoCategoryAssetsMetadataLoadingAction(false)))
      );
    })
  );

const refreshAllAssetsMetadataEpic: Epic<Action, Action, RootState> = (action$, state$) =>
  action$.pipe(
    ofType(refreshNoCategoryTezosAssetsMetadataActions.submit),
    toPayload(),
    withLatestFrom(state$),
    exhaustMap(([{ rpcUrls, associatedAccountPkh }, { noCategoryAssetMetadata }]) => {
      const { contractsChainIds, accountToAssetAssociations } = noCategoryAssetMetadata;
      const slugs = accountToAssetAssociations[associatedAccountPkh] || [];
      console.log('tez refresh 1', { slugs, associatedAccountPkh });

      const slugsByRpcUrls = slugs.reduce<StringRecord<string[]>>((acc, slug) => {
        const [address] = fromAssetSlug(slug);
        const rpcUrl = rpcUrls[contractsChainIds[address]];
        if (rpcUrl) {
          acc[rpcUrl] = acc[rpcUrl] || [];
          acc[rpcUrl].push(slug);
        }

        return acc;
      }, {});

      return Object.keys(slugsByRpcUrls).length === 0
        ? of([])
        : forkJoin(
            Object.entries(slugsByRpcUrls).map(([rpcUrl, slugs]) =>
              forkJoin(
                chunk(slugs, METADATA_API_LOAD_CHUNK_SIZE).map(slugsChunk =>
                  loadTokensMetadata(rpcUrl, slugsChunk)
                    .then(data => ({ data }))
                    .catch(e => ({ e }))
                )
              )
            )
          );
    }),
    map(results => {
      const flattenedResults = results.flat();
      console.log('tez refresh 2', { results });

      if (flattenedResults.every((r): r is { e: any } => 'e' in r) && flattenedResults.length) {
        return refreshNoCategoryTezosAssetsMetadataActions.fail(flattenedResults[0].e);
      }

      return refreshNoCategoryTezosAssetsMetadataActions.success(
        flattenedResults
          .filter((r): r is { data: FetchedMetadataRecord } => 'data' in r)
          .reduce<FetchedMetadataRecord>((acc, { data }) => Object.assign(acc, data), {})
      );
    }),
    catchError(err => of(refreshNoCategoryTezosAssetsMetadataActions.fail(err)))
  );

export const tezosNoCategoryAssetsMetadataEpics = combineEpics(
  loadNoCategoryAssetsMetadataEpic,
  refreshAllAssetsMetadataEpic
);
