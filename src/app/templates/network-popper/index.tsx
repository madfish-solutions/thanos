import React, { memo, useMemo } from 'react';

import { t } from 'lib/i18n';
import Popper from 'lib/ui/Popper';
import { useAllEvmChains, useAllTezosChains } from 'temple/front';
import { TempleChainKind } from 'temple/types';

import { ALL_NETWORKS } from './constants';
import { NetworkDropdown } from './dropdown';
import { NetworkPopperProps } from './types';

export const NetworkPopper = memo<NetworkPopperProps>(
  ({ selectedOption, showAllNetworksOption, chainKind, placement = 'bottom-end', onOptionSelect, children }) => {
    const allTezosChains = useAllTezosChains();
    const allEvmChains = useAllEvmChains();

    const selectedOptionName = useMemo(() => {
      if (!selectedOption) return t(ALL_NETWORKS);

      if (selectedOption.kind === TempleChainKind.Tezos) {
        return allTezosChains[selectedOption.chainId]?.name;
      }

      return allEvmChains[selectedOption.chainId]?.name;
    }, [allEvmChains, allTezosChains, selectedOption]);

    return (
      <Popper
        placement={placement}
        strategy="fixed"
        popup={popperProps => (
          <NetworkDropdown
            showAllNetworksOption={showAllNetworksOption}
            selectedOption={selectedOption}
            onOptionSelect={onOptionSelect}
            chainKind={chainKind}
            {...popperProps}
          />
        )}
      >
        {props => children({ ...props, selectedOptionName })}
      </Popper>
    );
  }
);
