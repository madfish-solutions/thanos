import * as Passworder from 'lib/temple/passworder';
import { StoredAccount, StoredHDAccount, TempleAccountType, TempleContact, TempleSettings } from 'lib/temple/types';
import { TempleChainName } from 'temple/types';

import { generateCheck, fetchNewAccountName, mnemonicToTezosAccountCreds, mnemonicToEvmAccountCreds } from './misc';
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

    const newInitialAccount: Omit<StoredHDAccount, 'evmAddress'> = {
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
      fetchLegacySafe<StoredAccount[]>(accountsStrgKey),
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

  // [5] Extend accounts for EVM support
  async (password: string) => {
    console.log('VAULT.MIGRATIONS: EVM migration started');
    const passKey = await Passworder.generateKey(password);
    const accounts = await fetchAndDecryptOne<StoredAccount[]>(accountsStrgKey, passKey);
    const mnemonic = await fetchAndDecryptOne<string>(mnemonicStrgKey, passKey);

    const toEncryptAndSave: [string, any][] = [];
    for (const account of accounts) {
      // account.tezAddress = account.publicKeyHash;
      // delete account.publicKeyHash;
      if (account.type === TempleAccountType.HD) {
        const evmAcc = mnemonicToEvmAccountCreds(mnemonic, account.hdIndex);

        account.evmAddress = evmAcc.address;

        toEncryptAndSave.push([accPrivKeyStrgKey(evmAcc.address), evmAcc.privateKey]);
        toEncryptAndSave.push([accPubKeyStrgKey(evmAcc.address), evmAcc.publicKey]);
      } else if (account.type === TempleAccountType.WatchOnly) {
        account.chain = TempleChainName.Tezos;
      } else if (account.type === TempleAccountType.Imported) {
        account.chain = TempleChainName.Tezos;
      }
    }

    toEncryptAndSave.push([accountsStrgKey, accounts]);
    await encryptAndSaveMany(toEncryptAndSave, passKey);
    console.log('VAULT.MIGRATIONS: EVM migration finished');
  }

  // [6] Store Chain IDs
  // async (password: string) => {
  //   //
  // }
];
