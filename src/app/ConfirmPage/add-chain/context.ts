import { useState } from 'react';

import constate from 'constate';

export const [AddChainDataProvider, useAddChainDataState] = constate(() => {
  const [testnet, setTestnet] = useState(false);

  return { testnet, setTestnet };
});
