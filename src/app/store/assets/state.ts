import { createEntity, LoadableEntityState } from 'lib/store';

export type StoredAssetStatus = 'enabled' | 'disabled' | 'removed';

export interface StoredAsset {
  slug: string;
  chainId: string;
  /** PKH */
  account: string;
  /** Absent for 'idle' (disabled unless balance is positive) state */
  status?: StoredAssetStatus;
}

export type StoredToken = StoredAsset;

export type StoredCollectible = StoredAsset;

export interface SliceState {
  tokens: LoadableEntityState<StoredAsset[]>;
  collectibles: LoadableEntityState<StoredCollectible[]>;
  /** Mainnet tokens whitelist slugs */
  mainnetWhitelist: LoadableEntityState<string[]>;
}

export const initialState: SliceState = {
  tokens: createEntity([]),
  collectibles: createEntity([]),
  mainnetWhitelist: createEntity([])
};
