type PublicKeyHash = HexString;

export type AssetSlugBalanceRecord = StringRecord;

export type ChainIdTokenSlugsBalancesRecord = Record<number, AssetSlugBalanceRecord>;

export type EvmBalancesAtomicRecord = Record<PublicKeyHash, ChainIdTokenSlugsBalancesRecord>;

export interface EvmBalancesStateInterface {
  balancesAtomic: EvmBalancesAtomicRecord;
}

export const EvmBalancesInitialState: EvmBalancesStateInterface = {
  balancesAtomic: {}
};
