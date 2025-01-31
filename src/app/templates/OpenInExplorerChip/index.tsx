import React, { FC, memo } from 'react';

import { ExternalLinkChip, ExternalLinkChipProps } from 'app/atoms/ExternalLinkChip';
import { t } from 'lib/i18n';
import { BlockExplorerEntityType, useBlockExplorerHref } from 'temple/front/use-block-explorers';
import { TempleChainKind } from 'temple/types';

import { OpenInExplorerChipSelectors } from './selectors';

interface Props extends Omit<ExternalLinkChipProps, 'href'> {
  tezosChainId: string;
  hash: string;
  entityType: BlockExplorerEntityType;
}

export const OpenInExplorerChip: FC<Props> = ({ tezosChainId, hash, tooltip, entityType, ...props }) => {
  const href = useBlockExplorerHref(TempleChainKind.Tezos, tezosChainId, entityType, hash);

  return href ? <OpenInExplorerChipBase {...props} href={href} tooltip={tooltip} /> : null;
};

export const OpenInExplorerChipBase = memo<ExternalLinkChipProps>(({ href, tooltip, ...props }) => (
  <ExternalLinkChip
    {...props}
    href={href}
    arrowIcon
    tooltip={tooltip ?? t('viewOnBlockExplorer')}
    testID={OpenInExplorerChipSelectors.viewOnBlockExplorerLink}
  />
));
