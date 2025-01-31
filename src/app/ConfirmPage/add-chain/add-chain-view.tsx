import React, { memo, useCallback, useMemo } from 'react';

import clsx from 'clsx';

import { Anchor, IconBase } from 'app/atoms';
import { EvmNetworkLogo } from 'app/atoms/NetworkLogo';
import { SettingsCheckbox } from 'app/atoms/SettingsCheckbox';
import { ReactComponent as CopyIcon } from 'app/icons/base/copy.svg';
import { ReactComponent as OutLinkIcon } from 'app/icons/base/outLink.svg';
import { toastSuccess } from 'app/toaster';
import { t, T } from 'lib/i18n';
import { EvmChainToAddMetadata } from 'lib/temple/types';

import { useAddChainDataState } from './context';

interface Props {
  metadata: EvmChainToAddMetadata;
}

export const AddChainView = memo<Props>(({ metadata }) => {
  const chainId = Number(metadata.chainId);
  const { testnet, setTestnet } = useAddChainDataState();

  const displayRpcUrl = useMemo(() => new URL(metadata.rpcUrl).hostname, [metadata.rpcUrl]);
  const displayBlockExplorerUrl = useMemo(
    () => metadata.blockExplorerUrl && new URL(metadata.blockExplorerUrl).hostname,
    [metadata.blockExplorerUrl]
  );

  const handleCopyRpcUrl = useCallback(() => {
    window.navigator.clipboard.writeText(metadata.rpcUrl);
    toastSuccess(t('copiedAddress'));
  }, [metadata.rpcUrl]);

  const handleTestnetChange = useCallback((checked: boolean) => setTestnet(checked), [setTestnet]);

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col px-4 py-2 rounded-8 shadow-bottom border-0.5 border-transparent">
        <div className="py-2 flex flex-row justify-between items-center border-b-0.5 border-lines">
          <p className="p-1 text-font-description text-grey-1">
            <T id="network" />
          </p>
          <div className="flex flex-row items-center">
            <span className="p-1 text-font-num-bold-12">{metadata.name}</span>
            <EvmNetworkLogo chainId={chainId} chainName={metadata.name} size={16} />
          </div>
        </div>

        <div className="py-2 flex flex-row justify-between items-center border-b-0.5 border-lines">
          <p className="p-1 text-font-description text-grey-1">
            <T id="rpcURL" />
          </p>
          <div className="flex flex-row px-1 py-0.5 gap-x-0.5 text-secondary cursor-pointer" onClick={handleCopyRpcUrl}>
            <p className="text-font-description max-w-52 truncate">{displayRpcUrl}</p>
            <IconBase Icon={CopyIcon} size={12} />
          </div>
        </div>

        <div className="py-2 flex flex-row justify-between items-center border-b-0.5 border-lines">
          <p className="p-1 text-font-description text-grey-1">
            <T id="chainId" />
          </p>
          <p className="p-1 text-font-description-bold">{chainId}</p>
        </div>

        <div
          className={clsx(
            'py-2 flex flex-row justify-between items-center',
            metadata.blockExplorerUrl && 'border-b-0.5 border-lines'
          )}
        >
          <p className="p-1 text-font-description text-grey-1">
            <T id="symbol" />
          </p>
          <p className="p-1 text-font-description-bold">{metadata.nativeCurrency.symbol}</p>
        </div>

        {metadata.blockExplorerUrl && (
          <div className="py-2 flex flex-row justify-between items-center">
            <p className="p-1 text-font-description text-grey-1">
              <T id="blockExplorer" />
            </p>
            <Anchor
              href={metadata.blockExplorerUrl}
              className="flex flex-row px-1 py-0.5 gap-x-0.5 text-secondary cursor-pointer"
            >
              <p className="text-font-description max-w-48 truncate">{displayBlockExplorerUrl}</p>
              <IconBase Icon={OutLinkIcon} size={12} />
            </Anchor>
          </div>
        )}
      </div>

      <SettingsCheckbox checked={testnet} onChange={handleTestnetChange} label={<T id="testnet" />} />
    </div>
  );
});
