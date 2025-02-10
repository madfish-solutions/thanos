import { Epic, combineEpics } from 'redux-observable';
import { EMPTY, catchError, forkJoin, from, merge, mergeMap, of, switchMap } from 'rxjs';
import { ofType } from 'ts-action-operators';

import { RequestAlreadyPendingError } from 'lib/evm/on-chain/utils/evm-rpc-requests-executor';

import { setEvmBalancesLoadingState } from '../actions';

import { loadEvmBalanceOnChainActions } from './actions';
import { evmOnChainBalancesRequestsExecutor } from './utils';

const loadEvmBalanceOnChainEpic: Epic = action$ =>
  action$.pipe(
    ofType(loadEvmBalanceOnChainActions.submit),
    mergeMap(({ payload }) => {
      const { network, assetSlug, account } = payload;

      return from(evmOnChainBalancesRequestsExecutor.executeRequest(payload)).pipe(
        switchMap(balance =>
          forkJoin([Promise.resolve(balance), evmOnChainBalancesRequestsExecutor.poolIsEmpty(network.chainId)])
        ),
        switchMap(([balance, queueIsEmpty]) => {
          const updateBalanceObservable = of(
            loadEvmBalanceOnChainActions.success({ network, assetSlug, account, balance })
          );

          return queueIsEmpty
            ? merge(
                updateBalanceObservable,
                of(setEvmBalancesLoadingState({ chainId: network.chainId, isLoading: false }))
              )
            : updateBalanceObservable;
        }),
        catchError(error =>
          error instanceof RequestAlreadyPendingError ? EMPTY : of(loadEvmBalanceOnChainActions.fail(error.message))
        )
      );
    })
  );

export const evmBalancesEpics = combineEpics(loadEvmBalanceOnChainEpic);
