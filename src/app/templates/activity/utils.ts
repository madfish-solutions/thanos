import {
  ActivityOperKindEnum,
  Activity,
  ActivityOperTransferType,
  TezosOperation,
  EvmOperation,
  TezosActivity
} from 'lib/activity';

export type FaceKind = ActivityOperKindEnum | 'bundle';

export type FilterKind = 'send' | 'receive' | 'approve' | 'transfer' | 'bundle' | null;

export function getActivityOperTransferType(operation?: TezosOperation | EvmOperation) {
  if (operation?.kind !== ActivityOperKindEnum.transfer) return;

  return operation.type;
}

export function getActivityFilterKind(activity: Activity): FilterKind {
  const { operations, operationsCount } = activity;

  if (operationsCount !== 1) return 'bundle';

  const operation = operations.at(0);

  if (!operation) return null;

  switch (operation.kind) {
    case ActivityOperKindEnum.interaction:
      return null;
    case ActivityOperKindEnum.approve:
      return 'approve';
  }

  switch (operation.type) {
    case ActivityOperTransferType.send:
    case ActivityOperTransferType.receive:
      return 'transfer';
    case ActivityOperTransferType.sendToAccount:
      return 'send';
    case ActivityOperTransferType.receiveFromAccount:
      return 'receive';
  }

  return null;
}

export function isTezosActivity(activity: Activity): activity is TezosActivity {
  return 'oldestTzktOperation' in activity;
}
