import axios from 'axios';
import { v4 } from 'uuid';
import browser from 'webextension-polyfill';

import { EnvVars } from 'lib/env';
import { intercom } from 'lib/temple/front/client';
import { TempleMessageType, TempleNotification } from 'lib/temple/types';

interface GoogleFile {
  kind: string;
  mimeType: string;
  id: string;
  name: string;
}

interface FilesListResponse {
  kind: string;
  incompleteSearch: boolean;
  nextPageToken?: string;
  files: GoogleFile[];
}

export class FileDoesNotExistError extends Error {}

const googleApi = axios.create({
  baseURL: 'https://www.googleapis.com'
});

export const getGoogleAuthTokenWithBrowserAPI = async () => {
  const redirectURL = browser.identity.getRedirectURL();
  const scopes = ['https://www.googleapis.com/auth/drive.appdata'];
  const authURLQueryParams = new URLSearchParams({
    client_id: EnvVars.GOOGLE_DRIVE_CLIENT_ID,
    response_type: 'token',
    redirect_uri: redirectURL,
    scope: scopes.join(' ')
  });

  const url = await browser.identity.launchWebAuthFlow({
    interactive: true,
    url: `https://accounts.google.com/o/oauth2/auth?${authURLQueryParams.toString()}`
  });

  const urlParams = new URLSearchParams(url.split('#')[1]);
  const authToken = urlParams.get('access_token');
  if (authToken) {
    return authToken;
  }
  throw new Error(`Failed to parse auth token, url: ${url}`);
};

export const getGoogleAuthTokenWithProxyWebsite = async () => {
  await browser.tabs.create({ url: 'http://localhost:3000/google-drive-auth' });

  return new Promise<string>(res => {
    const unsubscribe = intercom.subscribe((msg: TempleNotification) => {
      if (msg?.type === TempleMessageType.GoogleAuthTokenReceived) {
        unsubscribe();
        res(msg.authToken);
      }
    });
  });
};

const getFileId = async (fileName: string, authToken: string, nextPageToken?: string): Promise<string | undefined> => {
  const { data } = await googleApi.get<FilesListResponse>('/drive/v3/files', {
    params: {
      supportsAllDrives: false,
      key: EnvVars.GOOGLE_DRIVE_API_KEY,
      pageToken: nextPageToken,
      spaces: 'appDataFolder'
    },
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });

  const matchingFile = data.files.find(file => file.name === fileName);

  if (matchingFile) {
    return matchingFile.id;
  }

  return data.nextPageToken ? getFileId(fileName, authToken, data.nextPageToken) : undefined;
};

export const readGoogleDriveFile = async <T = string>(fileName: string, authToken: string) => {
  const fileId = await getFileId(fileName, authToken);
  if (fileId) {
    const { data } = await googleApi.get<T>(`/drive/v3/files/${fileId}`, {
      params: {
        alt: 'media',
        key: EnvVars.GOOGLE_DRIVE_API_KEY,
        spaces: 'appDataFolder'
      },
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    return data;
  }

  throw new FileDoesNotExistError(`File ${fileName} does not exist`);
};

export const writeGoogleDriveFile = async (
  fileName: string,
  content: string,
  authToken: string,
  contentType = 'application/json'
) => {
  const fileId = await getFileId(fileName, authToken);
  const method = fileId ? 'patch' : 'post';
  const boundary = v4();

  const { data } = await googleApi[method]<GoogleFile>(
    `/upload/drive/v3/files${fileId ? `/${fileId}` : ''}`,
    `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({
      name: fileName,
      mimeType: contentType,
      parents: fileId ? undefined : ['appDataFolder']
    })}\r\n--${boundary}\r\ncontent-type: ${contentType}\r\n\r\n${content}\r\n--${boundary}--`,
    {
      params: {
        uploadType: 'multipart',
        key: EnvVars.GOOGLE_DRIVE_API_KEY
      },
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      }
    }
  );

  return data;
};
