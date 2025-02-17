import { StoredExolixCurrency } from 'app/store/crypto-exchange/state';
import { t } from 'lib/i18n';

import { ModalHeaderConfig } from '../types';

export const EXOLIX_CONTACT_LINK = 'https://exolix.com/contact';

export const EXOLIX_TERMS_LINK = 'https://exolix.com/terms';
export const EXOLIX_PRIVICY_LINK = 'https://exolix.com/privacy';

export const TEZOS_EXOLIX_NETWORK_CODE = 'XTZ';

export const VALUE_PLACEHOLDER = '---';
export const EXOLIX_DECIMALS = 8;

export const INITIAL_INPUT_CURRENCY: StoredExolixCurrency = {
  code: 'ETH',
  name: 'Ethereum',
  icon: 'https://exolix.com/icons/coins/ETH.png',
  network: {
    code: 'ETH',
    fullName: 'Ethereum',
    shortName: null
  }
};

export const INITIAL_TEZOS_ACC_OUTPUT_CURRENCY: StoredExolixCurrency = {
  code: 'XTZ',
  name: 'Tezos',
  icon: 'https://exolix.com/icons/coins/XTZ.png',
  network: {
    code: 'XTZ',
    fullName: 'Tezos',
    shortName: null
  }
};

export const INITIAL_EVM_ACC_OUTPUT_CURRENCY: StoredExolixCurrency = {
  code: 'USDT',
  name: 'TetherUS',
  icon: 'https://exolix.com/icons/coins/USDT.png',
  network: {
    code: 'ETH',
    fullName: 'Ethereum',
    shortName: null
  }
};

export const defaultModalHeaderConfig: ModalHeaderConfig = {
  title: t('cryptoExchange'),
  titleLeft: undefined
};
