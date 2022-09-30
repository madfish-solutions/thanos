import React, { FC } from 'react';

import classNames from 'clsx';

import { NewsNotificationInterface, StatusType } from 'app/store/news/news-interfaces';

import { NewsDetailsButton } from '../components/NewsDetailsButton';
import { NewsIcon } from '../components/NewsIcon';
import { formatDate } from '../utils/formatDate';
import { truncateDescription, truncateTitle } from '../utils/truncate';

export const NewsNotificationsItem: FC<NewsNotificationInterface> = ({
  id,
  title,
  description,
  createdAt,
  status,
  type
}) => (
  <div
    className={classNames(
      'flex column font-inter',
      'p-4 pb-6',
      status === StatusType.Read && 'bg-gray-200',
      'border-gray-300'
    )}
    style={{
      borderBottomWidth: 1
    }}
  >
    <NewsIcon isDotVisible={status === StatusType.New} type={type} />
    <div style={{ marginLeft: 10 }} className="w-full">
      <div>
        <div
          className={classNames(
            'mb-2 text-sm font-medium',
            status === StatusType.Read ? 'text-gray-600' : 'text-black'
          )}
        >
          {truncateTitle(title)}
        </div>
        {truncateDescription(description)
          .split('\n')
          .map((x, index) => (
            <div key={index} className="text-gray-600 text-xs font-normal">
              {x}
            </div>
          ))}
      </div>
      <div className="flex row justify-between mt-7">
        <div className="text-gray-500 font-normal" style={{ fontSize: 10 }}>
          {formatDate(createdAt)}
        </div>
        <NewsDetailsButton newsId={id} />
      </div>
    </div>
  </div>
);
