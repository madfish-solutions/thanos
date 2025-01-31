import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import constate from 'constate';
import { omit } from 'lodash';
import browser from 'webextension-polyfill';

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
import { useDidMount } from 'lib/ui/hooks';
import { DEFAULT_PROMISES_QUEUE_COUNTERS } from 'lib/utils';
import type { EvmTxParams } from 'temple/evm/types';
import { toSerializableEvmTxParams } from 'temple/evm/utils';
import type { EvmChain } from 'temple/front';
import {
  intercomClient,
  makeIntercomRequest as request,
  assertResponse,
  getAccountPublicKey,
  makeIntercomRequest
} from 'temple/front/intercom-client';
import { getPendingConfirmationId, resetPendingConfirmationId } from 'temple/front/pending-confirm';
import { TempleChainKind } from 'temple/types';

import { getShouldBeLockedOnStartup } from './lock';
import { useStorage } from './storage';

interface Confirmation {
  id: string;
  payload: TempleConfirmationPayload;
  error?: any;
}

export const [TempleClientProvider, useTempleClient] = constate(() => {
  /**
   * State
   */

  const didMountRef = useRef(false);
  useDidMount(() => void (didMountRef.current = true));

  const fetchState = useCallback(async () => {
    const res = await makeIntercomRequest({ type: TempleMessageType.GetStateRequest });
    assertResponse(res.type === TempleMessageType.GetStateResponse);

    if (didMountRef.current || res.state.status !== TempleStatus.Ready) {
      return { state: res.state, shouldLockOnStartup: false };
    }

    const isLocked = await getShouldBeLockedOnStartup();

    return {
      state: isLocked
        ? {
            status: TempleStatus.Locked,
            accounts: [],
            settings: null,
            dAppQueueCounters: DEFAULT_PROMISES_QUEUE_COUNTERS
          }
        : res.state,
      shouldLockOnStartup: isLocked
    };
  }, []);

  const { data, mutate } = useRetryableSWR('state', fetchState, {
    suspense: true,
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false
  });
  const state = data!.state;

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

  const { status, accounts, settings, dAppQueueCounters } = state;
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

  const generateSyncPayload = useCallback(async (password: string, walletId: string) => {
    const res = await request({
      type: TempleMessageType.GenerateSyncPayloadRequest,
      password,
      walletId
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

  const removeDAppSession = useCallback(async (origins: string[]) => {
    const res = await request({
      type: TempleMessageType.DAppRemoveSessionRequest,
      origins
    });
    assertResponse(res.type === TempleMessageType.DAppRemoveSessionResponse);
    return res.sessions;
  }, []);

  const confirmDAppEvmAssetAdding = useCallback(async (id: string, confirmed: boolean) => {
    const res = await request({
      type: TempleMessageType.DAppAddEvmAssetRequest,
      id,
      confirmed
    });
    assertResponse(res.type === TempleMessageType.DAppAddEvmAssetResponse);
  }, []);

  const confirmDAppEvmChainAdding = useCallback(async (id: string, confirmed: boolean, testnet: boolean) => {
    const res = await request({
      type: TempleMessageType.DAppAddEvmChainRequest,
      id,
      confirmed,
      testnet
    });
    assertResponse(res.type === TempleMessageType.DAppAddEvmChainResponse);
  }, []);

  const switchDAppEvmChain = useCallback(async (origin: string, chainId: number) => {
    const res = await request({
      type: TempleMessageType.DAppSwitchEvmChainRequest,
      origin,
      chainId
    });
    assertResponse(res.type === TempleMessageType.DAppSwitchEvmChainResponse);
  }, []);

  const sendEvmTransaction = useCallback(async (accountPkh: HexString, network: EvmChain, txParams: EvmTxParams) => {
    const res = await request({
      type: TempleMessageType.SendEvmTransactionRequest,
      accountPkh,
      network,
      txParams: toSerializableEvmTxParams(txParams)
    });
    assertResponse(res.type === TempleMessageType.SendEvmTransactionResponse);

    return res.txHash;
  }, []);

  const resetExtension = useCallback(async (password: string) => {
    const res = await request({
      type: TempleMessageType.ResetExtensionRequest,
      password
    });
    assertResponse(res.type === TempleMessageType.ResetExtensionResponse);
    localStorage.clear();
    browser.runtime.reload();
  }, []);

  useEffect(() => void (data?.shouldLockOnStartup && lock()), [data?.shouldLockOnStartup, lock]);

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
    dAppQueueCounters,

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
    removeDAppSession,
    confirmDAppEvmAssetAdding,
    confirmDAppEvmChainAdding,
    switchDAppEvmChain,
    sendEvmTransaction,
    resetExtension
  };
});
