import { api } from './base';
import { buildQuery } from './build-query';

export const bakingBadGetBaker = buildQuery<BakingBadGetBakerParams, BakingBadGetBakerResponse>(
  api,
  'GET',
  ({ address }) => `/bakers/${address}`,
  []
);

const bakingBadGetKnownBakers = buildQuery<BakingBadGetBakersParams, BakingBadBaker[]>(api, 'GET', '/bakers', [
  'status',
  'staking',
  'delegation'
]);

export async function getAllBakersBakingBad() {
  return bakingBadGetKnownBakers({
    status: 'active',
    delegation: true
  });
}

type BakerStatus = 'active' | 'closed' | 'not_responding';

interface BakingBadGetBakersParams {
  status?: BakerStatus;
  staking?: boolean;
  delegation?: boolean;
}

interface BakingBadGetBakerParams {
  address: string;
}

interface BakerFeature {
  title: string;
  content: string;
}

export interface BakingBadBaker {
  address: string;
  name: string;
  status: BakerStatus;
  balance: number;
  features: BakerFeature[];
  delegation: {
    enabled: boolean;
    minBalance: number;
    fee: number;
    capacity: number;
    freeSpace: number;
    estimatedApy: number;
    features: BakerFeature[];
  };
  staking: {
    enabled: boolean;
    minBalance: number;
    fee: number;
    capacity: number;
    freeSpace: number;
    estimatedApy: number;
    features: BakerFeature[];
  };
}

type BakingBadGetBakerResponse = BakingBadBaker | null;
