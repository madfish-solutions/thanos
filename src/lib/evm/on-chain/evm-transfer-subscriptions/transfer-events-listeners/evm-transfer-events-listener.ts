import { isEqual, noop } from 'lodash';
import { Log, OneOf, WatchEventParameters } from 'viem';

import { erc1155TransferBatchEvent, erc1155TransferSingleEvent } from 'lib/abi/erc1155';
import { erc20TransferEvent } from 'lib/abi/erc20';
import { erc721TransferEvent } from 'lib/abi/erc721';
import { getReadOnlyEvm } from 'temple/evm';

import { EvmRpcRequestsExecutor, RequestAlreadyPendingError } from '../../utils/evm-rpc-requests-executor';
import { EvmHttpRpcListener } from '../evm-http-rpc-listener';

export type TransferEvent = OneOf<
  | typeof erc20TransferEvent
  | typeof erc721TransferEvent
  | typeof erc1155TransferBatchEvent
  | typeof erc1155TransferSingleEvent
>;

interface TransfersSubscriptionPayload {
  rpcUrl: string;
  args: WatchEventParameters<TransferEvent>;
}

class EvmTransferEventsSubscriptionExecutor extends EvmRpcRequestsExecutor<
  TransfersSubscriptionPayload,
  EmptyFn,
  string
> {
  protected getRequestsPoolKey(payload: TransfersSubscriptionPayload) {
    return payload.rpcUrl;
  }

  protected requestsAreSame(a: TransfersSubscriptionPayload, b: TransfersSubscriptionPayload) {
    return isEqual(a, b);
  }

  protected async getResult(payload: TransfersSubscriptionPayload) {
    const client = getReadOnlyEvm(payload.rpcUrl);

    return client.watchEvent(payload.args);
  }
}

const evmTransferEventsSubscriptionExecutor = new EvmTransferEventsSubscriptionExecutor();

export abstract class EvmTransferEventsListener<T extends TransferEvent> extends EvmHttpRpcListener<[string]> {
  constructor(protected httpRpcUrl: string, protected account: HexString, protected event: T) {
    super(httpRpcUrl);
  }

  protected abstract getAssetsSlugs(log: Log<bigint, number, false, T>): string[];

  protected handleLog(log: Log<bigint, number, false, T>) {
    const assetsSlugs = this.getAssetsSlugs(log);
    assetsSlugs.forEach(slug => this.emit(slug));
  }

  protected async subscribeToRpcEvents() {
    const eventsArgs = [{ from: this.account }, { to: this.account }];

    const internalCancelSubscriptionFns = await Promise.all(
      eventsArgs.map(args =>
        evmTransferEventsSubscriptionExecutor
          .executeRequest({
            rpcUrl: this.httpRpcUrl,
            args: {
              onLogs: logs => logs.forEach(log => this.handleLog(log as Log<bigint, number, false, T>)),
              event: this.event,
              args,
              onError: e => this.onError(e)
            }
          })
          .catch(error => {
            if (!(error instanceof RequestAlreadyPendingError)) {
              console.error(error);
            }

            return noop;
          })
      )
    );

    return () => {
      internalCancelSubscriptionFns.forEach(fn => fn());
    };
  }
}
