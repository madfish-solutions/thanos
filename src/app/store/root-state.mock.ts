import { mockNotificationsState } from 'lib/notifications';

import { mockABTestingState } from './ab-testing/state.mock';
import { mockAdvertisingState } from './advertising/state.mock';
import { mockAssetsFilterOptionsState } from './assets-filter-options/state.mock';
import { mockBuyWithCreditCardState } from './buy-with-credit-card/state.mock';
import { mockCryptoExchangeState } from './crypto-exchange/state.mock';
import { mockCurrencyState } from './currency/state.mock';
import { mockDAppsState } from './d-apps/state.mock';
import { mockEvmAssetsState } from './evm/assets/state.mock';
import { mockEvmBalancesState } from './evm/balances/state.mock';
import { mockEvmCollectiblesMetadataState } from './evm/collectibles-metadata/state.mock';
import { mockNoCategoryEvmAssetsMetadataState } from './evm/no-category-assets-metadata/state.mock';
import { mockEvmLoadingState } from './evm/state.mock';
import { mockEvmTokensExchangeRatesState } from './evm/tokens-exchange-rates/state.mock';
import { mockEvmTokensMetadataState } from './evm/tokens-metadata/state.mock';
import { mockNewsletterState } from './newsletter/newsletter-state.mock';
import { mockPartnersPromotionState } from './partners-promotion/state.mock';
import { mockRewardsState } from './rewards/state.mock';
import type { RootState } from './root-state.type';
import { mockSettingsState } from './settings/state.mock';
import { mockSwapState } from './swap/state.mock';
import { mockAssetsState } from './tezos/assets/state.mock';
import { mockBalancesState } from './tezos/balances/state.mock';
import { mockCollectiblesState } from './tezos/collectibles/state.mock';
import { mockCollectiblesMetadataState } from './tezos/collectibles-metadata/state.mock';
import { mockNoCategoryTezosAssetsMetadataState } from './tezos/no-category-assets-metadata/state.mock';
import { mockTokensMetadataState } from './tezos/tokens-metadata/state.mock';

// ts-prune-ignore-next
export const mockRootState: RootState = {
  settings: mockSettingsState,
  advertising: mockAdvertisingState,
  currency: mockCurrencyState,
  notifications: mockNotificationsState,
  dApps: mockDAppsState,
  swap: mockSwapState,
  partnersPromotion: mockPartnersPromotionState,
  balances: mockBalancesState,
  assets: mockAssetsState,
  tokensMetadata: mockTokensMetadataState,
  collectiblesMetadata: mockCollectiblesMetadataState,
  noCategoryAssetMetadata: mockNoCategoryTezosAssetsMetadataState,
  abTesting: mockABTestingState,
  cryptoExchange: mockCryptoExchangeState,
  buyWithCreditCard: mockBuyWithCreditCardState,
  collectibles: mockCollectiblesState,
  newsletter: mockNewsletterState,
  rewards: mockRewardsState,
  evmLoading: mockEvmLoadingState,
  evmAssets: mockEvmAssetsState,
  evmBalances: mockEvmBalancesState,
  evmTokensMetadata: mockEvmTokensMetadataState,
  evmCollectiblesMetadata: mockEvmCollectiblesMetadataState,
  evmTokensExchangeRates: mockEvmTokensExchangeRatesState,
  evmNoCategoryAssetMetadata: mockNoCategoryEvmAssetsMetadataState,
  assetsFilterOptions: mockAssetsFilterOptionsState
};
