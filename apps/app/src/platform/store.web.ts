import type { MergeableStore } from 'tinybase';
import { createAppStore, uuidv7 } from '@mm/core';

export interface PlatformStoreHandle {
  store: MergeableStore;
  role: 'phone-master' | 'web-thin-client';
  ready: Promise<void>;
}

let cachedHandle: PlatformStoreHandle | null = null;

/**
 * Web store: strictly in-memory only.
 * Writes nothing to localStorage, IndexedDB, sessionStorage, or cookies.
 * Populated from the iPhone's local network HTTP server (`GET /api/snapshot`).
 */
export function getPlatformStore(): PlatformStoreHandle {
  if (cachedHandle) return cachedHandle;

  const store = createAppStore(`web-client-${uuidv7().slice(-8)}`);

  cachedHandle = {
    store,
    role: 'web-thin-client',
    ready: Promise.resolve(),
  };
  return cachedHandle;
}
