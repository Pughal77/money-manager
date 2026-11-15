import type { MergeableStore } from 'tinybase';
import type { BrowserApprovalRequest, SyncLogEntry } from '@mm/http-lite';

export interface LanServerSnapshot {
  running: boolean;
  mode: 'stopped' | 'direct-tcp' | 'expo-go-bridge';
  url: string | null;
  port: number;
  pendingRequests: BrowserApprovalRequest[];
  approvedDevices: Array<{ token: string; deviceName: string; approvedAt: string }>;
  logs: SyncLogEntry[];
  lastError?: string;
}

class NoopLanServer {
  public readonly approval = {
    approve: (_id: string) => undefined,
    deny: (_id: string) => undefined,
    revokeToken: (_token: string) => undefined,
  };

  public subscribe(_listener: () => void): () => void {
    return () => {};
  }

  public getState(): LanServerSnapshot {
    return {
      running: false,
      mode: 'stopped',
      url: null,
      port: 8787,
      pendingRequests: [],
      approvedDevices: [],
      logs: [],
    };
  }

  public async startBridgeLink(_store: MergeableStore, _bridgeUrl: string): Promise<void> {}

  public async start(_store: MergeableStore, _port?: number): Promise<string> {
    throw new Error('LAN Server only runs on the iPhone app');
  }

  public stop(): void {}
}

export const phoneLanServer = new NoopLanServer();
