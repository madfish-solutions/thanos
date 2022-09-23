import React, { FC, useMemo } from 'react';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { persistor, store } from 'app/store/store';
import { CustomRpsContext } from 'lib/analytics';
import { FiatCurrencyProvider } from 'lib/fiat-curency';
import { PropsWithChildren } from 'lib/props-with-children';

import { TokensMetadataProvider } from './assets';
import { NewBlockTriggersProvider } from './chain';
import { TempleClientProvider, useTempleClient } from './client';
import { FungibleTokensBalancesProvider } from './fungible-tokens-balances';
import { NonFungibleTokensBalancesProvider } from './non-fungible-tokens-balances';
import { ReadyTempleProvider, useNetwork } from './ready';
import { SyncTokensProvider } from './sync-tokens';
import { USDPriceProvider } from './usdprice';

export const TempleProvider: FC<PropsWithChildren> = ({ children }) => (
  <CustomRpsContext.Provider value={undefined}>
    <TempleClientProvider>
      <ConditionalReadyTemple>{children}</ConditionalReadyTemple>
    </TempleClientProvider>
  </CustomRpsContext.Provider>
);

const ConditionalReadyTemple: FC<PropsWithChildren> = ({ children }) => {
  const { ready } = useTempleClient();

  return useMemo(
    () =>
      ready ? (
        <ReadyTempleProvider>
          <WalletRpcProvider>
            <Provider store={store}>
              <PersistGate persistor={persistor} loading={null}>
                <TokensMetadataProvider>
                  <USDPriceProvider>
                    <FiatCurrencyProvider>
                      <FungibleTokensBalancesProvider>
                        <NonFungibleTokensBalancesProvider>
                          <SyncTokensProvider>
                            <NewBlockTriggersProvider>{children}</NewBlockTriggersProvider>
                          </SyncTokensProvider>
                        </NonFungibleTokensBalancesProvider>
                      </FungibleTokensBalancesProvider>
                    </FiatCurrencyProvider>
                  </USDPriceProvider>
                </TokensMetadataProvider>
              </PersistGate>
            </Provider>
          </WalletRpcProvider>
        </ReadyTempleProvider>
      ) : (
        <>{children}</>
      ),
    [children, ready]
  );
};

const WalletRpcProvider: FC<PropsWithChildren> = ({ children }) => {
  const network = useNetwork();

  return <CustomRpsContext.Provider value={network.rpcBaseURL}>{children}</CustomRpsContext.Provider>;
};
