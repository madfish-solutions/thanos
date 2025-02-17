import {
  ETHEREUM_MAINNET_CHAIN_ID,
  ETH_SEPOLIA_CHAIN_ID,
  TEZOS_MAINNET_CHAIN_ID,
  TempleTezosChainId
} from './temple/types';

export enum ContentScriptType {
  ExternalLinksActivity = 'ExternalLinksActivity',
  ExternalAdsActivity = 'ExternalAdsActivity',
  UpdateAdsRules = 'UpdateAdsRules',
  FetchReferralsRules = 'FetchReferralsRules',
  FetchReferrals = 'FetchReferrals',
  ReferralClick = 'ReferralClick'
}

export const APP_TITLE = 'Temple Wallet';

export const AD_CATEGORIES_PARAM_NAME = 'categories';

export const ORIGIN_SEARCH_PARAM_NAME = 'o';

export const ADS_META_SEARCH_PARAM_NAME = 'ads-meta';

export const WEBSITES_ANALYTICS_ENABLED = 'WEBSITES_ANALYTICS_ENABLED';

export const REPLACE_REFERRALS_ENABLED = 'REPLACE_REFERRALS_ENABLED';

/** @deprecated */
export const ACCOUNT_PKH_STORAGE_KEY = 'account_publickeyhash';

export const ADS_VIEWER_ADDRESS_STORAGE_KEY = 'ADS_VIEWER_ADDRESS';

/** @deprecated */
export const CUSTOM_NETWORKS_SNAPSHOT_STORAGE_KEY = 'custom_networks_snapshot';

export const CUSTOM_TEZOS_NETWORKS_STORAGE_KEY = 'CUSTOM_TEZOS_NETWORKS';

export const TEZOS_CHAINS_SPECS_STORAGE_KEY = 'TEZOS_CHAINS_SPECS';
export const EVM_CHAINS_SPECS_STORAGE_KEY = 'EVM_CHAINS_SPECS';

export const BLOCKCHAIN_EXPLORERS_OVERRIDES_STORAGE_KEY = 'BLOCKCHAIN_EXPLORERS_OVERRIDES';

export const ANALYTICS_USER_ID_STORAGE_KEY = 'analytics_user_id';

export const ALL_ADS_RULES_STORAGE_KEY = 'ALL_ADS_RULES';

export const ADS_RULES_UPDATE_INTERVAL = 5 * 60 * 1000;

export const AD_HIDING_TIMEOUT = 12 * 3600 * 1000;

export const AD_SEEN_THRESHOLD = 0.5;

export const HYPELAB_STUB_CAMPAIGN_SLUG = 'e55d2795d2';

export const RECENT_TERMS_VERSION = 1;

export const TERMS_WITH_REFERRALS_VERSION = 1;

export const TERMS_OF_USE_URL = 'https://www.templewallet.com/terms';

export const PRIVACY_POLICY_URL = 'https://www.templewallet.com/privacy';

export const OPEN_EXTENSION_TAB_ACTIONS_COUNTER_STORAGE_KEY = 'OPEN_EXTENSION_TAB_ACTIONS_COUNTER';

export const MAX_OPEN_EXTENSION_TAB_ACTIONS_COUNTER = 1;

export const MAX_SHOW_AGREEMENTS_COUNTER = 1;

const isMacOS = /Mac OS/.test(navigator.userAgent);
export const searchHotkey = ` (${isMacOS ? '⌘' : 'Ctrl + '}K)`;

export const ACCOUNT_ALREADY_EXISTS_ERR_MSG = 'Account already exists';

export const AT_LEAST_ONE_HD_ACCOUNT_ERR_MSG = 'At least one HD account should remain';

export const ACCOUNT_NAME_COLLISION_ERR_MSG = 'An account with the same name already exists in the group';

export const DEFAULT_TEZOS_DERIVATION_PATH = "m/44'/1729'/0'/0'";

export const DEFAULT_EVM_DERIVATION_PATH = "m/44'/60'/0'/0/0";

export const WALLETS_SPECS_STORAGE_KEY = 'WALLETS_SPECS';

export const ACCOUNT_EXISTS_SHOWN_WARNINGS_STORAGE_KEY = 'ACCOUNT_EXISTS_SHOWN_WARNINGS';

export const SHOULD_BACKUP_MNEMONIC_STORAGE_KEY = 'SHOULD_BACKUP_MNEMONIC';

export const AUTOLOCK_TIME_STORAGE_KEY = 'AUTOLOCK_TIME';

// Browser storage cannot set a value to Infinity
export const NEVER_AUTOLOCK_VALUE = Number.MAX_SAFE_INTEGER;

export const DEFAULT_SEED_PHRASE_WORDS_AMOUNT = 12;

export const DEFAULT_PASSWORD_INPUT_PLACEHOLDER = '••••••••••';

export const MAIN_CHAINS_IDS = [
  TEZOS_MAINNET_CHAIN_ID,
  ETHEREUM_MAINNET_CHAIN_ID,
  TempleTezosChainId.Ghostnet,
  ETH_SEPOLIA_CHAIN_ID
];

export const PASS_TO_BG_EVENT = 'templePassToBackground';

export const RESPONSE_FROM_BG_MSG_TYPE = 'templeResponseFromBackground';

export const DISCONNECT_DAPP_MSG_TYPE = 'templeDisconnectDApp';

export const SWITCH_CHAIN_MSG_TYPE = 'templeSwitchChain';

export const LIQUIDITY_BAKING_DEX_ADDRESS = 'KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5';

export const FEE_PER_GAS_UNIT = 0.1;
export const RECOMMENDED_ADD_TEZ_GAS_FEE = 0.00015;

export const THEME_COLOR_SEARCH_PARAM_NAME = 'tc';
export const FONT_SIZE_SEARCH_PARAM_NAME = 'fs';
export const LINE_HEIGHT_SEARCH_PARAM_NAME = 'lh';

export const SEND_ETH_GAS_LIMIT = BigInt(21000);

export const MAX_EVM_ALLOWANCE = BigInt(2) ** BigInt(256) - BigInt(1);
