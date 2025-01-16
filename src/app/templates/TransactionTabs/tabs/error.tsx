import React, { memo, useMemo } from 'react';

import ReactJson from 'react-json-view';

import { CaptionAlert, CopyButton, IconBase, NoSpaceField } from 'app/atoms';
import { ReactComponent as CopyIcon } from 'app/icons/base/copy.svg';

interface ErrorTabProps {
  isEvm: boolean;
  message: string | nullish;
}

export const ErrorTab = memo<ErrorTabProps>(({ isEvm, message }) => {
  const parsedError = useMemo(() => {
    try {
      if (isEvm || !message) return null;

      return JSON.parse(message);
    } catch {
      return null;
    }
  }, [isEvm, message]);

  if (!message) return null;

  return (
    <>
      <CaptionAlert type="error" message="Something’s not right. Please review a message." textClassName="mt-1" />

      <div className="mt-3 mb-1 flex flex-row justify-between items-center">
        <p className="p-1 text-font-description-bold">Error Message</p>
        <CopyButton text={message} className="text-secondary flex text-font-description-bold items-center px-1 py-0.5">
          <span>Copy</span>
          <IconBase size={12} Icon={CopyIcon} />
        </CopyButton>
      </div>

      {parsedError ? (
        <div className="w-full h-44 p-3 mb-3 bg-input-low rounded-lg overflow-scroll">
          <ReactJson
            src={parsedError}
            name={null}
            iconStyle="square"
            indentWidth={4}
            collapseStringsAfterLength={36}
            enableClipboard={false}
            displayObjectSize={false}
            displayDataTypes={false}
          />
        </div>
      ) : (
        <NoSpaceField
          value={message}
          textarea
          rows={5}
          readOnly
          placeholder="Info"
          style={{ resize: 'none' }}
          containerClassName="mb-2"
        />
      )}
    </>
  );
});
