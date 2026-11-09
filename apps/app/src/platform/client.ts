import { Platform } from 'react-native';
import type { MergeableStore } from 'tinybase';
import { webSyncClient as nativeClient } from './client.native';
import { webSyncClient as webClient, type WebClientState } from './client.web';

export type { WebClientState };

export interface WebSyncClientInterface {
  subscribe: (listener: () => void) => () => void;
  getState: () => WebClientState;
  setPhoneUrl: (url: string) => void;
  setDeviceName: (name: string) => void;
  connectAndRequestApproval: (store: MergeableStore) => Promise<void>;
  syncNow: () => Promise<boolean>;
}

export const webSyncClient: WebSyncClientInterface =
  Platform.OS === 'web' ? webClient : nativeClient;
