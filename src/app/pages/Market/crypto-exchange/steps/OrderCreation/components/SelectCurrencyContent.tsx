import React, { FC, memo, useCallback, useLayoutEffect, useMemo, useState } from 'react';

import { useFormContext } from 'react-hook-form-v7';
import { useDebounce } from 'use-debounce';

import { FadeTransition } from 'app/a11y/FadeTransition';
import { Button } from 'app/atoms';
import { EmptyState } from 'app/atoms/EmptyState';
import { PageLoader } from 'app/atoms/Loader';
import { BackButton } from 'app/atoms/PageModal';
import { SimpleInfiniteScroll } from 'app/atoms/SimpleInfiniteScroll';
import { useSimplePaginationLogic } from 'app/hooks/use-simple-pagination-logic';
import {
  useAllExolixCurrenciesSelector,
  useExolixCurrenciesLoadingSelector,
  useExolixNetworksMapLoadingSelector,
  useExolixNetworksMapSelector
} from 'app/store/crypto-exchange/selectors';
import { StoredExolixCurrency } from 'app/store/crypto-exchange/state';
import { SearchBarField } from 'app/templates/SearchField';
import { t } from 'lib/i18n';
import { isSearchStringApplicable, searchAndFilterItems } from 'lib/utils/search-items';
import { useAccountAddressForEvm, useAccountAddressForTezos, useEnabledEvmChains } from 'temple/front';

import { ModalHeaderConfig } from '../../../../types';
import { CurrencyIcon } from '../../../components/CurrencyIcon';
import { TEZOS_EXOLIX_NETWORK_CODE } from '../../../config';
import { getCurrencyDisplayCode, isSameExolixCurrency } from '../../../utils';
import { CryptoExchangeFormData } from '../types';

const FULLPAGE_ITEMS_COUNT = 11;
const SCROLLABLE_ELEM_ID = 'SELECT_TOKEN_CONTENT_SCROLL';

export type SelectTokenContent = 'send' | 'get';

interface Props {
  content: SelectTokenContent;
  setModalHeaderConfig: SyncFn<ModalHeaderConfig>;
  onGoBack: EmptyFn;
}

export const SelectCurrencyContent: FC<Props> = ({ content, setModalHeaderConfig, onGoBack }) => {
  const [searchValue, setSearchValue] = useState('');
  const [searchValueDebounced] = useDebounce(searchValue, 300);

  const evmChains = useEnabledEvmChains();

  const evmAddress = useAccountAddressForEvm();
  const tezosAddress = useAccountAddressForTezos();

  const currenciesLoading = useExolixCurrenciesLoadingSelector();
  const networksMapLoading = useExolixNetworksMapLoadingSelector();
  const isLoading = currenciesLoading || networksMapLoading;

  const allCurrencies = useAllExolixCurrenciesSelector();
  const exolixNetworksMap = useExolixNetworksMapSelector();

  const { watch, setValue } = useFormContext<CryptoExchangeFormData>();

  const inputCurrency = watch('inputCurrency');
  const outputCurrency = watch('outputCurrency');

  useLayoutEffect(
    () => void setModalHeaderConfig({ title: t('selectToken'), titleLeft: <BackButton onClick={onGoBack} /> }),
    []
  );

  const enabledExolixNetworkCodes = useMemo(
    () => evmChains.map(({ chainId }) => exolixNetworksMap[chainId]),
    [evmChains, exolixNetworksMap]
  );

  const inputCurrencies = useMemo(
    () => allCurrencies.filter(currency => !isSameExolixCurrency(currency, outputCurrency)),
    [allCurrencies, outputCurrency]
  );

  const outputCurrencies = useMemo(
    () =>
      allCurrencies.filter(currency => {
        const networkCode = currency.network.code;

        const isInputCurrency = isSameExolixCurrency(currency, inputCurrency);
        const isTezosNetwork = Boolean(tezosAddress) && networkCode === TEZOS_EXOLIX_NETWORK_CODE;
        const isEnabledEvmNetwork = Boolean(evmAddress) && enabledExolixNetworkCodes.includes(networkCode);

        return !isInputCurrency && (isTezosNetwork || isEnabledEvmNetwork);
      }),
    [allCurrencies, enabledExolixNetworkCodes, evmAddress, inputCurrency, tezosAddress]
  );

  const displayCurrencies = useMemo(() => {
    const currencies = content === 'send' ? inputCurrencies : outputCurrencies;

    return isSearchStringApplicable(searchValueDebounced)
      ? searchAndFilterCurrencies(currencies, searchValueDebounced)
      : currencies;
  }, [content, inputCurrencies, outputCurrencies, searchValueDebounced]);

  const { paginatedItems, loadNext } = useSimplePaginationLogic(displayCurrencies, [], FULLPAGE_ITEMS_COUNT);

  const selectCurrency = useCallback(
    (currency: StoredExolixCurrency) => {
      setValue(content === 'send' ? 'inputCurrency' : 'outputCurrency', currency);
      onGoBack();
    },
    [content, onGoBack, setValue]
  );

  return (
    <FadeTransition>
      <div className="flex flex-col px-4 pt-4 pb-3">
        <SearchBarField value={searchValue} defaultRightMargin={false} onValueChange={setSearchValue} />
      </div>

      <div id={SCROLLABLE_ELEM_ID} className="px-4 pb-4 flex-1 flex flex-col overflow-y-auto">
        {isLoading ? (
          <PageLoader stretch />
        ) : displayCurrencies.length === 0 ? (
          <EmptyState stretch />
        ) : (
          <SimpleInfiniteScroll loadNext={loadNext} scrollableTargetId={SCROLLABLE_ELEM_ID}>
            {paginatedItems.map(currency => (
              <Item
                key={`${currency.code}_${currency.network.code}`}
                currency={currency}
                selectCurrency={selectCurrency}
              />
            ))}
          </SimpleInfiniteScroll>
        )}
      </div>
    </FadeTransition>
  );
};

interface ItemProps {
  currency: StoredExolixCurrency;
  selectCurrency: SyncFn<StoredExolixCurrency>;
}

const Item = memo<ItemProps>(({ currency, selectCurrency }) => {
  const select = useCallback(() => selectCurrency(currency), [currency, selectCurrency]);

  return (
    <Button
      className="w-full cursor-pointer flex justify-between items-center p-2 rounded-8 hover:bg-secondary-low"
      onClick={select}
    >
      <div className="flex items-center gap-x-1">
        <CurrencyIcon src={currency.icon} code={currency.code} />
        <div className="text-start gap-y-1">
          <p className="text-font-medium">{getCurrencyDisplayCode(currency.code)}</p>
          <p className="text-font-description text-grey-1 w-20 truncate">{currency.name}</p>
        </div>
      </div>
      <p className="text-end text-font-num-12 text-grey-1 w-40 truncate">{currency.network.fullName}</p>
    </Button>
  );
});

const searchAndFilterCurrencies = (currencies: StoredExolixCurrency[], searchValue: string) =>
  searchAndFilterItems(
    currencies,
    searchValue.trim(),
    [
      { name: 'name', weight: 1 },
      { name: 'code', weight: 1 },
      { name: 'networkName', weight: 0.75 }
    ],
    ({ name, code, network }) => ({
      name,
      code,
      networkName: network.fullName
    })
  );
