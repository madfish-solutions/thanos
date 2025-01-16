import React, { FC, memo, useCallback, useMemo, useState } from 'react';

import BigNumber from 'bignumber.js';
import classNames from 'clsx';
import { Collapse } from 'react-collapse';

import { OldStyleHashChip, Money, Identicon } from 'app/atoms';
import PlainAssetInput from 'app/atoms/PlainAssetInput';
import { ReactComponent as ChevronDownIcon } from 'app/icons/chevron-down.svg';
import { ReactComponent as ClipboardIcon } from 'app/icons/clipboard.svg';
import InFiat from 'app/templates/InFiat';
import { setTestID } from 'lib/analytics';
import { TEZ_TOKEN_SLUG, getTezosGasSymbol } from 'lib/assets';
import { TProps, T, t } from 'lib/i18n';
import { useTezosAssetMetadata, getAssetSymbol } from 'lib/metadata';
import { RawOperationAssetExpense, RawOperationExpenses } from 'lib/temple/front';
import { mutezToTz, tzToMutez } from 'lib/temple/helpers';
import { SerializedEstimate } from 'lib/temple/types';
import { TezosNetworkEssentials } from 'temple/networks';

import OperationsBanner from '../OperationsBanner/OperationsBanner';
import { OperationsBannerSelectors } from '../OperationsBanner/OperationsBanner.selectors';

import styles from './ExpensesView.module.css';

type OperationAssetExpense = Omit<RawOperationAssetExpense, 'tokenAddress'> & {
  assetSlug: string;
};

type OperationExpenses = Omit<RawOperationExpenses, 'expenses'> & {
  expenses: OperationAssetExpense[];
};

interface ExpensesViewProps {
  tezosNetwork: TezosNetworkEssentials;
  expenses?: OperationExpenses[];
  estimates?: SerializedEstimate[];
  modifyFeeAndLimit?: ModifyFeeAndLimit;
  gasFeeError?: boolean;
  error?: any;
}

export interface ModifyFeeAndLimit {
  totalFee: number;
  onTotalFeeChange: (totalFee: number) => void;
  storageLimit: number | null;
  onStorageLimitChange: (storageLimit: number) => void;
}

const MAX_GAS_FEE = 1000;

