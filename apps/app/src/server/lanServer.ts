import { Platform } from 'react-native';
import type { MergeableStore } from 'tinybase';
import { phoneLanServer as nativeServer, type LanServerSnapshot } from './lanServer.native';
import { phoneLanServer as webServer } from './lanServer.web';

export type { LanServerSnapshot };

export interface PhoneLanServerInterface {
  readonly approval: {
    approve: (requestId: string) => unknown;
    deny: (requestId: string) => unknown;
    revokeToken: (token: string) => void;
  };
  subscribe: (listener: () => void) => () => void;
  getState: () => LanServerSnapshot;
  start: (store: MergeableStore, port?: number) => Promise<string>;
  stop: () => void;
}

export const phoneLanServer: PhoneLanServerInterface =
  Platform.OS === 'web' ? webServer : nativeServer;
