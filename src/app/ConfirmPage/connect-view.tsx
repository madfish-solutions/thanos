import React, { memo } from 'react';

import { IconBase } from 'app/atoms';
import { ReactComponent as UnlockFillIcon } from 'app/icons/base/unlock_fill.svg';
import { T, TID } from 'lib/i18n';

const permissionsDescriptionsI18nKeys: TID[] = [
  'viewWalletPermissionDescription',
  'transactionsPermissionDescription',
  'signingPermissionDescription'
];

export const ConnectView = memo(() => (
  <div className="bg-white shadow-bottom rounded-lg p-4">
    <p className="my-1 text-font-description-bold text-grey-1">
      <T id="permissions" />
    </p>
    {permissionsDescriptionsI18nKeys.map(key => (
      <div className="flex justify-between items-center py-2.5" key={key}>
        <span className="text-font-description">
          <T id={key} />
        </span>
        <div className="bg-grey-4 rounded-md pl-1.5 pr-2 py-1 flex items-center gap-px">
          <IconBase Icon={UnlockFillIcon} size={12} className="text-success" />

          <span className="text-font-num-bold-10 uppercase">
            <T id="allowed" />
          </span>
        </div>
      </div>
    ))}
  </div>
));
