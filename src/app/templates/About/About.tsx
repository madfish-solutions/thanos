import React, { FC, useCallback, useState } from 'react';

import { FormSecondaryButton } from 'app/atoms';
import { Anchor } from 'app/atoms/Anchor';
import Logo from 'app/atoms/Logo';
import SubTitle from 'app/atoms/SubTitle';
import {
  getGoogleAuthTokenWithBrowserAPI,
  getGoogleAuthTokenWithProxyWebsite,
  readGoogleDriveFile,
  writeGoogleDriveFile
} from 'lib/apis/google';
import { EnvVars } from 'lib/env';
import { TID, T } from 'lib/i18n';
import { backupFileName, EncryptedBackupObject, getSeedPhrase, toEncryptedBackup } from 'lib/temple/backup';
import { useTempleClient } from 'lib/temple/front';

import { AboutSelectors } from './About.selectors';

const LINKS: {
  key: TID;
  link: string;
  testID: string;
}[] = [
  {
    key: 'website',
    link: 'https://templewallet.com',
    testID: AboutSelectors.websiteLink
  },
  {
    key: 'repo',
    link: 'https://github.com/madfish-solutions/templewallet-extension',
    testID: AboutSelectors.repoLink
  },
  {
    key: 'privacyPolicy',
    link: 'https://templewallet.com/privacy',
    testID: AboutSelectors.privacyPolicyLink
  },
  {
    key: 'termsOfUse',
    link: 'https://templewallet.com/terms',
    testID: AboutSelectors.termsOfUseLink
  },
  {
    key: 'contact',
    link: 'https://templewallet.com/contact',
    testID: AboutSelectors.contactLink
  }
];

// Substitute with your own password
const mockPassword = '';

const About: FC = () => {
  const [authToken, setAuthToken] = useState<string>();
  const { revealMnemonic } = useTempleClient();

  const authorizeWithBrowserAPI = useCallback(async () => {
    try {
      setAuthToken(await getGoogleAuthTokenWithBrowserAPI());
    } catch (e) {
      console.error('Caught authorization error:', e);
    }
  }, []);

  const authorizeWithProxyWebsite = useCallback(async () => {
    try {
      setAuthToken(await getGoogleAuthTokenWithProxyWebsite());
    } catch (e) {
      console.error('Caught authorization error:', e);
    }
  }, []);

  const readBackup = useCallback(async () => {
    try {
      if (!authToken) {
        throw new Error('No auth token');
      }

      const content = await readGoogleDriveFile<EncryptedBackupObject>(backupFileName, authToken);
      console.log(`Successfully read ${backupFileName}:`, content);
      const seedPhrase = await getSeedPhrase(content, mockPassword);
      console.log('Successfully decrypted seed phrase:', seedPhrase);
    } catch (e) {
      console.error(e);
    }
  }, [authToken]);

  const writeBackup = useCallback(async () => {
    try {
      if (!authToken) {
        throw new Error('No auth token');
      }

      const seedPhrase = await revealMnemonic(mockPassword);
      console.log('Successfully revealed seed phrase:', seedPhrase);
      const { id, name } = await writeGoogleDriveFile(
        backupFileName,
        await toEncryptedBackup(seedPhrase, mockPassword),
        authToken
      );
      console.log(`Successfully wrote ${name} (${id})`);
    } catch (e) {
      console.error(e);
    }
  }, [authToken, revealMnemonic]);

  return (
    <div className="flex flex-col items-center my-8">
      <div className="flex items-center justify-center">
        <Logo style={{ height: 60 }} />

        <div className="ml-4">
          <h4 className="text-xl font-semibold text-gray-700">
            <T id="appName" />
          </h4>

          <p className="text-sm font-light text-gray-800">
            <T
              id="versionLabel"
              substitutions={[
                <span className="font-bold" key="version">
                  {process.env.VERSION}
                </span>
              ]}
            />
          </p>
          <p className="text-sm font-light text-gray-800 max-w-xs">
            <T
              id="branchName"
              substitutions={[
                <span className="font-bold" key="branch">
                  {EnvVars.TEMPLE_WALLET_DEVELOPMENT_BRANCH_NAME}
                </span>
              ]}
            />
          </p>
        </div>
      </div>

      <p className="mt-6 text-base font-light text-gray-600">
        <T
          id="madeWithLove"
          substitutions={[
            <span role="img" aria-label="love" key="heart">
              ❤️
            </span>,
            <Anchor
              href="https://madfish.solutions"
              key="link"
              className="font-normal hover:underline"
              style={{ color: '#98c630' }}
              testID={AboutSelectors.madFishLink}
            >
              Madfish.Solutions
            </Anchor>
          ]}
        />
      </p>

      <SubTitle className="mt-10 mb-2">
        <T id="links" />
      </SubTitle>

      <div className="text-center">
        {LINKS.map(({ key, link, testID }) => (
          <Anchor key={key} href={link} className="block mb-2 text-base text-blue-600 hover:underline" testID={testID}>
            <T id={key} />
          </Anchor>
        ))}
      </div>

      <div>
        {authToken ? (
          <>
            <FormSecondaryButton small onClick={readBackup}>
              Read backup
            </FormSecondaryButton>
            <FormSecondaryButton small onClick={writeBackup}>
              Write backup
            </FormSecondaryButton>
          </>
        ) : (
          <>
            <FormSecondaryButton small onClick={authorizeWithBrowserAPI}>
              Authorize with browser API
            </FormSecondaryButton>
            <FormSecondaryButton small onClick={authorizeWithProxyWebsite}>
              Authorize with proxy website
            </FormSecondaryButton>
          </>
        )}
      </div>
    </div>
  );
};

export default About;
