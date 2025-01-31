import { OneOfChains } from 'temple/front';
import { BalancesChanges } from 'temple/types';

export interface BalancesChangesViewProps<C extends OneOfChains = OneOfChains> {
  balancesChanges: BalancesChanges;
  chain: C;
}
