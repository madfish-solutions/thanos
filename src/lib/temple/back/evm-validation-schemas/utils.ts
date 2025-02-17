import { Address, TypedDataDefinition, TypedDataDomain, getAddress, isAddress } from 'viem';
import {
  array as arraySchema,
  ObjectSchema,
  mixed as mixedSchema,
  number as numberSchema,
  object as objectSchema,
  string as stringSchema
} from 'yup';

export const evmAddressValidationSchema = () =>
  stringSchema<Address>()
    .test('valid', 'Invalid address', value => (value === undefined ? true : isAddress(value)))
    .transform(function (value: unknown) {
      return this.isType(value) && value && isAddress(value) ? getAddress(value) : value;
    });

const HEX_STRING_REGEX = /^0x([0-9a-f]*)$/i;
export const hexStringSchema = () => stringSchema<HexString>().matches(HEX_STRING_REGEX, 'Invalid hex string');

export const hexByteStringSchema = () =>
  hexStringSchema().test('even-digits', 'String must contain even amount of digits', value => {
    if (value === undefined) {
      return true;
    }

    const match = value.match(HEX_STRING_REGEX);

    return !match || match[1].length % 2 === 0;
  });

const typedDataTypeSchema = arraySchema()
  .of(
    objectSchema({
      name: stringSchema().required(),
      type: stringSchema().required()
    }).required()
  )
  .required();

const typedDataDomainSchema: ObjectSchema<TypedDataDomain> = objectSchema().shape({
  chainId: numberSchema().integer().positive(),
  name: stringSchema().min(1),
  salt: hexByteStringSchema(),
  verifyingContract: evmAddressValidationSchema(),
  version: stringSchema().min(1)
});

const typedDataTypesSchema = objectSchema().test(
  'valid-types',
  'Invalid types',
  (value: StringRecord<unknown> | undefined) => {
    if (value === undefined) {
      return true;
    }

    const keys = Object.keys(value);

    return (
      keys.includes('EIP712Domain') &&
      keys.every(key => {
        try {
          typedDataTypeSchema.validateSync(value[key]);

          return true;
        } catch {
          return false;
        }
      })
    );
  }
);

const arbitraryObjectSchema: ObjectSchema<StringRecord<unknown>> = objectSchema().required();

// TODO: Implement stricter validation
export const oldTypedDataValidationSchema = () =>
  arraySchema().of(
    objectSchema({
      name: stringSchema().required(),
      type: stringSchema().required(),
      value: mixedSchema().required()
    }).required()
  );

// TODO: Implement stricter validation
export const typedDataValidationSchema = (): ObjectSchema<TypedDataDefinition> =>
  objectSchema({
    types: typedDataTypesSchema,
    primaryType: stringSchema().required(),
    domain: typedDataDomainSchema,
    message: arbitraryObjectSchema
  });

export const stringArraySchema = () => arraySchema().of(stringSchema().required());
