import { Schema } from '@taquito/michelson-encoder';
import { MichelsonV1Expression, TransactionOperationParameter } from '@taquito/rpc';
import BigNumber from 'bignumber.js';

import { toTokenSlug } from 'lib/assets';

import {
  fa12TransferParamsSchema,
  fa2TransferParamsSchema,
  henMintParamsSchema,
  objktComMintParamsSchema,
  raribleBurnParamsSchema,
  raribleMintParamsSchema,
  mintOrBurnOneEntrypointParamsSchema,
  wtezBurnParamsSchema,
  wtezMintParamsSchema,
  wtzMintOrBurnParamsSchema,
  wXTZMintParamsSchema,
  wXTZBurnParamsSchema
} from './schemas';
import {
  HenMintParams,
  ObjktMintParams,
  ParameterFa12Transfer,
  ParameterFa2TransferValue,
  RaribleBurnParams,
  RaribleMintParams,
  MintOrBurnParams,
  WTezBurnParams,
  WtzMintOrBurnParams,
  wXTZMintParams,
  wXTZBurnParams
} from './types';

function handleParams<T>(schema: Schema, value: MichelsonV1Expression, onParse: SyncFn<T>) {
  try {
    onParse(schema.Execute(value));

    return true;
  } catch {
    return false;
  }
}

interface ParamsHandler<T> {
  schema: Schema;
  acceptedOpDestinations?: string[];
  onParse: (parsedParams: T, mutezAmount: BigNumber) => void;
}

interface EntrypointsParamsHandlers {
  transfer: [ParamsHandler<ParameterFa2TransferValue[]>, ParamsHandler<ParameterFa12Transfer>];
  mint: [
    ParamsHandler<wXTZMintParams>,
    ParamsHandler<ObjktMintParams>,
    ParamsHandler<HenMintParams>,
    ParamsHandler<RaribleMintParams>,
    ParamsHandler<WtzMintOrBurnParams>,
    ParamsHandler<string>
  ];
  burn: [
    ParamsHandler<wXTZBurnParams>,
    ParamsHandler<RaribleBurnParams>,
    ParamsHandler<WtzMintOrBurnParams>,
    ParamsHandler<WTezBurnParams>
  ];
  mintOrBurn: [ParamsHandler<MintOrBurnParams>];
}

const WTZ_ADDRESSES = ['KT1PnUZCp3u2KzWr93pn4DD7HAJnm3rWVrgn', 'KT1K8xvaCCXYZbWS3iBYJH4ZbTtBqtthkvN2'];
const WTEZ_ADDRESSES = ['KT1UpeXdK6AJbX58GJ92pLZVCucn2DR8Nu4b', 'KT1L8ujeb25JWKa4yPB61ub4QG2NbaKfdJDK'];
const WXTZ_ADDRESSES = ['KT1VYsVfmobT7rsMVivvZ4J8i3bPiqz12NaH'];