const ExpensesView: FC<ExpensesViewProps> = ({
  tezosNetwork,
  expenses,
  estimates,
  modifyFeeAndLimit,
  gasFeeError,
  error
}) => {
  const symbol = getTezosGasSymbol(tezosNetwork.chainId);
  const [showDetails, setShowDetails] = useState(false);

  const toggleShowDetails = useCallback(() => setShowDetails(prevValue => !prevValue), []);
  const modifyFeeAndLimitSection = useMemo(() => {
    if (!modifyFeeAndLimit) return null;

    let defaultGasFeeMutez = new BigNumber(0);
    let storageFeeMutez = new BigNumber(0);
    if (estimates) {
      try {
        let i = 0;
        for (const e of estimates) {
          defaultGasFeeMutez = defaultGasFeeMutez.plus(e.suggestedFeeMutez);
          storageFeeMutez = storageFeeMutez.plus(
            Math.ceil(
              (i === 0 ? modifyFeeAndLimit.storageLimit ?? e.storageLimit : e.storageLimit) *
                Number(e.minimalFeePerStorageByteMutez)
            )
          );
          i++;
        }
      } catch {
        return null;
      }
    }

    const gasFee = mutezToTz(modifyFeeAndLimit.totalFee);
    const defaultGasFee = mutezToTz(defaultGasFeeMutez);
    const storageFee = mutezToTz(storageFeeMutez);

    return (
      <div className="w-full flex flex-col">
        {[
          {
            key: 'totalFee',
            title: t('gasFee'),
            value: gasFee,
            onChange: modifyFeeAndLimit.onTotalFeeChange
          },
          {
            key: 'storageFeeMax',
            title: t('storageFeeMax'),
            value: storageFee
          },
          ...(modifyFeeAndLimit.storageLimit !== null
            ? [
                {
                  key: 'storageLimit',
                  title: t('storageLimit'),
                  value: modifyFeeAndLimit.storageLimit,
                  onChange: modifyFeeAndLimit.onStorageLimitChange
                }
              ]
            : [])
        ].map(({ key, title, value, onChange }, i, arr) => (
          <div key={key} className={classNames('w-full flex items-center', i !== arr.length - 1 && 'mb-1')}>
            <div className="whitespace-nowrap overflow-x-auto no-scrollbar opacity-90" style={{ maxWidth: '45%' }}>
              {title}
            </div>
            <div className="mr-1">:</div>

            <div className="flex-1" />

            {value instanceof BigNumber ? (
              <>
                <div className="mr-1">
                  {onChange ? (
                    <>
                      <PlainAssetInput
                        value={value.toFixed()}
                        onChange={val => {
                          onChange?.(tzToMutez(val ?? defaultGasFee).toNumber());
                        }}
                        max={MAX_GAS_FEE}
                        placeholder={defaultGasFee.toFixed()}
                        className={classNames(
                          'mr-1',
                          'appearance-none',
                          'w-24',
                          'py-px px-1',
                          'border',
                          gasFeeError ? 'border-red-300' : 'border-gray-300',
                          'focus:border-primary-orange',
                          'bg-gray-100 focus:bg-transparent',
                          'focus:outline-none focus:shadow-outline',
                          'transition ease-in-out duration-200',
                          'rounded',
                          'text-right',
                          'text-gray-700 text-sm leading-tight',
                          'placeholder-gray-600'
                        )}
                      />
                      {symbol}
                    </>
                  ) : (
                    <span className="flex items-baseline">
                      <span className="font-medium">
                        <Money>{value}</Money>
                      </span>
                      <span className="ml-1">{symbol}</span>
                    </span>
                  )}
                </div>

                <InFiat
                  chainId={tezosNetwork.chainId}
                  assetSlug={TEZ_TOKEN_SLUG}
                  volume={value}
                  roundingMode={BigNumber.ROUND_UP}
                >
                  {({ balance, symbol }) => (
                    <div className="flex">
                      <span className="opacity-75">(</span>
                      {balance}
                      <span className="pr-px ml-1">{symbol}</span>
                      <span className="opacity-75">)</span>
                    </div>
                  )}
                </InFiat>
              </>
            ) : (
              <input
                type="number"
                value={value || ''}
                onChange={e => {
                  if (e.target.value.length > 8) return;
                  const val = +e.target.value;
                  onChange?.(val > 0 ? val : 0);
                }}
                placeholder="0"
                className={classNames(
                  'appearance-none',
                  'w-24',
                  'py-px pl-1',
                  'border',
                  'border-gray-300',
                  'focus:border-primary-orange',
                  'bg-gray-100 focus:bg-transparent',
                  'focus:outline-none focus:shadow-outline',
                  'transition ease-in-out duration-200',
                  'rounded',
                  'text-right',
                  'text-gray-700 text-sm leading-tight',
                  'placeholder-gray-600'
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  }, [modifyFeeAndLimit, estimates, gasFeeError, symbol, tezosNetwork.chainId]);

  if (!expenses) {
    return null;
  }

  return (
    <>
      <div
        className={classNames(
          'relative rounded-md overflow-y-auto border',
          'flex flex-col text-gray-700 text-sm leading-tight'
        )}
        style={{ height: gasFeeError ? '10rem' : '11rem' }}
      >
        {expenses.map((item, index, arr) => (
          <ExpenseViewItem
            key={index}
            tezosChainId={tezosNetwork.chainId}
            item={item}
            last={index === arr.length - 1}
          />
        ))}

        {modifyFeeAndLimit && (
          <>
            <div className="flex-1" />

            <div
              className={classNames(
                'sticky bottom-0 left-0 right-0',
                'flex items-center',
                'px-2 py-1',
                'bg-gray-200 bg-opacity-90 border-t',
                'text-sm text-gray-700'
              )}
            >
              {modifyFeeAndLimitSection}
            </div>
          </>
        )}
      </div>
      {gasFeeError && (
        <p className="text-xs text-red-600 pt-1 h-4">
          <T id="gasFeeMustBePositive" />
        </p>
      )}
      {error && (
        <div className="rounded-lg flex flex-col border border-red-700 my-2 py-2 px-4 justify-center">
          <div className="relative flex justify-center">
            <span className="text-red-700 text-center" {...setTestID(OperationsBannerSelectors.errorText)}>
              <T id="txIsLikelyToFail" />
            </span>
            <button
              className={classNames(
                'absolute right-0 top-0 flex items-center justify-center w-4 h-4 rounded',
                'bg-gray-200 text-gray-500 transform transition-transform duration-500',
                showDetails && 'rotate-180'
              )}
              onClick={toggleShowDetails}
              {...setTestID(OperationsBannerSelectors.errorDropDownButton)}
            >
              <ChevronDownIcon className="w-4 h-4 stroke-1 stroke-current" />
            </button>
          </div>
          <Collapse
            theme={{ collapse: styles.ReactCollapse }}
            isOpened={showDetails}
            initialStyle={{ height: '0px', overflow: 'hidden' }}
          >
            <div className="flex flex-col mt-2">
              <OperationsBanner copyButtonClassName="pr-8 pt-4" opParams={error ?? {}} />
            </div>
          </Collapse>
        </div>
      )}
    </>
  );
};

export default ExpensesView;

interface ExpenseViewItemProps {
  tezosChainId: string;
  item: OperationExpenses;
  last: boolean;
}

const ExpenseViewItem: FC<ExpenseViewItemProps> = ({ tezosChainId, item, last }) => {
  const operationTypeLabel = useMemo(() => {
    switch (item.type) {
      // TODO: add translations for other operations types
      case 'transaction':
      case 'transfer':
        return `↑ ${t('transfer')}`;
      case 'approve':
        return t('approveToken');
      case 'delegation':
        return item.delegate ? t('delegation') : t('undelegation');
      default:
        return item.isEntrypointInteraction ? (
          <>
            <ClipboardIcon className="mr-1 h-3 w-auto stroke-current inline align-text-top" />
            <T id="interaction" />
          </>
        ) : (
          t('transactionOfSomeType', item.type)
        );
    }
  }, [item]);

  const { iconHash, iconType, argumentDisplayProps } = useMemo<{
    iconHash: string;
    iconType: 'botttsneutral' | 'jdenticon';
    argumentDisplayProps?: OperationArgumentDisplayProps;
  }>(() => {
    const receivers = [
      ...new Set(
        item.expenses
          .map(({ to }) => to)
          .filter(value => (item.contractAddress ? value !== item.contractAddress : !!value))
      )
    ];

    switch (item.type) {
      case 'transaction':
      case 'transfer':
        return {
          iconHash: item.expenses[0]?.to || 'unknown',
          iconType: 'botttsneutral',
          argumentDisplayProps: {
            i18nKey: 'transferToSmb',
            arg: receivers
          }
        };

      case 'approve':
        return {
          iconHash: item.expenses[0]?.to || 'unknown',
          iconType: 'jdenticon',
          argumentDisplayProps: {
            i18nKey: 'approveForSmb',
            arg: receivers
          }
        };

      case 'delegation':
        if (item.delegate) {
          return {
            iconHash: item.delegate,
            iconType: 'botttsneutral',
            argumentDisplayProps: {
              i18nKey: 'delegationToSmb',
              arg: [item.delegate]
            }
          };
        }

        return {
          iconHash: 'none',
          iconType: 'jdenticon'
        };

      default:
        return item.isEntrypointInteraction
          ? {
              iconHash: item.contractAddress!,
              iconType: 'jdenticon',
              argumentDisplayProps: {
                i18nKey: 'interactionWithContract',
                arg: [item.contractAddress!]
              }
            }
          : {
              iconHash: 'unknown',
              iconType: 'jdenticon'
            };
    }
  }, [item]);

  const withdrawal = useMemo(() => ['transaction', 'transfer'].includes(item.type), [item.type]);

  return (
    <div className={classNames('pt-3 pb-2 px-2 flex items-stretch', !last && 'border-b border-gray-200')}>
      <div className="mr-2">
        <Identicon hash={iconHash} type={iconType} size={40} className="shadow-xs" />
      </div>

      <div className="flex-1 flex-col">
        <div className="mb-1 text-xs text-gray-500 font-light flex flex-wrap">
          <span className="mr-1 flex items-center text-blue-600 opacity-100">{operationTypeLabel}</span>

          {argumentDisplayProps && <OperationArgumentDisplay {...argumentDisplayProps} />}
        </div>

        <div className="flex items-end flex-shrink-0 flex-wrap text-gray-800">
          {item.expenses
            .filter(expense => new BigNumber(expense.amount).isGreaterThan(0))
            .map((expense, index, arr) => (
              <span key={index}>
                <OperationVolumeDisplay
                  tezosChainId={tezosChainId}
                  expense={expense}
                  volume={item.amount}
                  withdrawal={withdrawal}
                />
                {index === arr.length - 1 ? null : ',\u00a0'}
              </span>
            ))}

          {item.expenses.length === 0 && item.amount && new BigNumber(item.amount).isGreaterThan(0) ? (
            <OperationVolumeDisplay tezosChainId={tezosChainId} volume={item.amount!} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

type OperationArgumentDisplayProps = {
  i18nKey: TProps['id'];
  arg: string[];
};

const OperationArgumentDisplay = memo<OperationArgumentDisplayProps>(({ i18nKey, arg }) => (
  <T
    id={i18nKey}
    substitutions={
      <>
        {arg.map((value, index) => (
          <span key={index}>
            &nbsp;
            <OldStyleHashChip className="text-blue-600 opacity-75" key={index} hash={value} type="link" />
            {index === arg.length - 1 ? null : ','}
          </span>
        ))}
      </>
    }
  />
));

interface OperationVolumeDisplayProps {
  tezosChainId: string;
  expense?: OperationAssetExpense;
  volume?: number;
  withdrawal?: boolean;
}

const OperationVolumeDisplay = memo<OperationVolumeDisplayProps>(({ tezosChainId, expense, volume }) => {
  const metadata = useTezosAssetMetadata(expense?.assetSlug ?? TEZ_TOKEN_SLUG, tezosChainId);

  const finalVolume = expense ? expense.amount.div(10 ** (metadata?.decimals || 0)) : volume;

  return (
    <>
      <span className="text-sm flex items-center">
        {/* {withdrawal && "-"} */}
        <span className="font-medium">
          <Money>{finalVolume || 0}</Money>
        </span>
        <span className="ml-1">{getAssetSymbol(metadata, true)}</span>
      </span>

      {expense?.assetSlug && (
        <InFiat volume={finalVolume || 0} chainId={tezosChainId} assetSlug={expense.assetSlug}>
          {({ balance, symbol }) => (
            <div className="text-xs text-gray-500 ml-1 flex items-baseline">
              ({balance}
              <span className="mr-px">{symbol}</span>)
            </div>
          )}
        </InFiat>
      )}
    </>
  );
});
