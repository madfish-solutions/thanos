export enum AdsProviderTitle {
  Optimal = 'Optimal',
  HypeLab = 'HypeLab',
  Persona = 'Persona',
  Temple = 'Temple Wallet',
  Bitmedia = 'Bitmedia'
}

export type AdsProviderName = keyof typeof AdsProviderTitle;
