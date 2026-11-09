import * as SQLite from 'expo-sqlite';
import type { MergeableStore } from 'tinybase';
import { createExpoSqlitePersister } from 'tinybase/persisters/persister-expo-sqlite';
import { createAppStore, seedDefaultData } from '@mm/core';

export interface PlatformStoreHandle {
  store: MergeableStore;
  role: 'phone-master' | 'web-thin-client';
  ready: Promise<void>;
}

let cachedHandle: PlatformStoreHandle | null = null;

/**
 * Native iOS store: persisted in on-device SQLite as the authoritative source of truth.
 */
export function getPlatformStore(): PlatformStoreHandle {
  if (cachedHandle) return cachedHandle;

  const store = createAppStore('iphone-master');
  const db = SQLite.openDatabaseSync('money-manager-vault.db');
  const persister = createExpoSqlitePersister(
    store,
    db as unknown as Parameters<typeof createExpoSqlitePersister>[1],
    'mm_vault_store'
  );

  const ready = (async () => {
    await persister.load();
    seedDefaultData(store);
    await persister.save();
    await persister.startAutoSave();
  })();

  cachedHandle = {
    store,
    role: 'phone-master',
    ready,
  };
  return cachedHandle;
}
