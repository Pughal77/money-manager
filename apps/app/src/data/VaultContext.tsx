import React, { createContext, useContext, useEffect, useState } from 'react';
import type { MergeableStore } from 'tinybase';
import { getPlatformStore } from '../platform/store';
import { webSyncClient, type WebClientState } from '../platform/client';
import { phoneLanServer, type LanServerSnapshot } from '../server/lanServer';

interface VaultContextValue {
  store: MergeableStore;
  role: 'phone-master' | 'web-thin-client';
  version: number;
  webState: WebClientState;
  lanState: LanServerSnapshot;
  selectedMonth: string;
  setSelectedMonth: React.Dispatch<React.SetStateAction<string>>;
  selectedDate: string;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const handle = getPlatformStore();
  const [ready, setReady] = useState(handle.role === 'web-thin-client');
  const [version, setVersion] = useState(0);
  const [webState, setWebState] = useState<WebClientState>(() => webSyncClient.getState());
  const [lanState, setLanState] = useState<LanServerSnapshot>(() => phoneLanServer.getState());
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    let mounted = true;
    handle.ready.then(() => {
      if (mounted) {
        setReady(true);
        setVersion((v) => v + 1);
      }
    });

    const listenerId = handle.store.addDidFinishTransactionListener(() => {
      if (mounted) {
        setVersion((v) => v + 1);
      }
    });

    const unsubWeb = webSyncClient.subscribe(() => {
      if (mounted) setWebState(webSyncClient.getState());
    });

    const unsubLan = phoneLanServer.subscribe(() => {
      if (mounted) setLanState(phoneLanServer.getState());
    });

    // On web, automatically attempt connection on startup
    if (handle.role === 'web-thin-client' && webSyncClient.getState().phase === 'disconnected') {
      void webSyncClient.connectAndRequestApproval(handle.store);
    }

    return () => {
      mounted = false;
      handle.store.delListener(listenerId);
      unsubWeb();
      unsubLan();
    };
  }, [handle]);

  if (!ready) {
    return null;
  }

  return (
    <VaultContext.Provider
      value={{
        store: handle.store,
        role: handle.role,
        version,
        webState,
        lanState,
        selectedMonth,
        setSelectedMonth,
        selectedDate,
        setSelectedDate,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) {
    throw new Error('useVault must be used within VaultProvider');
  }
  return ctx;
}