function makeEntrypointsParamsHandlers(
  externalTxSenderPkh: string,
  senderPkh: string,
  opDestination: string,
  onBalanceChange: (tokenSlug: string, value: BigNumber, isNft: boolean | undefined) => void
): EntrypointsParamsHandlers {
  const onObjktOrHenMintParse = ({ token_id, address, amount }: ObjktMintParams | HenMintParams) => {
    if (address === externalTxSenderPkh) {
      onBalanceChange(toTokenSlug(opDestination, token_id.toFixed()), amount, true);
    }
  };

  return {
    transfer: [
      {
        schema: fa2TransferParamsSchema,
        onParse: fa2Transfers => {
          fa2Transfers.forEach(({ from_, txs }) =>
            txs.forEach(({ to_, amount, token_id }) => {
              const tokenSlug = toTokenSlug(opDestination, token_id.toFixed());

              if (from_ === to_) {
                return;
              }

              if (from_ === externalTxSenderPkh) {
                onBalanceChange(tokenSlug, amount.negated(), undefined);
              }
              if (to_ === externalTxSenderPkh) {
                onBalanceChange(tokenSlug, amount, undefined);
              }
            })
          );
        }
      },
      {
        schema: fa12TransferParamsSchema,
        onParse: ({ from, to, value }) => {
          const tokenSlug = toTokenSlug(opDestination);
          if (from === externalTxSenderPkh && to !== externalTxSenderPkh) {
            onBalanceChange(tokenSlug, value.negated(), false);
          }
          if (from !== externalTxSenderPkh && to === externalTxSenderPkh) {
            onBalanceChange(tokenSlug, value, false);
          }
        }
      }
    ],
    mint: [
      {
        schema: wXTZMintParamsSchema,
        acceptedOpDestinations: WXTZ_ADDRESSES,
        onParse: ({ to, value }) => {
          if (to === externalTxSenderPkh) {
            onBalanceChange(toTokenSlug(opDestination), value, false);
          }
        }
      },
      { schema: objktComMintParamsSchema, onParse: onObjktOrHenMintParse },
      { schema: henMintParamsSchema, onParse: onObjktOrHenMintParse },
      {
        schema: raribleMintParamsSchema,
        onParse: ({ itokenid, iowner, iamount }) => {
          if (iowner === externalTxSenderPkh) {
            onBalanceChange(toTokenSlug(opDestination, itokenid.toFixed()), iamount, true);
          }
        }
      },
      {
        schema: wtzMintOrBurnParamsSchema,
        acceptedOpDestinations: WTZ_ADDRESSES,
        onParse: ({ 0: receiver, 2: amount }) => {
          if (receiver === externalTxSenderPkh) {
            onBalanceChange(toTokenSlug(opDestination, 0), amount, false);
          }
        }
      },
      {
        schema: wtezMintParamsSchema,
        acceptedOpDestinations: WTEZ_ADDRESSES,
        onParse: (receiver, amount) => {
          if (receiver === externalTxSenderPkh) {
            onBalanceChange(toTokenSlug(opDestination, 0), amount, false);
          }
        }
      }
    ],
    burn: [
      {
        schema: wXTZBurnParamsSchema,
        acceptedOpDestinations: WXTZ_ADDRESSES,
        onParse: ({ from, value }) => {
          if (from === externalTxSenderPkh) {
            onBalanceChange(toTokenSlug(opDestination), value.negated(), false);
          }
        }
      },
      {
        schema: raribleBurnParamsSchema,
        onParse: ({ itokenid, iamount }) => {
          if (externalTxSenderPkh === senderPkh) {
            onBalanceChange(toTokenSlug(opDestination, itokenid.toFixed()), iamount.negated(), true);
          }
        }
      },
      {
        schema: wtzMintOrBurnParamsSchema,
        acceptedOpDestinations: WTZ_ADDRESSES,
        onParse: ({ 0: sender, 2: amount }) => {
          if (sender === externalTxSenderPkh) {
            onBalanceChange(toTokenSlug(opDestination, 0), amount.negated(), true);
          }
        }
      },
      {
        schema: wtezBurnParamsSchema,
        acceptedOpDestinations: WTEZ_ADDRESSES,
        onParse: ({ from_, amount }) => {
          if (from_ === externalTxSenderPkh) {
            onBalanceChange(toTokenSlug(opDestination, 0), amount.negated(), true);
          }
        }
      }
    ],
    mintOrBurn: [
      {
        schema: mintOrBurnOneEntrypointParamsSchema,
        onParse: ({ quantity, target }) => {
          if (target === externalTxSenderPkh) {
            onBalanceChange(toTokenSlug(opDestination), quantity, undefined);
          }
        }
      }
    ]
  };
}

export function parseTransactionParams(
  params: TransactionOperationParameter,
  externalTxSenderPkh: string,
  senderPkh: string,
  opDestination: string,
  mutezAmount: BigNumber,
  onBalanceChange: (tokenSlug: string, value: BigNumber, isNft: boolean | undefined) => void
) {
  const { entrypoint, value } = params;

  const handlers = makeEntrypointsParamsHandlers(externalTxSenderPkh, senderPkh, opDestination, onBalanceChange);
  if (entrypoint in handlers) {
    for (const handler of handlers[entrypoint as keyof EntrypointsParamsHandlers]) {
      const { schema, acceptedOpDestinations, onParse } = handler;
      if (
        (!acceptedOpDestinations || acceptedOpDestinations.includes(opDestination)) &&
        handleParams(schema, value, (value: any) => onParse(value, mutezAmount))
      ) {
        return;
      }
    }
  }
}
