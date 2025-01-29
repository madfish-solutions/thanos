import axios from 'axios';

import { EVM_TOKEN_SLUG } from 'lib/assets/defaults';
import { ETHEREUM_MAINNET_CHAIN_ID, OTHER_COMMON_MAINNET_CHAIN_IDS } from 'lib/temple/types';
import { BasicChain } from 'temple/front/chains';
import { TempleChainKind } from 'temple/types';

const coingeckoApi = axios.create({ baseURL: 'https://api.coingecko.com/api/v3/' });

export function fetchTokenMarketInfo(assetSlug: string, chain: BasicChain) {
  const coingeckoAssetId =
    chain.kind === TempleChainKind.EVM
      ? COINGECKO_EVM_TOKENS_IDS[chain.chainId]?.[assetSlug]
      : COINGECKO_TEZOS_TOKENS_IDS[assetSlug];

  if (!coingeckoAssetId) throw new Error('Token not found');

  return coingeckoApi
    .get<MarketTokenRaw[]>('coins/markets', {
      params: {
        ids: coingeckoAssetId,
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: '100',
        page: '1',
        sparkline: false,
        price_change_percentage: '24h,7d'
      }
    })
    .then(({ data }) => data.at(0));
}

interface MarketTokenRaw {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number | null;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: Date;
  atl: number;
  atl_change_percentage: number;
  atl_date: Date;
  roi: Roi;
  last_updated: Date;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
}

interface Roi {
  times: number;
  currency: string;
  percentage: number;
}

const COINGECKO_TEZOS_TOKENS_IDS: StringRecord = {
  KT1A5P4ejnLix13jtadsfV9GCnXLMNnab8UT_0: 'kalamint',
  KT1AFA2mwNUMNd4SsujE1YYp29vd8BZejyKW_0: 'hic-et-nunc-dao',
  KT1BB1uMwVvJ1M3vVHXWALs1RWdgTp1rnXTR_0: 'moneyhero',
  KT1BHCumksALJQJ8q8to2EPigPW6qpyTr7Ng_0: 'crunchy-network',
  KT1CNyTPmBJ5hcqDPbPkFtoe76LifXyHUvqc_1: 'weth-plenty-bridge',
  KT1ErKVqEhG9jxXgUG2KGLW3bNM7zXHX8SDF_0: 'unobtanium-tezos',
  KT1F1mn2jbqQCJcsNgYKVAQjvenecNMY2oPK_0: 'pixelpotus',
  KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b_0: 'plenty-dao',
  KT1Ha4yFVeyzw6KRAdkzq6TxDHB97KG4pZe8_0: 'dogami',
  KT1JkoE42rrMBP9b2oDhbx6EUr26GcySZMUH_0: 'kolibri-dao',
  KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV_0: 'kolibri-usd',
  KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9_0: 'usdtez',
  KT1LRboPna9yQY9BrjtQYDS1DVxhKESK4VVd_0: 'wrap-governance-token',
  KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn_0: 'tzbtc',
  KT1PnUZCp3u2KzWr93pn4DD7HAJnm3rWVrgn_0: 'wrapped-tezos-2',
  KT1REEb5VxWRjcHm5GzDMwErMmNFftsE5Gpf_0: 'stableusd',
  KT1TgmD7kXQzofpuc9VbTRMdZCS2e6JDuTtc_0: 'upsorber',
  KT1UG6PdaKoJcc3yD6mkFVfxnS1uJeW3cGeX_1: 'wrapped-busd',
  KT1UsSfaXyqcjSVPeiD7U1bWgKy3taYN7NWY_1: 'wbtc-plenty-bridge',
  KT1VYsVfmobT7rsMVivvZ4J8i3bPiqz12NaH_0: 'wrapped-tezos',
  KT1VaEsVNiBoA56eToEK6n6BcPgh1tdx9eXi_0: 'temple-key',
  KT1XPFjZqCULSnqfKaaYy8hJjeY63UNSGwXg_0: 'crunchy-dao',
  KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW_0: 'youves-uusd',
  KT1XTxpQvo7oRCqp85LikEZgAZ22uDxhbWJv_0: 'gif-dao',
  KT1XnTn74bUtxHfDtBmm2bGZAQfhPbvKWR8o_0: 'tether',
  KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL_0: 'youves-you-governance',
  KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ_18: 'wrapped-usdt',
  KT193D4vozYnhGJQVtw7CoxxqphqUEEwK6Vb_0: 'quipuswap-governance-token'
};

const COINGECKO_EVM_TOKENS_IDS: Record<number, StringRecord> = {
  [ETHEREUM_MAINNET_CHAIN_ID]: {
    [EVM_TOKEN_SLUG]: 'ethereum',
    '0xdAC17F958D2ee523a2206206994597C13D831ec7_0': 'tether', // USDT
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48_0': 'usd-coin', // USDC
    '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599_0': 'wrapped-bitcoin' // wBTC
  },
  [OTHER_COMMON_MAINNET_CHAIN_IDS.polygon]: {
    [EVM_TOKEN_SLUG]: 'matic-network',
    '0x889b165212c8A813fc7Ef9a92ce0eeB9f9919E2B_0': 'tether', // USDT
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174_0': 'usd-coin', // USDC
    '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6_0': 'polygon-bridged-wbtc-polygon-pos' // wBTC
  },
  [OTHER_COMMON_MAINNET_CHAIN_IDS.optimism]: {
    [EVM_TOKEN_SLUG]: 'optimism',
    '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58_0': 'bridged-usdt', // USDT
    '0x7F5c764cBc14f9669B88837ca1490cCa17c31607_0': 'bridged-usd-coin-optimism', // USDC
    '0x68f180fcCe6836688e9084f035309E29Bf0A2095_0': 'optimism-bridged-wbtc-optimism' // wBTC
  },
  [OTHER_COMMON_MAINNET_CHAIN_IDS.arbitrum]: {
    [EVM_TOKEN_SLUG]: 'arbitrum',
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9_0': 'arbitrum-bridged-usdt-arbitrum', // USDT
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831_0': 'usd-coin', // USDC
    '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f_0': 'arbitrum-bridged-wbtc-arbitrum-one' // wBTC
  },
  [OTHER_COMMON_MAINNET_CHAIN_IDS.avalanche]: {
    [EVM_TOKEN_SLUG]: 'avalanche-2',
    '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7_0': 'tether', // USDT
    '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E_0': 'usd-coin' // USDC
  },
  [OTHER_COMMON_MAINNET_CHAIN_IDS.bsc]: {
    [EVM_TOKEN_SLUG]: 'binancecoin',
    '0x55d398326f99059fF775485246999027B3197955_0': 'binance-bridged-usdt-bnb-smart-chain', // USDT
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d_0': 'binance-bridged-usdc-bnb-smart-chain' // USDC
  },
  [OTHER_COMMON_MAINNET_CHAIN_IDS.base]: {
    [EVM_TOKEN_SLUG]: 'base',
    '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2_0': 'l2-standard-bridged-usdt-base', // USDT
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913_0': 'usd-coin' // USDC
  }
};
