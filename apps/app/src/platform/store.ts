import { Platform } from 'react-native';
import type { MergeableStore } from 'tinybase';
import { getPlatformStore as getNativeStore } from './store.native';
import { getPlatformStore as getWebStore } from './store.web';

export interface PlatformStoreHandle {
  store: MergeableStore;
  role: 'phone-master' | 'web-thin-client';
  ready: Promise<void>;
}

export function getPlatformStore(): PlatformStoreHandle {
  return Platform.OS === 'web' ? getWebStore() : getNativeStore();
}
