import { useCallback, useEffect, useMemo, useState } from 'react';

import constate from 'constate';
import { omit } from 'lodash';

import { WALLETS_SPECS_STORAGE_KEY } from 'lib/constants';
import { useRetryableSWR } from 'lib/swr';
import { clearLocalStorage } from 'lib/temple/reset';
import {
  TempleConfirmationPayload,
  TempleMessageType,
  TempleStatus,
  TempleNotification,
  TempleSettings,
  DerivationType,
  TempleAccountType,
  WalletSpecs
} from 'lib/temple/types';
import {
  intercomClient,
  makeIntercomRequest as request,
  assertResponse,
  getAccountPublicKey
} from 'temple/front/intercom-client';
import { getPendingConfirmationId, resetPendingConfirmationId } from 'temple/front/pending-confirm';
import { TempleChainKind } from 'temple/types';

import { useStorage } from './storage';

type Confirmation = {
  id: string;
  payload: TempleConfirmationPayload;
  error?: any;
};

export const [TempleClientProvider, useTempleClient] = constate(() => {
  /**
   * State
   */

  const fetchState = useCallback(async () => {
    const res = await request({ type: TempleMessageType.GetStateRequest });
    assertResponse(res.type === TempleMessageType.GetStateResponse);
    return res.state;
  }, []);

  const { data, mutate } = useRetryableSWR('state', fetchState, {
    suspense: true,
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false
  });
  const state = data!;

  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  useEffect(() => {
    return intercomClient.subscribe((msg: TempleNotification) => {
      switch (msg?.type) {
        case TempleMessageType.StateUpdated:
          mutate();
          break;

        case TempleMessageType.ConfirmationRequested:
          if (msg.id === getPendingConfirmationId()) {
            setConfirmation({ id: msg.id, payload: msg.payload, error: msg.error });
          }
          break;

        case TempleMessageType.ConfirmationExpired:
          if (msg.id === getPendingConfirmationId()) {
            resetPendingConfirmationId();
            setConfirmation(null);
          }
          break;
      }
    });
  }, [mutate, setConfirmation]);

  /**
   * Aliases
   */

  const { status, accounts, settings } = state;
  const idle = status === TempleStatus.Idle;
  const locked = status === TempleStatus.Locked;
  const ready = status === TempleStatus.Ready;

  const [walletsSpecs, setWalletsSpecs] = useStorage<StringRecord<WalletSpecs>>(WALLETS_SPECS_STORAGE_KEY, {});

  const [customTezosNetworks, customEvmNetworks] = useMemo(
    () => [settings?.customTezosNetworks ?? [], settings?.customEvmNetworks ?? []],
    [settings]
  );

  /**
   * Actions
   */

  const registerWallet = useCallback(async (password: string, mnemonic?: string) => {
    const res = await request({
      type: TempleMessageType.NewWalletRequest,
      password,
      mnemonic
    });
    assertResponse(res.type === TempleMessageType.NewWalletResponse);
    clearLocalStorage(['onboarding', 'analytics']);

    return res.accountPkh;
  }, []);

  const unlock = useCallback(async (password: string) => {
    const res = await request({
      type: TempleMessageType.UnlockRequest,
      password
    });
    assertResponse(res.type === TempleMessageType.UnlockResponse);
  }, []);

  const lock = useCallback(async () => {
    const res = await request({
      type: TempleMessageType.LockRequest
    });
    assertResponse(res.type === TempleMessageType.LockResponse);
  }, []);

  const findFreeHdIndex = useCallback(async (walletId: string) => {
    const res = await request({
      type: TempleMessageType.FindFreeHDAccountIndexRequest,
      walletId
    });
    assertResponse(res.type === TempleMessageType.FindFreeHDAccountIndexResponse);
    return omit(res, 'type');
  }, []);

  const createAccount = useCallback(async (walletId: string, name?: string) => {
    const res = await request({
      type: TempleMessageType.CreateAccountRequest,
      walletId,
      name
    });
    assertResponse(res.type === TempleMessageType.CreateAccountResponse);
  }, []);

  const revealPrivateKey = useCallback(async (address: string, password: string) => {
    const res = await request({
      type: TempleMessageType.RevealPrivateKeyRequest,
      address,
      password
    });
    assertResponse(res.type === TempleMessageType.RevealPrivateKeyResponse);
    return res.privateKey;
  }, []);

  const revealMnemonic = useCallback(async (walletId: string, password: string) => {
    const res = await request({
      type: TempleMessageType.RevealMnemonicRequest,
      walletId,
      password
    });
    assertResponse(res.type === TempleMessageType.RevealMnemonicResponse);
    return res.mnemonic;
  }, []);

  const generateSyncPayload = useCallback(async (password: string) => {
    const res = await request({
      type: TempleMessageType.GenerateSyncPayloadRequest,
      password
    });
    assertResponse(res.type === TempleMessageType.GenerateSyncPayloadResponse);
    return res.payload;
  }, []);

  const removeAccount = useCallback(async (id: string, password: string) => {
    const res = await request({
      type: TempleMessageType.RemoveAccountRequest,
      id,
      password
    });
    assertResponse(res.type === TempleMessageType.RemoveAccountResponse);
  }, []);

  const setAccountHidden = useCallback(async (id: string, value: boolean) => {
    const res = await request({
      type: TempleMessageType.SetAccountHiddenRequest,
      id,
      value
    });
    assertResponse(res.type === TempleMessageType.SetAccountHiddenResponse);
  }, []);

  const editAccountName = useCallback(async (id: string, name: string) => {
    const res = await request({
      type: TempleMessageType.EditAccountRequest,
      id,
      name
    });
    assertResponse(res.type === TempleMessageType.EditAccountResponse);
  }, []);

  const importAccount = useCallback(async (chain: TempleChainKind, privateKey: string, encPassword?: string) => {
    const res = await request({
      type: TempleMessageType.ImportAccountRequest,
      chain,
      privateKey,
      encPassword
    });
    assertResponse(res.type === TempleMessageType.ImportAccountResponse);
  }, []);

  const importMnemonicAccount = useCallback(async (mnemonic: string, password?: string, derivationPath?: string) => {
    const res = await request({
      type: TempleMessageType.ImportMnemonicAccountRequest,
      mnemonic,
      password,
      derivationPath
    });
    assertResponse(res.type === TempleMessageType.ImportMnemonicAccountResponse);
  }, []);

  const importWatchOnlyAccount = useCallback(async (chain: TempleChainKind, address: string, chainId?: string) => {
    const res = await request({
      type: TempleMessageType.ImportWatchOnlyAccountRequest,
      address,
      chain,
      chainId
    });
    assertResponse(res.type === TempleMessageType.ImportWatchOnlyAccountResponse);
  }, []);

  const createLedgerAccount = useCallback(
    async (name: string, derivationType?: DerivationType, derivationPath?: string) => {
      const res = await request({
        type: TempleMessageType.CreateLedgerAccountRequest,
        name,
        derivationPath,
        derivationType
      });
      assertResponse(res.type === TempleMessageType.CreateLedgerAccountResponse);
    },
    []
  );

  const updateSettings = useCallback(async (newSettings: Partial<TempleSettings>) => {
    const res = await request({
      type: TempleMessageType.UpdateSettingsRequest,
      settings: newSettings
    });
    assertResponse(res.type === TempleMessageType.UpdateSettingsResponse);
  }, []);

  const removeHdGroup = useCallback(async (id: string, password: string) => {
    const res = await request({
      type: TempleMessageType.RemoveHdWalletRequest,
      id,
      password
    });
    assertResponse(res.type === TempleMessageType.RemoveHdWalletResponse);
  }, []);

  const removeAccountsByType = useCallback(
    async (type: Exclude<TempleAccountType, TempleAccountType.HD>, password: string) => {
      const res = await request({
        type: TempleMessageType.RemoveAccountsByTypeRequest,
        accountsType: type,
        password
      });
      assertResponse(res.type === TempleMessageType.RemoveAccountsByTypeResponse);
    },
    []
  );

  const createOrImportWallet = useCallback(async (mnemonic?: string) => {
    const res = await request({
      type: TempleMessageType.CreateOrImportWalletRequest,
      mnemonic
    });
    assertResponse(res.type === TempleMessageType.CreateOrImportWalletResponse);
  }, []);

  const editHdGroupName = useCallback(
    (id: string, name: string) =>
      setWalletsSpecs(prevSpecs => ({
        ...prevSpecs,
        [id]: {
          ...prevSpecs[id],
          name: name.trim()
        }
      })),
    [setWalletsSpecs]
  );

  const confirmInternal = useCallback(
    async (id: string, confirmed: boolean, modifiedTotalFee?: number, modifiedStorageLimit?: number) => {
      const res = await request({
        type: TempleMessageType.ConfirmationRequest,
        id,
        confirmed,
        modifiedTotalFee,
        modifiedStorageLimit
      });
      assertResponse(res.type === TempleMessageType.ConfirmationResponse);
    },
    []
  );

  const getDAppPayload = useCallback(async (id: string) => {
    const res = await request({
      type: TempleMessageType.DAppGetPayloadRequest,
      id
    });
    assertResponse(res.type === TempleMessageType.DAppGetPayloadResponse);
    return res.payload;
  }, []);

  const confirmDAppPermission = useCallback(async (id: string, confirmed: boolean, pkh: string) => {
    const res = await request({
      type: TempleMessageType.DAppPermConfirmationRequest,
      id,
      confirmed,
      accountPublicKeyHash: pkh,
      accountPublicKey: confirmed ? await getAccountPublicKey(pkh) : ''
    });
    assertResponse(res.type === TempleMessageType.DAppPermConfirmationResponse);
  }, []);

  const confirmDAppOperation = useCallback(
    async (id: string, confirmed: boolean, modifiedTotalFee?: number, modifiedStorageLimit?: number) => {
      const res = await request({
        type: TempleMessageType.DAppOpsConfirmationRequest,
        id,
        confirmed,
        modifiedTotalFee,
        modifiedStorageLimit
      });
      assertResponse(res.type === TempleMessageType.DAppOpsConfirmationResponse);
    },
    []
  );

  const confirmDAppSign = useCallback(async (id: string, confirmed: boolean) => {
    const res = await request({
      type: TempleMessageType.DAppSignConfirmationRequest,
      id,
      confirmed
    });
    assertResponse(res.type === TempleMessageType.DAppSignConfirmationResponse);
  }, []);

  const getAllDAppSessions = useCallback(async () => {
    const res = await request({
      type: TempleMessageType.DAppGetAllSessionsRequest
    });
    assertResponse(res.type === TempleMessageType.DAppGetAllSessionsResponse);
    return res.sessions;
  }, []);

  const removeDAppSession = useCallback(async (origin: string) => {
    const res = await request({
      type: TempleMessageType.DAppRemoveSessionRequest,
      origin
    });
    assertResponse(res.type === TempleMessageType.DAppRemoveSessionResponse);
    return res.sessions;
  }, []);

  return {
    state,

    // Aliases
    status,
    customTezosNetworks,
    customEvmNetworks,
    accounts,
    walletsSpecs,
    settings,
    idle,
    locked,
    ready,

    // Misc
    confirmation,

    // Actions
    registerWallet,
    unlock,
    lock,
    findFreeHdIndex,
    createAccount,
    revealPrivateKey,
    revealMnemonic,
    generateSyncPayload,
    removeAccount,
    setAccountHidden,
    editAccountName,
    importAccount,
    importMnemonicAccount,
    importWatchOnlyAccount,
    createLedgerAccount,
    updateSettings,
    removeHdGroup,
    removeAccountsByType,
    createOrImportWallet,
    editHdGroupName,
    confirmInternal,
    getDAppPayload,
    confirmDAppPermission,
    confirmDAppOperation,
    confirmDAppSign,
    getAllDAppSessions,
    removeDAppSession
  };
});
