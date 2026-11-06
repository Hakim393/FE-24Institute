// Connection State Context: tracks live API vs UI Preview mode
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface ConnectionContextType {
  isConnected: boolean;
  isChecking: boolean;
  isForcedMock: boolean;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  setForceMock: (force: boolean) => void;
  checkHealth: () => Promise<boolean>;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(api.isConnected());
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isForcedMock, setIsForcedMockState] = useState<boolean>(api.isForcedMock());
  const [baseUrl, setBaseUrlState] = useState<string>(api.getBaseUrl());

  const checkHealth = async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      const ok = await api.checkBackendHealth();
      setIsConnected(ok);
      return ok;
    } finally {
      setIsChecking(false);
    }
  };

  const handleSetForceMock = (force: boolean) => {
    api.setForceMock(force);
    setIsForcedMockState(force);
    setIsConnected(!force && api.isConnected());
  };

  const handleSetBaseUrl = (url: string) => {
    api.setBaseUrl(url);
    setBaseUrlState(url);
    checkHealth();
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        isConnected,
        isChecking,
        isForcedMock,
        baseUrl,
        setBaseUrl: handleSetBaseUrl,
        setForceMock: handleSetForceMock,
        checkHealth,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = (): ConnectionContextType => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return context;
};
