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
import { useAllCryptoCurrencies } from '../hooks/use-all-crypto-currencies';
import { TopUpOutputInterface } from '../topup.interface';

interface Props {
  setModalHeaderConfig: SyncFn<ModalHeaderConfig>;
  onGoBack: EmptyFn;
}

export const SelectToken: FC<Props> = ({ setModalHeaderConfig, onGoBack }) => {
  const [searchValue, setSearchValue] = useState('');
  const [searchValueDebounced] = useDebounce(searchValue, 300);
  const inSearch = isSearchStringApplicable(searchValueDebounced);

  const { setValue } = useFormContext<BuyWithCreditCardFormData>();

  const allCryptoCurrencies = useAllCryptoCurrencies();
  const currenciesLoading = useCurrenciesLoadingSelector();

  useLayoutEffect(
    () => void setModalHeaderConfig({ title: t('selectToken'), titleLeft: <BackButton onClick={onGoBack} /> }),
    [onGoBack, setModalHeaderConfig]
  );

  const searchedTokens = useMemo(
    () => (inSearch ? searchAndFilterTokens(allCryptoCurrencies, searchValueDebounced) : allCryptoCurrencies),
    [allCryptoCurrencies, inSearch, searchValueDebounced]
  );

  const onTokenSelect = useCallback(
    (token: TopUpOutputInterface) => {
      setValue('outputToken', token);
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
        ) : searchedTokens.length === 0 ? (
          <EmptyState stretch />
        ) : (
          <>
            {searchedTokens.map(token => (
              <Token key={token.code} token={token} onClick={onTokenSelect} />
            ))}
          </>
        )}
      </div>
    </>
  );
};

interface TokenProps {
  token: TopUpOutputInterface;
  onClick?: (currency: TopUpOutputInterface) => void;
}

export const Token: FC<TokenProps> = ({ token, onClick }) => {
  const handleClick = useCallback(() => onClick?.(token), [token, onClick]);

  return (
    <div
      className="w-full flex justify-start items-center cursor-pointer p-2 rounded-8 hover:bg-secondary-low"
      onClick={handleClick}
    >
      <div className="flex items-center gap-x-2 min-h-10">
        <AssetIcon src={token.icon} code={token.code} />

        <div className="flex flex-col">
          <span className="text-font-medium">{token.code}</span>

          <span className="text-font-description text-grey-1 w-40 truncate">{token.name}</span>
        </div>
      </div>

      <p className="text-end text-font-num-12 text-grey-1 w-40 truncate">{token.slug}</p>
    </div>
  );
};

const searchAndFilterTokens = (currencies: TopUpOutputInterface[], searchValue: string) =>
  searchAndFilterItems(currencies, searchValue.trim(), [
    { name: 'name', weight: 1 },
    { name: 'code', weight: 1 }
  ]);
