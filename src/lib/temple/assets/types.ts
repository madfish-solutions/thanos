import type BigNumber from 'bignumber.js';

import { GAS_TOKEN_SLUG } from 'lib/temple/front';

export interface Token {
  contract: string;
  id?: BigNumber.Value;
}

export interface FA2Token extends Token {
  id: BigNumber.Value;
}

export type Asset = Token | typeof GAS_TOKEN_SLUG;

export type TokenStandard = 'fa1.2' | 'fa2';

export enum AssetTypesEnum {
  Collectibles = 'collectibles',
  Tokens = 'tokens'
}
