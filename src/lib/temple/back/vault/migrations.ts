import { nanoid } from 'nanoid';

import {
  ADS_VIEWER_TEZOS_ADDRESS_STORAGE_KEY,
  CURRENT_TEZOS_NETWORK_ID_STORAGE_KEY,
  CUSTOM_TEZOS_NETWORKS_STORAGE_KEY,
  ACCOUNT_PKH_STORAGE_KEY,
  NETWORK_ID_STORAGE_KEY,
  CUSTOM_NETWORKS_SNAPSHOT_STORAGE_KEY
} from 'lib/constants';
import { moveValueInStorage, fetchFromStorage, putToStorage, removeFromStorage } from 'lib/storage';
import * as Passworder from 'lib/temple/passworder';
import { StoredAccount, TempleAccountType, TempleContact, TempleSettings } from 'lib/temple/types';
import { isTruthy } from 'lib/utils';
import { StoredTezosNetwork, isTezosTestnetChainId } from 'temple/networks';
import { loadTezosChainId } from 'temple/tezos';
import { TempleChainName } from 'temple/types';

import {
  generateCheck,
  fetchNewAccountName,
  mnemonicToTezosAccountCreds,
  mnemonicToEvmAccountCreds,
  buildEncryptAndSaveManyForAccount
} from './misc';
import {
  encryptAndSaveMany,
  encryptAndSaveManyLegacy,
  fetchAndDecryptOne,
  fetchAndDecryptOneLegacy,
  getPlain,
  removeManyLegacy
} from './safe-storage';
import {
  checkStrgKey,
  mnemonicStrgKey,
  accPrivKeyStrgKey,
  accPubKeyStrgKey,
  accountsStrgKey,
  settingsStrgKey
} from './storage-keys';

