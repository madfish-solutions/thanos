import React, { FC } from 'react';

import clsx from 'clsx';
import { Controller, useFormContext } from 'react-hook-form-v7';
import ReactJson from 'react-json-view';

import { IconBase, NoSpaceField } from 'app/atoms';
import AssetField from 'app/atoms/AssetField';
import { CopyButton } from 'app/atoms/CopyButton';
import { Tooltip } from 'app/atoms/Tooltip';
import { ReactComponent as CopyIcon } from 'app/icons/base/copy.svg';
import { t } from 'lib/i18n';

import { useEvmEstimationDataState } from '../context';
import { EvmTxParamsFormData, TezosTxParamsFormData } from '../types';
import { validateNonZero } from '../utils';

interface AdvancedTabProps {
  isEvm?: boolean;
}

export const AdvancedTab: FC<AdvancedTabProps> = ({ isEvm = false }) => {
  return isEvm ? <EvmContent /> : <TezosContent />;
};

const EvmContent = () => {
  const { control, getValues, formState } = useFormContext<EvmTxParamsFormData>();
  const { errors } = formState;
  const { data } = useEvmEstimationDataState();

  const gasLimitError = errors.gasLimit?.message;
  const nonceError = errors.nonce?.message;

  return (
    <>
      <FieldLabelWithTooltip title={t('gasLimit')} tooltipContent={t('gasLimitInfoContent')} />

      <Controller
        name="gasLimit"
        control={control}
        rules={{ validate: v => validateNonZero(v, t('gasLimit')) }}
        render={({ field: { value, onChange, onBlur } }) => (
          <AssetField
            value={value || data?.gas.toString()}
            placeholder="0.00"
            min={0}
            onlyInteger
            onChange={v => onChange(v ?? '')}
            onBlur={onBlur}
            errorCaption={gasLimitError}
            containerClassName="mb-3"
          />
        )}
      />

      <FieldLabelWithTooltip title={t('nonce')} tooltipContent={t('nonceInfoContent')} />

      <Controller
        name="nonce"
        control={control}
        rules={{ validate: v => validateNonZero(v, t('nonce')) }}
        render={({ field: { value, onChange, onBlur } }) => (
          <AssetField
            value={value || data?.nonce}
            placeholder="0"
            min={0}
            onlyInteger
            onChange={v => onChange(v ?? '')}
            onBlur={onBlur}
            errorCaption={nonceError}
            containerClassName="mb-3"
          />
        )}
      />

      <FieldLabelWithCopyButton title="Data" copyableText={data?.data ?? ''} />

      <Controller
        name="data"
        control={control}
        render={() => (
          <NoSpaceField
            value={data?.data}
            textarea
            rows={5}
            readOnly
            placeholder="Info"
            style={{ resize: 'none' }}
            reserveSpaceForError={false}
            containerClassName="mb-2"
          />
        )}
      />

      <FieldLabelWithCopyButton title="RAW Transaction" copyableText={getValues().rawTransaction} />

      <Controller
        name="rawTransaction"
        control={control}
        render={({ field }) => (
          <NoSpaceField
            textarea
            rows={5}
            readOnly
            placeholder="Info"
            style={{ resize: 'none' }}
            {...field}
            reserveSpaceForError={false}
            containerClassName="mb-5"
          />
        )}
      />
    </>
  );
};

const TezosContent = () => {
  const { control, getValues } = useFormContext<TezosTxParamsFormData>();

  const rawTransaction = getValues().raw;
  const rawTransactionStr = rawTransaction ? JSON.stringify(rawTransaction) : '';

  return (
    <>
      <FieldLabelWithCopyButton title="RAW Transaction" copyableText={rawTransactionStr} />

      <Controller
        name="raw"
        control={control}
        render={({ field: { value } }) => (
          <div className="w-full h-44 p-3 mb-3 bg-input-low rounded-lg overflow-scroll">
            <ReactJson
              src={value ?? {}}
              name={null}
              iconStyle="square"
              indentWidth={4}
              collapseStringsAfterLength={36}
              enableClipboard={false}
              displayObjectSize={false}
              displayDataTypes={false}
            />
          </div>
        )}
      />

      <FieldLabelWithCopyButton title="Bytes" copyableText={getValues().bytes} />

      <Controller
        name="bytes"
        control={control}
        render={({ field }) => (
          <NoSpaceField
            textarea
            rows={5}
            readOnly
            placeholder="Info"
            style={{ resize: 'none' }}
            {...field}
            reserveSpaceForError={false}
            containerClassName="mb-5"
          />
        )}
      />
    </>
  );
};

interface FieldLabelProps extends PropsWithChildren {
  title: string;
  className?: string;
}

const FieldLabel: FC<FieldLabelProps> = ({ title, className, children }) => (
  <div className={clsx('mb-1 px-1 flex flex-row justify-between items-center', className)}>
    <p className="text-font-description-bold">{title}</p>
    {children}
  </div>
);

interface FieldLabelWithTooltipProps extends Pick<FieldLabelProps, 'title'> {
  tooltipContent: string;
}

const FieldLabelWithTooltip: FC<FieldLabelWithTooltipProps> = ({ title, tooltipContent }) => (
  <FieldLabel title={title}>
    <Tooltip content={tooltipContent} size={16} className="text-grey-2" />
  </FieldLabel>
);

interface FieldLabelWithCopyButtonProps extends Pick<FieldLabelProps, 'title'> {
  copyableText: string;
}

const FieldLabelWithCopyButton: FC<FieldLabelWithCopyButtonProps> = ({ title, copyableText }) => (
  <FieldLabel title={title} className="p-1">
    <CopyButton text={copyableText} className="text-secondary flex text-font-description-bold items-center">
      <span>Copy</span>
      <IconBase size={12} Icon={CopyIcon} />
    </CopyButton>
  </FieldLabel>
);
