import { ActivityOperKindEnum, Activity, EvmActivity } from 'lib/activity';
import { TezosPreActivity } from 'lib/activity/tezos/types';

export function isEvmActivity(activity: Activity | TezosPreActivity): activity is EvmActivity {
  return typeof activity.chainId === 'number';
}

export type FilterKind = 'send' | 'receive' | 'approve' | 'transfer' | 'bundle' | null;

export function getEvmActivityFaceKind({ operations, operationsCount }: EvmActivity) {
  return operationsCount === 1 ? operations.at(0)?.kind ?? ActivityOperKindEnum.interaction : 'batch';
}

const FILTER_KINDS: Record<ActivityOperKindEnum, FilterKind> = {
  [ActivityOperKindEnum.approve]: 'approve',
  [ActivityOperKindEnum.transferFrom]: 'transfer',
  [ActivityOperKindEnum.transferFrom_ToAccount]: 'send',
  [ActivityOperKindEnum.transferTo]: 'transfer',
  [ActivityOperKindEnum.transferTo_FromAccount]: 'receive',
  //
  [ActivityOperKindEnum.interaction]: null,
  [ActivityOperKindEnum.swap]: null
};

export function getActivityFilterKind({ operations, operationsCount }: Activity): FilterKind {
  if (operationsCount !== 1) return 'bundle';

  const kind = operations.at(0)?.kind ?? ActivityOperKindEnum.interaction;

  return FILTER_KINDS[kind];
}
