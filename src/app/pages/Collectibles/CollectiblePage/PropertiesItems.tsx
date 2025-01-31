import React, { memo, useMemo } from 'react';

import BigNumber from 'bignumber.js';

import { OldStyleHashChip, ExternalLinkChip } from 'app/atoms';
import type { CollectibleDetails } from 'app/store/tezos/collectibles/state';
import { fromFa2TokenSlug } from 'lib/assets/utils';
import { useTezosAssetBalance } from 'lib/balances';
import { useEvmAssetBalance } from 'lib/balances/hooks';
import { formatDate } from 'lib/i18n';
import { EvmCollectibleMetadata } from 'lib/metadata/types';
import { useEvmChainByChainId } from 'temple/front/chains';
import { useBlockExplorerHref } from 'temple/front/use-block-explorers';
import { TezosNetworkEssentials } from 'temple/networks';
import { TempleChainKind } from 'temple/types';

const itemClassName = 'flex flex-col gap-y-2 p-3 border border-gray-300 rounded-md';
const itemTitleClassName = 'text-xs text-gray-600 leading-5';
const itemValueClassName = 'text-base font-semibold leading-5 break-words';

interface PropertiesItemsProps {
  network: TezosNetworkEssentials;
  assetSlug: string;
  accountPkh: string;
  details?: CollectibleDetails | null;
}

export const PropertiesItems = memo<PropertiesItemsProps>(({ network, assetSlug, accountPkh, details }) => {
  const { contract, id } = fromFa2TokenSlug(assetSlug);

  const { value: balance } = useTezosAssetBalance(assetSlug, accountPkh, network);

  const exploreContractUrl = useBlockExplorerHref(TempleChainKind.Tezos, network.chainId, 'address', contract);

  const mintedTimestamp = useMemo(() => {
    const value = details?.mintedTimestamp;

    return value ? formatDate(value, 'PP') : '-';
  }, [details?.mintedTimestamp]);

  const royaltiesStr = useMemo(() => {
    if (!details?.royalties) return '-';

    const royalties = new BigNumber(details.royalties).decimalPlaces(2);

    return `${royalties.toString()}%`;
  }, [details]);

  return (
    <>
      <div className={itemClassName}>
        <h6 className={itemTitleClassName}>Editions</h6>
        <span className={itemValueClassName}>{details?.supply ?? '-'}</span>
      </div>

      <div className={itemClassName}>
        <h6 className={itemTitleClassName}>Owned</h6>
        <span className={itemValueClassName}>{balance?.toString() ?? '-'}</span>
      </div>

      <div className={itemClassName}>
        <h6 className={itemTitleClassName}>Minted</h6>
        <span className={itemValueClassName}>{mintedTimestamp}</span>
      </div>

      <div className={itemClassName}>
        <h6 className={itemTitleClassName}>Royalties</h6>
        <span className={itemValueClassName}>{royaltiesStr}</span>
      </div>

      <div className={itemClassName}>
        <h6 className={itemTitleClassName}>Contract</h6>
        <div className="flex gap-x-1.5">
          <OldStyleHashChip
            hash={contract}
            firstCharsCount={5}
            lastCharsCount={5}
            className="tracking-tighter"
            rounded="base"
          />
          {exploreContractUrl && <ExternalLinkChip href={exploreContractUrl} tooltip="Explore contract" />}
        </div>
      </div>

      <div className={itemClassName}>
        <h6 className={itemTitleClassName}>Metadata</h6>
        {details?.metadataHash ? (
          <div className="flex gap-x-1.5">
            <span className="rounded p-1 text-sm leading-4 text-gray-600 bg-gray-100">IPFS</span>
            <ExternalLinkChip href={`https://ipfs.io/ipfs/${details.metadataHash}`} tooltip="Open metadata" />
          </div>
        ) : (
          <span className={itemValueClassName}>-</span>
        )}
      </div>

      <div className={itemClassName}>
        <h6 className={itemTitleClassName}>Token id</h6>
        <span className={itemValueClassName}>{id.toString()}</span>
      </div>
    </>
  );
});

interface EvmPropertiesItemsProps {
  accountPkh: HexString;
  assetSlug: string;
  evmChainId: number;
  metadata?: EvmCollectibleMetadata;
}

export const EvmPropertiesItems = memo<EvmPropertiesItemsProps>(({ accountPkh, evmChainId, assetSlug, metadata }) => {
  const chain = useEvmChainByChainId(evmChainId);
  const { value: balance } = useEvmAssetBalance(assetSlug, accountPkh, chain!);

  if (!metadata) return null;

  return (
    <>
      <div className={itemClassName}>
        <h6 className={itemTitleClassName}>Owned</h6>
        <span className={itemValueClassName}>{balance?.toFixed() ?? '-'}</span>
      </div>

      <div className={itemClassName}>
        <h6 className={itemTitleClassName}>Contract</h6>
        <div className="flex gap-x-1.5">
          <OldStyleHashChip
            hash={metadata.address}
            firstCharsCount={5}
            lastCharsCount={5}
            className="tracking-tighter"
            rounded="base"
          />
        </div>
      </div>

      <div className={itemClassName}>
        <h6 className={itemTitleClassName}>Token id</h6>
        <span className={itemValueClassName}>{metadata.tokenId}</span>
      </div>
    </>
  );
});
