import BigNumber from 'bignumber.js';

import { TempleChainKind } from 'temple/types';

import { StoredAccount, StoredHDAccount, TempleAccountType, WalletSpecs } from './types';

export function usdToAssetAmount(
  usd?: BigNumber,
  assetUsdPrice?: number,
  assetDecimals?: number,
  roundingMode?: BigNumber.RoundingMode
) {
  return !usd || assetUsdPrice === undefined
    ? undefined
    : usd.div(assetUsdPrice).decimalPlaces(assetDecimals || 0, roundingMode ?? BigNumber.ROUND_DOWN);
}

export function tzToMutez(tz: BigNumber.Value) {
  const bigNum = new BigNumber(tz);
  if (bigNum.isNaN()) return bigNum;
  return bigNum.shiftedBy(6).integerValue();
}

export function mutezToTz(mutez: BigNumber.Value) {
  const bigNum = new BigNumber(mutez);
  if (bigNum.isNaN()) return bigNum;
  return bigNum.integerValue().shiftedBy(-6);
}

export function atomsToTokens(x: BigNumber.Value, decimals: number) {
  return new BigNumber(x).integerValue().shiftedBy(-decimals);
}

export function tokensToAtoms(x: BigNumber.Value, decimals: number) {
  return new BigNumber(x).shiftedBy(decimals).integerValue();
}

export function formatOpParamsBeforeSend(params: any, sourcePkh?: string) {
  if (params.kind === 'origination' && params.script) {
    const newParams = { ...params, ...params.script };
    newParams.init = newParams.storage;
    delete newParams.script;
    delete newParams.storage;
    return newParams;
  }

  if (params.kind === 'transaction' && sourcePkh) {
    return { ...params, source: sourcePkh };
  }

  return params;
}

export function toExcelColumnName(n: number) {
  let dividend = n + 1;
  let columnName = '';
  let modulo;

  while (dividend > 0) {
    modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

export function getSameGroupAccounts(
  allAccounts: StoredAccount[],
  accountType: TempleAccountType.HD,
  groupId: string
): StoredHDAccount[];
export function getSameGroupAccounts(
  allAccounts: StoredAccount[],
  accountType: TempleAccountType,
  groupId?: string
): StoredAccount[];
export function getSameGroupAccounts(allAccounts: StoredAccount[], accountType: TempleAccountType, groupId?: string) {
  return allAccounts.filter(
    acc => acc.type === accountType && (acc.type !== TempleAccountType.HD || acc.walletId === groupId)
  );
}

async function pickUniqueName(
  startIndex: number,
  getNameCandidate: (i: number) => string | Promise<string>,
  isUnique: (name: string) => boolean
) {
  for (let i = startIndex; ; i++) {
    const nameCandidate = await getNameCandidate(i);
    if (isUnique(nameCandidate)) {
      return nameCandidate;
    }
  }
}

export function isNameCollision(
  allAccounts: StoredAccount[],
  accountType: TempleAccountType,
  name: string,
  walletId?: string
) {
  return getSameGroupAccounts(allAccounts, accountType, walletId).some(acc => acc.name === name);
}

export async function fetchNewAccountName(
  allAccounts: StoredAccount[],
  newAccountType: TempleAccountType,
  getNameCandidate: (i: number) => string | Promise<string>,
  newAccountWalletId?: string
) {
  const sameGroupAccounts = getSameGroupAccounts(allAccounts, newAccountType, newAccountWalletId);

  return await pickUniqueName(
    sameGroupAccounts.length + 1,
    getNameCandidate,
    name => !isNameCollision(allAccounts, newAccountType, name, newAccountWalletId)
  );
}

export async function fetchNewGroupName(
  walletsSpecs: StringRecord<WalletSpecs>,
  getNameCandidate: (i: number) => Promise<string>
) {
  const groupsNames = Object.values(walletsSpecs).map(spec => spec.name);

  return await pickUniqueName(groupsNames.length, getNameCandidate, name => !groupsNames.includes(name));
}

export function getDerivationPath(chainName: TempleChainKind, index: number) {
  if (chainName === TempleChainKind.EVM) {
    return `m/44'/60'/0'/0/${index}`;
  }

  return `m/44'/1729'/${index}'/0'`;
}

export function buildFinalTezosOpParams(opParams: any[], modifiedTotalFee?: number, modifiedStorageLimit?: number) {
  if (modifiedTotalFee !== undefined) {
    opParams = opParams.map(op => ({ ...op, fee: 0 }));
    opParams[0].fee = modifiedTotalFee;
  }

  if (modifiedStorageLimit !== undefined && opParams.length < 2) {
    opParams[0].storageLimit = modifiedStorageLimit;
  }

  return opParams;
}
