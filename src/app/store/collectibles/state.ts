import type { UserObjktCollectible } from 'lib/apis/objkt';
import { createEntity, LoadableEntityState } from 'lib/store';

export interface CollectibleDetails extends Pick<UserObjktCollectible, 'fa' | 'description' | 'mime'> {
  /** Cheepest listing */
  listing: null | CollectibleDetailsListing;
  /** Highest offer */
  objktArtifactUri: string;
  offers: UserObjktCollectible['offers_active'];
  creators: CollectibleDetailsCreator[];
  galleries: CollectibleDetailsGallery[];
}

interface CollectibleDetailsListing {
  /** In atoms */
  floorPrice: number;
  currencyId: number;
}

interface CollectibleDetailsCreator {
  address: string;
  tzDomain: string;
}

interface CollectibleDetailsGallery {
  title: string;
}

export type CollectibleDetailsRecord = Record<string, CollectibleDetails>;

export interface CollectiblesState {
  details: LoadableEntityState<CollectibleDetailsRecord>;
}

export const collectiblesInitialState: CollectiblesState = {
  details: createEntity({})
};
