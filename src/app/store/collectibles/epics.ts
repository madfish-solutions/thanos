import { combineEpics, Epic } from 'redux-observable';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { Action } from 'ts-action';
import { ofType, toPayload } from 'ts-action-operators';

import { fetchObjktCollectibles$ } from 'lib/apis/objkt';
import { ADULT_CONTENT_TAGS } from 'lib/apis/objkt/adult-tags';
import { toTokenSlug } from 'lib/assets';
import { isTruthy } from 'lib/utils';

import { loadCollectiblesDetailsActions } from './actions';
import { CollectibleDetailsRecord } from './state';

const checkForAdult = (tag: string) => ADULT_CONTENT_TAGS.includes(tag);

const loadCollectiblesDetailsEpic: Epic = (action$: Observable<Action>) =>
  action$.pipe(
    ofType(loadCollectiblesDetailsActions.submit),
    toPayload(),
    switchMap(slugs =>
      fetchObjktCollectibles$(slugs).pipe(
        map(data => {
          const entries = data.token
            .map(({ fa_contract, token_id, listings_active, tags, attributes }) => {
              const cheepestListing = listings_active[0];
              const listing = cheepestListing && {
                floorPrice: cheepestListing.price,
                currencyId: cheepestListing.currency_id
              };

              const isAdultAttributes = attributes.some(({ attribute }) => attribute.name === '__nsfw_');
              const isAdultTag = tags.some(({ tag }) => checkForAdult(tag.name));

              const isAdultContent = isAdultAttributes || isAdultTag;

              return [
                toTokenSlug(fa_contract, token_id),
                {
                  listing,
                  isAdultContent
                }
              ] as const;
            })
            .filter(isTruthy);

          const details: CollectibleDetailsRecord = Object.fromEntries(entries);

          return loadCollectiblesDetailsActions.success(details);
        }),
        catchError((error: unknown) =>
          of(loadCollectiblesDetailsActions.fail(error instanceof Error ? error.message : 'Unknown error'))
        )
      )
    )
  );

export const collectiblesEpics = combineEpics(loadCollectiblesDetailsEpic);
