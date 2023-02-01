import { AccountsDropdown } from './pages/drop-down-lists/accounts.drop-down';
import { HeaderPage } from './pages/header.page';
import { HomePage } from './pages/home.page';
import {
  ImportAccountTab,
  ImportAccountMnemonicTab,
  ImportAccountPrivateKeyTab,
  ImportAccountWatchOnlyTab
} from './pages/import-account.page';
import { ImportExistingWalletPage } from './pages/importing-existing-wallet.page';
import { NewSeedBackupPage } from './pages/new-seed-backup.page';
import { RevealSecretsPage } from './pages/reveal-secrets.page';
import { SettingsPage } from './pages/settings.page';
import { setWalletPage } from './pages/setWalletPassword.page';
import { VerifyMnemonicPage } from './pages/verify-mnemonic.page';
import { WelcomePage } from './pages/welcome.page';

export const Pages = {
  Welcome: new WelcomePage(),
  ImportExistingWallet: new ImportExistingWalletPage(),
  SetWallet: new setWalletPage(),
  Header: new HeaderPage(),
  AccountsDropdown: new AccountsDropdown(),
  Settings: new SettingsPage(),
  RevealSecrets: new RevealSecretsPage(),
  NewSeedBackup: new NewSeedBackupPage(),
  VerifyMnemonic: new VerifyMnemonicPage(),
  ImportAccountTab: new ImportAccountTab(),
  ImportAccountPrivateKey: new ImportAccountPrivateKeyTab(),
  ImportAccountMnemonic: new ImportAccountMnemonicTab(),
  ImportAccountWatchOnly: new ImportAccountWatchOnlyTab(),
  Home: new HomePage()
};
