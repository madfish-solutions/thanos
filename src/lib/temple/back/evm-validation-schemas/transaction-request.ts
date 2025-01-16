import {
  AccessList,
  RpcTransactionRequest,
  TransactionRequestEIP1559,
  TransactionRequestEIP2930,
  TransactionRequestEIP4844,
  TransactionRequestEIP7702,
  TransactionRequestLegacy
} from 'viem';
import type { RpcAuthorizationList } from 'viem/experimental';
import {
  array as arraySchema,
  ArraySchema,
  MixedSchema,
  mixed as mixedSchema,
  object as objectSchema,
  ObjectSchema,
  string as stringSchema
} from 'yup';

import { evmAddressValidationSchema, hexByteStringSchema, hexStringSchema } from './utils';

const undefinedSchema = mixedSchema()
  .nullable()
  .transform(() => undefined) as MixedSchema<undefined>;

const constantStringSchema = <T extends string>(value: T) => stringSchema<T>().oneOf([value]);

const rpcTransactionRequestBaseFragment = {
  from: evmAddressValidationSchema(),
  data: hexByteStringSchema(),
  gas: hexStringSchema(),
  nonce: hexStringSchema(),
  to: evmAddressValidationSchema(),
  value: hexStringSchema()
};

const legacyFeeValuesFragment = {
  gasPrice: hexStringSchema(),
  maxFeePerBlobGas: undefinedSchema,
  maxFeePerGas: undefinedSchema,
  maxPriorityFeePerGas: undefinedSchema
};

const eip1559FeeValuesFragment = {
  gasPrice: undefinedSchema,
  maxFeePerBlobGas: undefinedSchema,
  maxFeePerGas: hexStringSchema(),
  maxPriorityFeePerGas: hexStringSchema()
};

const rpcTransactionRequestLegacyValidationSchema: ObjectSchema<TransactionRequestLegacy<HexString, HexString, '0x0'>> =
  objectSchema({
    ...rpcTransactionRequestBaseFragment,
    ...legacyFeeValuesFragment,
    type: constantStringSchema('0x0')
  }).required();

const accessListSchema = () =>
  arraySchema(
    objectSchema({
      address: evmAddressValidationSchema().required(),
      storageKeys: arraySchema(hexStringSchema().required()).required()
    }).required()
    // @ts-expect-error
  ) as ArraySchema<AccessList | undefined, any, any, any>;

const rpcTransactionRequestEIP2930ValidationSchema: ObjectSchema<
  TransactionRequestEIP2930<HexString, HexString, '0x1'>
> = objectSchema({
  ...rpcTransactionRequestBaseFragment,
  ...legacyFeeValuesFragment,
  type: constantStringSchema('0x1'),
  accessList: accessListSchema()
}).required();

const rpcTransactionRequestEIP1559ValidationSchema: ObjectSchema<
  TransactionRequestEIP1559<HexString, HexString, '0x2'>
> = objectSchema({
  ...rpcTransactionRequestBaseFragment,
  ...eip1559FeeValuesFragment,
  type: constantStringSchema('0x2'),
  accessList: accessListSchema()
}).required();

const rpcTransactionRequestEIP4844ValidationSchema: ObjectSchema<
  TransactionRequestEIP4844<HexString, HexString, '0x3'>
> = objectSchema({
  ...rpcTransactionRequestBaseFragment,
  ...eip1559FeeValuesFragment,
  to: evmAddressValidationSchema().required().nullable(),
  maxFeePerBlobGas: hexStringSchema().required(),
  type: constantStringSchema('0x3'),
  accessList: accessListSchema(),
  blobs: arraySchema<any[]>().required(),
  blobVersionedHashes: mixedSchema<any>(),
  kzg: mixedSchema<any>(),
  sidecars: mixedSchema<any>()
}).required();

type RpcTransactionRequestEIP7702 = Omit<
  TransactionRequestEIP7702<HexString, HexString, '0x4'>,
  'authorizationList'
> & { authorizationList?: RpcAuthorizationList | undefined };

const authorizationListSchema = () =>
  arraySchema(
    objectSchema({
      address: evmAddressValidationSchema().required(),
      chainId: hexStringSchema().required(),
      nonce: hexStringSchema().required(),
      r: hexStringSchema().required(),
      s: hexStringSchema().required(),
      yParity: hexStringSchema().required()
    }).required()
    // @ts-expect-error
  ) as ArraySchema<RpcAuthorizationList | undefined, any, any, any>;

const rpcTransactionRequestEIP7702ValidationSchema: ObjectSchema<RpcTransactionRequestEIP7702> = objectSchema({
  ...rpcTransactionRequestBaseFragment,
  ...eip1559FeeValuesFragment,
  type: constantStringSchema('0x4'),
  accessList: accessListSchema(),
  authorizationList: authorizationListSchema()
}).required();

const transactionRequestSchemas = [
  rpcTransactionRequestLegacyValidationSchema,
  rpcTransactionRequestEIP2930ValidationSchema,
  rpcTransactionRequestEIP1559ValidationSchema,
  rpcTransactionRequestEIP4844ValidationSchema,
  rpcTransactionRequestEIP7702ValidationSchema
];
export const rpcTransactionRequestValidationSchema = () =>
  mixedSchema<RpcTransactionRequest>((value: unknown): value is RpcTransactionRequest => {
    for (const schema of transactionRequestSchemas) {
      try {
        schema.validateSync(value);

        return true;
      } catch {
        // Do nothing
      }
    }

    return false;
  });
