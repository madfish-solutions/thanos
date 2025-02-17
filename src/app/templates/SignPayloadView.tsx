import React, { memo, useCallback, useMemo } from 'react';

import clsx from 'clsx';
import ReactJson from 'react-json-view';

import { TextButton } from 'app/atoms/TextButton';
import { ReactComponent as CopyIcon } from 'app/icons/base/copy.svg';
import { toastSuccess } from 'app/toaster';
import { T, t } from 'lib/i18n';
import { TempleEvmDAppSignPayload, TempleTezosDAppSignPayload } from 'lib/temple/types';
import useCopyToClipboard from 'lib/ui/useCopyToClipboard';
import { getAccountAddressForEvm, getAccountAddressForTezos } from 'temple/accounts';
import { useAllAccounts } from 'temple/front';
import { TempleChainKind } from 'temple/types';

import { AccountCard } from './AccountCard';

interface SignPayloadViewProps {
  payload: TempleEvmDAppSignPayload | TempleTezosDAppSignPayload;
}

export const SignPayloadView = memo<SignPayloadViewProps>(({ payload }) => {
  const accounts = useAllAccounts();
  const signingAccount = useMemo(
    () =>
      accounts.find(
        acc =>
          getAccountAddressForEvm(acc)?.toLowerCase() === payload.sourcePkh.toLowerCase() ||
          getAccountAddressForTezos(acc) === payload.sourcePkh
      ),
    [accounts, payload.sourcePkh]
  );
  const { fieldRef, copy } = useCopyToClipboard<HTMLTextAreaElement>();

  const previewSource =
    payload.chainType === TempleChainKind.EVM ? payload.payload : payload.preview ?? payload.payload;
  const text = useMemo(
    () => (typeof previewSource === 'string' ? previewSource : JSON.stringify(previewSource, null, 2)),
    [previewSource]
  );

  const handleCopyPress = useCallback(() => {
    copy();
    toastSuccess(t('copiedHash'));
  }, [copy]);

  return (
    <>
      <AccountCard
        account={signingAccount!}
        isCurrent={false}
        attractSelf={false}
        searchValue=""
        showRadioOnHover={false}
      />

      <div className="rounded-lg p-4 bg-white shadow-bottom flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <span className="flex-1 text-font-description-bold text-grey-2">
            {payload.chainType === TempleChainKind.Tezos && typeof previewSource !== 'string' ? (
              <T id="transaction" />
            ) : (
              <T id="message" />
            )}
          </span>

          <TextButton color="blue" Icon={CopyIcon} onClick={handleCopyPress}>
            <T id="copy" />
          </TextButton>

          <textarea ref={fieldRef} value={text} readOnly className="sr-only" />
        </div>

        <div
          className={clsx('max-h-44 overflow-auto', typeof previewSource !== 'string' && 'bg-input-low rounded-lg p-3')}
        >
          {typeof previewSource === 'string' ? (
            <span className="text-font-medium">{previewSource}</span>
          ) : (
            <ReactJson
              src={previewSource}
              name={null}
              iconStyle="square"
              indentWidth={2}
              collapsed={3}
              collapseStringsAfterLength={36}
              enableClipboard={false}
              displayObjectSize={false}
              displayDataTypes={false}
            />
          )}
        </div>
      </div>
    </>
  );
});
