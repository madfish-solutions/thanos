import { OneOfChains } from 'temple/front';
import { AssetsAmounts } from 'temple/types';

export interface BalancesChangesViewProps<C extends OneOfChains = OneOfChains> {
  balancesChanges: AssetsAmounts;
  chain: C;
}
