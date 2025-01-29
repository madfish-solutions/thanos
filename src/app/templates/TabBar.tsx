import React, { FC } from 'react';

import clsx from 'clsx';

import { TestIDProps } from 'lib/analytics';
import { T, TID } from 'lib/i18n';
import { Link } from 'lib/woozie';

interface Props {
  activeTabName: string;
  tabs: TabsBarTabInterface[];
  withOutline?: boolean;
}

interface TabsBarTabInterface extends TestIDProps {
  name: string;
  titleI18nKey: TID;
}

export const TabsBar = React.forwardRef<HTMLDivElement, Props>(({ activeTabName, tabs, withOutline }, ref) => (
  <div ref={ref} className="flex items-center justify-center">
    {tabs.map(tab => (
      <TabButton key={tab.name} active={tab.name === activeTabName} withOutline={withOutline} {...tab} />
    ))}
  </div>
));

interface TabButtonProps extends TestIDProps {
  name: string;
  titleI18nKey: TID;
  active: boolean;
  withOutline?: boolean;
}

const TabButton: FC<TabButtonProps> = ({ name, titleI18nKey, active, withOutline, testID, testIDProperties }) => (
  <Link
    to={lctn => ({ ...lctn, search: `?tab=${name}` })}
    replace
    className={clsx(
      'flex1 w-full text-center cursor-pointer py-2 border-t-3',
      'text-gray-500 text-xs font-medium truncate',
      'transition ease-in-out duration-300',
      active
        ? 'border-primary-orange text-primary-orange'
        : clsx('hover:text-primary-orange', withOutline ? 'border-gray-100' : 'border-transparent')
    )}
    testID={testID}
    testIDProperties={testIDProperties}
  >
    <T id={titleI18nKey} />
  </Link>
);
