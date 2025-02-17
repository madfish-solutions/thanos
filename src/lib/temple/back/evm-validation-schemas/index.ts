import {
  mixed as mixedSchema,
  object as objectSchema,
  tuple as tupleSchema,
  number as numberSchema,
  string as stringSchema,
  TupleSchema
} from 'yup';

import { evmRpcMethodsNames } from 'temple/evm/constants';
import { ChangePermissionsPayload } from 'temple/evm/types';

import { rpcTransactionRequestValidationSchema } from './transaction-request';
import {
  evmAddressValidationSchema,
  hexByteStringSchema,
  hexStringSchema,
  oldTypedDataValidationSchema,
  stringArraySchema,
  typedDataValidationSchema
} from './utils';

export const ethOldSignTypedDataValidationSchema = tupleSchema([
  oldTypedDataValidationSchema().required(),
  evmAddressValidationSchema().required()
]).required();

export const ethSignTypedDataValidationSchema = tupleSchema([
  evmAddressValidationSchema().required(),
  typedDataValidationSchema().json().required()
]).required();

const ethPersonalSignSchemas = [
  tupleSchema([
    hexByteStringSchema().required(),
    evmAddressValidationSchema().required(),
    stringSchema().required().nullable()
  ]),
  tupleSchema([hexByteStringSchema().required(), evmAddressValidationSchema().required()])
];
export const ethPersonalSignPayloadValidationSchema = mixedSchema<
  [HexString, HexString, string | null] | [HexString, HexString]
>((value: unknown): value is [HexString, HexString, string] | [HexString, HexString] => {
  for (const schema of ethPersonalSignSchemas) {
    try {
      schema.validateSync(value);

      return true;
    } catch {
      // Do nothing
    }
  }

  return false;
}).required();

export const addEthAssetPayloadValidationSchema = objectSchema()
  .shape({
    type: stringSchema().required(),
    options: objectSchema()
      .shape({
        address: evmAddressValidationSchema().required()
      })
      .required()
  })
  .required();

export const addEthChainPayloadValidationSchema = tupleSchema([
  objectSchema()
    .shape({
      chainId: stringSchema().required(),
      chainName: stringSchema().required(),
      nativeCurrency: objectSchema()
        .shape({
          name: stringSchema().required(),
          symbol: stringSchema().required(),
          decimals: numberSchema().integer().positive().required()
        })
        .required(),
      rpcUrls: stringArraySchema().required(),
      blockExplorerUrls: stringArraySchema(),
      iconUrls: stringArraySchema()
    })
    .required(),
  hexStringSchema()
]).required();

export const switchEthChainPayloadValidationSchema = tupleSchema([
  objectSchema().shape({
    chainId: numberSchema().integer().positive().required()
  })
]).required();

export const ethChangePermissionsPayloadValidationSchema: TupleSchema<[ChangePermissionsPayload]> = tupleSchema([
  objectSchema()
    .shape({ [evmRpcMethodsNames.eth_accounts]: objectSchema().required() })
    .required()
]).required();

export const personalSignRecoverPayloadValidationSchema = tupleSchema([
  hexByteStringSchema().required(),
  hexByteStringSchema().required()
]).required();

export const sendTransactionPayloadValidationSchema = tupleSchema([
  rpcTransactionRequestValidationSchema().required()
]).required();
