import React, { FC, useCallback, useLayoutEffect, useMemo, useState } from 'react';

import { useFormContext } from 'react-hook-form-v7';
import { useDebounce } from 'use-debounce';

import { EmptyState } from 'app/atoms/EmptyState';
import { PageLoader } from 'app/atoms/Loader';
import { BackButton } from 'app/atoms/PageModal';
import { useCurrenciesLoadingSelector } from 'app/store/buy-with-credit-card/selectors';
import { SearchBarField } from 'app/templates/SearchField';
import { t } from 'lib/i18n';
import { isSearchStringApplicable, searchAndFilterItems } from 'lib/utils/search-items';

import { ModalHeaderConfig } from '../../types';
import { AssetIcon } from '../components/AssetIcon';
import { BuyWithCreditCardFormData } from '../form-data.interface';
import { useAllFiatCurrencies } from '../hooks/use-all-fiat-currencies';
import { TopUpInputInterface } from '../topup.interface';

interface Props {
  setModalHeaderConfig: SyncFn<ModalHeaderConfig>;
  onGoBack: EmptyFn;
}

export const SelectCurrency: FC<Props> = ({ setModalHeaderConfig, onGoBack }) => {
  const [searchValue, setSearchValue] = useState('');
  const [searchValueDebounced] = useDebounce(searchValue, 300);
  const inSearch = isSearchStringApplicable(searchValueDebounced);

  const { watch, setValue } = useFormContext<BuyWithCreditCardFormData>();

  const inputCurrency = watch('inputCurrency');
  const outputToken = watch('outputToken');

  const { fiatCurrenciesWithPairLimits: allFiatCurrencies } = useAllFiatCurrencies(
    inputCurrency.code,
    outputToken.code
  );

  const currenciesLoading = useCurrenciesLoadingSelector();

  useLayoutEffect(
    () => void setModalHeaderConfig({ title: t('selectCurrency'), titleLeft: <BackButton onClick={onGoBack} /> }),
    [onGoBack, setModalHeaderConfig]
  );

  const searchedCurrencies = useMemo(
    () => (inSearch ? searchAndFilterCurrencies(allFiatCurrencies, searchValueDebounced) : allFiatCurrencies),
    [allFiatCurrencies, inSearch, searchValueDebounced]
  );

  const onCurrencySelect = useCallback(
    (currency: TopUpInputInterface) => {
      setValue('inputCurrency', currency);
      onGoBack();
    },
    [setValue, onGoBack]
  );

  return (
    <>
      <div className="p-4">
        <SearchBarField value={searchValue} defaultRightMargin={false} onValueChange={setSearchValue} className="p-4" />
      </div>

      <div className="px-4 pb-1 flex-grow flex flex-col overflow-y-auto">
        {currenciesLoading ? (
          <PageLoader stretch />
        ) : searchedCurrencies.length === 0 ? (
          <EmptyState stretch />
        ) : (
          <>
            {searchedCurrencies.map(currency => (
              <Currency key={currency.code} currency={currency} onClick={onCurrencySelect} />
            ))}
          </>
        )}
      </div>
    </>
  );
};

interface CurrencyProps {
  currency: TopUpInputInterface;
  iconSize?: number;
  onClick?: (currency: TopUpInputInterface) => void;
}

export const Currency: FC<CurrencyProps> = ({ currency, iconSize = 24, onClick }) => {
  const handleClick = useCallback(() => onClick?.(currency), [currency, onClick]);

  return (
    <div
      className="w-full flex justify-start items-center cursor-pointer p-2 rounded-8 hover:bg-secondary-low"
      onClick={handleClick}
    >
      <div className="flex items-center gap-x-2 min-h-10">
        <div className="w-9 h-9 flex justify-center items-center rounded-full bg-grey-4">
          <AssetIcon useFlagIcon size={iconSize} src={currency.icon} code={currency.code} />
        </div>

        <div className="flex flex-col">
          <span className="text-font-medium">{currency.code}</span>

          <span className="text-font-description text-grey-1 w-40 truncate">{currency.name}</span>
        </div>
      </div>
    </div>
  );
};

const searchAndFilterCurrencies = (currencies: TopUpInputInterface[], searchValue: string) =>
  searchAndFilterItems(currencies, searchValue.trim(), [
    { name: 'name', weight: 1 },
    { name: 'code', weight: 1 }
  ]);