export const MIGRATIONS = [
  // [1] Fix derivation
  async (password: string) => {
    const passKey = await Passworder.generateKeyLegacy(password);

    const [mnemonic, accounts] = await Promise.all([
      fetchAndDecryptOneLegacy<string>(mnemonicStrgKey, passKey),
      fetchAndDecryptOneLegacy<StoredAccount[]>(accountsStrgKey, passKey)
    ]);
    const migratedAccounts = accounts.map(acc =>
      acc.type === TempleAccountType.HD
        ? {
            ...acc,
            type: TempleAccountType.Imported
          }
        : acc
    );

    const hdAccIndex = 0;
    const tezosAcc = await mnemonicToTezosAccountCreds(mnemonic, hdAccIndex);

    const newInitialAccount: LegacyTypes.TempleAccount = {
      type: TempleAccountType.HD,
      name: await fetchNewAccountName(accounts),
      publicKeyHash: tezosAcc.publicKey,
      hdIndex: hdAccIndex
    };
    const newAccounts = [newInitialAccount, ...migratedAccounts];

    await encryptAndSaveManyLegacy(
      [
        [accPrivKeyStrgKey(tezosAcc.address), tezosAcc.privateKey],
        [accPubKeyStrgKey(tezosAcc.address), tezosAcc.publicKey],
        [accountsStrgKey, newAccounts]
      ],
      passKey
    );
  },

  // [2] Add hdIndex prop to HD Accounts
  async (password: string) => {
    const passKey = await Passworder.generateKeyLegacy(password);
    const accounts = await fetchAndDecryptOneLegacy<StoredAccount[]>(accountsStrgKey, passKey);

    let hdAccIndex = 0;
    const newAccounts = accounts.map(acc =>
      acc.type === TempleAccountType.HD ? { ...acc, hdIndex: hdAccIndex++ } : acc
    );

    await encryptAndSaveManyLegacy([[accountsStrgKey, newAccounts]], passKey);
  },

  // [3] Improve token managing flow
  // Migrate from tokens{netId}: TempleToken[] + hiddenTokens{netId}: TempleToken[]
  // to tokens{chainId}: TempleToken[]
  async () => {
    // The code base for this migration has been removed
    // because it is no longer needed,
    // but this migration is required for version compatibility.
  },

  // [4] Improve crypto security
  // Migrate legacy crypto storage
  // New crypto updates:
  // - Use password hash in memory when unlocked(instead of plain password)
  // - Wrap storage keys in sha256(instead of plain)
  // - Concat storage values to bytes(instead of json)
  // - Increase PBKDF rounds
  async (password: string) => {
    const legacyPassKey = await Passworder.generateKeyLegacy(password);

    const fetchLegacySafe = async <T>(storageKey: string) => {
      try {
        return await fetchAndDecryptOneLegacy<T>(storageKey, legacyPassKey);
      } catch {
        return undefined;
      }
    };

    const [mnemonic, accounts, settings] = await Promise.all([
      fetchLegacySafe<string>(mnemonicStrgKey),
      fetchLegacySafe<LegacyTypes.TempleAccount[]>(accountsStrgKey),
      fetchLegacySafe<TempleSettings>(settingsStrgKey)
    ]);

    // Address book contacts migration
    const contacts = await getPlain<TempleContact[]>('contacts');

    const accountsStrgKeys = accounts!
      .map(acc => [accPrivKeyStrgKey(acc.publicKeyHash), accPubKeyStrgKey(acc.publicKeyHash)])
      .flat();

    const accountsStrgValues = await Promise.all(accountsStrgKeys.map(fetchLegacySafe));

    const toSave = [
      [checkStrgKey, generateCheck()],
      [mnemonicStrgKey, mnemonic],
      [accountsStrgKey, accounts],
      [settingsStrgKey, { ...settings, contacts }],
      ...accountsStrgKeys.map((key, i) => [key, accountsStrgValues[i]])
    ].filter(([_key, value]) => value !== undefined) as [string, any][];

    // Save new storage items
    const passKey = await Passworder.generateKey(password);
    await encryptAndSaveMany(toSave, passKey);

    // Remove old
    await removeManyLegacy([...toSave.map(([key]) => key), 'contacts']);
  },

  // [5] Extend data formats for EVM support
  async (password: string) => {
    console.log('VAULT.MIGRATIONS: EVM migration started');
    const passKey = await Passworder.generateKey(password);

    /* ACCOUNTS */

    const accounts = await fetchAndDecryptOne<LegacyTypes.TempleAccount[]>(accountsStrgKey, passKey);
    const mnemonic = await fetchAndDecryptOne<string>(mnemonicStrgKey, passKey);

    const toEncryptAndSave: [string, any][] = [];

    const newAccounts = accounts.map<StoredAccount>(account => {
      const tezosAddress = account.publicKeyHash;
      const id = nanoid();

      switch (account.type) {
        case TempleAccountType.HD:
          const evmAcc = mnemonicToEvmAccountCreds(mnemonic, account.hdIndex);
          toEncryptAndSave.push(...buildEncryptAndSaveManyForAccount(evmAcc));

          return { ...account, id, tezosAddress, evmAddress: evmAcc.address };
        case TempleAccountType.Imported:
          return { ...account, id, address: tezosAddress, chain: TempleChainName.Tezos };
        case TempleAccountType.WatchOnly:
          return { ...account, id, address: tezosAddress, chain: TempleChainName.Tezos };
        case TempleAccountType.Ledger:
          return { ...account, id, tezosAddress };
        case TempleAccountType.ManagedKT:
          return { ...account, id, tezosAddress };
      }

      return account;
    });

    toEncryptAndSave.push([accountsStrgKey, newAccounts]);

    moveValueInStorage(ACCOUNT_PKH_STORAGE_KEY, ADS_VIEWER_TEZOS_ADDRESS_STORAGE_KEY);

    /* NETWORKS */

    const settings = await fetchAndDecryptOne<TempleSettings>(settingsStrgKey, passKey).catch(() => null);

    if (settings) {
      settings.customTezosNetworks = settings.customNetworks;
      delete settings.customNetworks;
      toEncryptAndSave.push([settingsStrgKey, settings]);
    }

    moveValueInStorage(NETWORK_ID_STORAGE_KEY, CURRENT_TEZOS_NETWORK_ID_STORAGE_KEY);

    // Taking a chance to migrate the list of manually-added user's Tezos networks (with chain IDs).
    // (!) Internet connection would have be available during this.
    fetchFromStorage<Omit<StoredTezosNetwork, 'chain'>[]>(CUSTOM_NETWORKS_SNAPSHOT_STORAGE_KEY).then(
      async customTezosNetworks => {
        if (!customTezosNetworks) return;

        const migratedNetworks: StoredTezosNetwork[] = await Promise.all(
          customTezosNetworks.map(network =>
            loadTezosChainId(network.rpcBaseURL, 30_000)
              .then(chainId => {
                const testnet = isTezosTestnetChainId(chainId) ? true : undefined;

                delete network.type;
                return { ...network, chain: TempleChainName.Tezos as const, chainId, testnet };
              })
              .catch(err => {
                console.error(err);
                return null;
              })
          )
        ).then(migratedNetworks => migratedNetworks.filter(isTruthy));

        removeFromStorage(CUSTOM_NETWORKS_SNAPSHOT_STORAGE_KEY);

        if (migratedNetworks.length)
          putToStorage<StoredTezosNetwork[]>(CUSTOM_TEZOS_NETWORKS_STORAGE_KEY, migratedNetworks);
      }
    );

    await encryptAndSaveMany(toEncryptAndSave, passKey);

    console.log('VAULT.MIGRATIONS: EVM migration finished');
  }
];

namespace LegacyTypes {
  export type TempleAccount =
    | TempleHDAccount
    | TempleImportedAccount
    | TempleLedgerAccount
    | TempleManagedKTAccount
    | TempleWatchOnlyAccount;

  interface TempleLedgerAccount extends TempleAccountBase {
    type: TempleAccountType.Ledger;
    derivationPath: string;
  }

  interface TempleImportedAccount extends TempleAccountBase {
    type: TempleAccountType.Imported;
  }

  interface TempleHDAccount extends TempleAccountBase {
    type: TempleAccountType.HD;
    hdIndex: number;
  }

  interface TempleManagedKTAccount extends TempleAccountBase {
    type: TempleAccountType.ManagedKT;
    chainId: string;
    owner: string;
  }

  interface TempleWatchOnlyAccount extends TempleAccountBase {
    type: TempleAccountType.WatchOnly;
    chainId?: string;
  }

  interface TempleAccountBase {
    type: TempleAccountType;
    name: string;
    publicKeyHash: string;
    hdIndex?: number;
    derivationPath?: string;
    derivationType?: 0 | 1 | 2 | 3;
  }
}
