import React, { createContext, useContext, useState, useCallback } from 'react';

interface PinContextType {
  isLocked: boolean;
  lock: () => void;
  unlock: () => void;
}

const PinContext = createContext<PinContextType | null>(null);

export function usePin(): PinContextType {
  const context = useContext(PinContext);
  if (!context) {
    throw new Error('usePin must be used within PinProvider');
  }
  return context;
}

export function PinProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);

  const lock = useCallback(() => {
    setIsLocked(true);
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const value: PinContextType = {
    isLocked,
    lock,
    unlock,
  };

  return <PinContext.Provider value={value}>{children}</PinContext.Provider>;
}
