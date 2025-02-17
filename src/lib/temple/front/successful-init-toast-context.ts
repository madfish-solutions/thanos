import { createContext } from 'react';

import { noop } from 'lodash';

type SuccessfulInitToastContextType = [string | undefined, ReactSetStateFn<string | undefined>];

export const SuccessfulInitToastContext = createContext<SuccessfulInitToastContextType>([undefined, noop]);
