import BigNumber from 'bignumber.js';
import { getAddress } from 'viem';

import type { AssetMetadataBase } from 'lib/metadata';
import { isTezosDcpChainId } from 'temple/networks';
import { TempleChainKind } from 'temple/types';

import { TEZ_TOKEN_SLUG, EVM_TOKEN_SLUG, TEZOS_SYMBOL, TEZOS_DCP_SYMBOL } from './defaults';
import type { Asset, FA2Token } from './types';

const CHAIN_SLUG_SEPARATOR = ':';

export const getTezosGasSymbol = (chainId: string) => (isTezosDcpChainId(chainId) ? TEZOS_DCP_SYMBOL : TEZOS_SYMBOL);

export const toTokenSlug = (contract: string, id?: string | number) => `${contract}_${id || '0'}`;

export const toTezosAssetSlug = (contract: string, id?: string) =>
  contract === TEZ_TOKEN_SLUG ? TEZ_TOKEN_SLUG : toTokenSlug(contract, id);

export const toEvmAssetSlug = (contract: string, id?: string) =>
  contract === EVM_TOKEN_SLUG ? EVM_TOKEN_SLUG : toTokenSlug(getAddress(contract), id);

export const fromAssetSlug = <T = string>(slug: string) => slug.split('_') as [contract: T, tokenId?: string];

export const toChainAssetSlug = (chainKind: TempleChainKind, chainId: number | string, assetSlug: string) =>
  `${chainKind}${CHAIN_SLUG_SEPARATOR}${chainId}${CHAIN_SLUG_SEPARATOR}${assetSlug}`;

/** @deprecated Use `parseChainAssetSlug` */
export const fromChainAssetSlug = <T = string | number>(
  chainAssetSlug: string
): [chainKind: string, chainId: T, assetSlug: string] => {
  const [chainKind, chainId = '', assetSlug = ''] = chainAssetSlug.split(CHAIN_SLUG_SEPARATOR);

  const convertedChainId = (chainKind === TempleChainKind.Tezos ? chainId : Number(chainId)) as unknown as T;

  return [chainKind, convertedChainId, assetSlug];
};

export function parseChainAssetSlug(
  chainAssetSlug: string,
  chainKind: TempleChainKind.EVM
): [chainKind: TempleChainKind.EVM, chainId: number, assetSlug: string];
export function parseChainAssetSlug(
  chainAssetSlug: string,
  chainKind: TempleChainKind.Tezos
): [chainKind: TempleChainKind.Tezos, chainId: string, assetSlug: string];
export function parseChainAssetSlug(
  chainAssetSlug: string
):
  | [chainKind: TempleChainKind.EVM, chainId: number, assetSlug: string]
  | [chainKind: TempleChainKind.Tezos, chainId: string, assetSlug: string];
export function parseChainAssetSlug(chainAssetSlug: string, chainKind?: TempleChainKind) {
  const [_chainKind, chainId = '', assetSlug = ''] = chainAssetSlug.split(CHAIN_SLUG_SEPARATOR);

  switch (chainKind) {
    case TempleChainKind.EVM:
      return [TempleChainKind.EVM, Number(chainId), assetSlug];
    case TempleChainKind.Tezos:
      return [TempleChainKind.Tezos, chainId, assetSlug];
    default:
      if (_chainKind === TempleChainKind.EVM) return [TempleChainKind.EVM, Number(chainId), assetSlug];

      return [TempleChainKind.Tezos, chainId, assetSlug];
  }
}

export const tokenToSlug = <T extends { address: string; id?: string | number }>({ address, id }: T) => {
  return toTokenSlug(address, id);
};

export const isFA2Token = (asset: Asset): asset is FA2Token =>
  isTezAsset(asset) ? false : typeof asset.id !== 'undefined';

export const isTezAsset = (asset: Asset | string): asset is typeof TEZ_TOKEN_SLUG => asset === TEZ_TOKEN_SLUG;

export const toPenny = (metadata: AssetMetadataBase | nullish) => new BigNumber(1).div(10 ** (metadata?.decimals ?? 0));

export const fromFa2TokenSlug = (slug: string): FA2Token => {
  if (isTezAsset(slug)) {
    throw new Error('Only fa2 token slug allowed');
  }

  const [contractAddress, tokenIdStr] = fromAssetSlug(slug);

  return {
    contract: contractAddress,
    id: tokenIdStr ?? '0'
  };
};
