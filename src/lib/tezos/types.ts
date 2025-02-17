import { MichelsonMap } from '@taquito/michelson-encoder';
import BigNumber from 'bignumber.js';

interface Fa2Transaction {
  to_: string;
  amount: BigNumber;
  token_id: BigNumber;
}

export interface ParameterFa2TransferValue {
  txs: Fa2Transaction[];
  from_: string;
}

export interface ParameterFa12Transfer {
  from: string;
  to: string;
  value: BigNumber;
}

export interface ObjktMintParams {
  address: string;
  amount: BigNumber;
  metadata: MichelsonMap<string, string>;
  token_id: BigNumber;
}

export interface HenMintParams {
  address: string;
  amount: BigNumber;
  token_id: BigNumber;
  token_info: MichelsonMap<string, string>;
}

/** This interface is incomplete */
export interface RaribleMintParams {
  itokenid: BigNumber;
  iowner: string;
  iamount: BigNumber;
}

export interface RaribleBurnParams {
  itokenid: BigNumber;
  iamount: BigNumber;
}

export interface MintOrBurnParams {
  quantity: BigNumber;
  target: string;
}

export interface WtzMintOrBurnParams {
  /** Receiver or sender */
  '0': string;
  /** Unknown */
  '1': BigNumber;
  /** Amount */
  '2': BigNumber;
}

export interface WTezBurnParams {
  from_: string;
  receiver: string;
  amount: BigNumber;
}

export interface wXTZMintParams {
  to: string;
  value: BigNumber;
}

export interface wXTZBurnParams {
  from: string;
  value: BigNumber;
}
