import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TzktApiChainId, createTzktWsConnection } from 'lib/apis/tzkt';

export const useTzktConnection = (chainId: TzktApiChainId) => {
  const [connectionReady, setConnectionReadyState] = useState(false);
  const connectionReadyRef = useRef(connectionReady);
  const shouldShutdownConnection = useRef(false);

  const setConnectionReady = useCallback((newState: boolean) => {
    connectionReadyRef.current = newState;
    setConnectionReadyState(newState);
  }, []);

  const connection = useMemo(() => createTzktWsConnection(chainId), [chainId]);

  const initConnection = useCallback(async () => {
    setConnectionReady(false);

    try {
      await connection.start();
      shouldShutdownConnection.current = false;
      connection.onclose(e => {
        if (!shouldShutdownConnection.current) {
          console.error(e);
          setConnectionReady(false);
          setTimeout(() => initConnection(), 1000);
        }
      });

      setConnectionReady(true);
    } catch (e) {
      console.error(e);
    }
  }, [connection, setConnectionReady]);

  useEffect(() => {
    initConnection();

    return () => {
      if (connectionReadyRef.current) {
        shouldShutdownConnection.current = true;
        connection.stop().catch(e => console.error(e));
      }
    };
  }, [connection, initConnection]);

  return { connection, connectionReady };
};
