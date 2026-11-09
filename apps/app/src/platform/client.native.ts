import type { MergeableStore } from 'tinybase';
import type { WebClientState } from './client.web';

class NoopWebClient {
  public subscribe(_listener: () => void): () => void {
    return () => {};
  }

  public getState(): WebClientState {
    return {
      phase: 'connected',
      phoneUrl: '',
      deviceName: 'iPhone',
      syncState: 'synced',
      pendingChanges: 0,
    };
  }

  public setPhoneUrl(_url: string): void {}
  public setDeviceName(_name: string): void {}
  public async connectAndRequestApproval(_store: MergeableStore): Promise<void> {}
  public async syncNow(): Promise<boolean> {
    return true;
  }
}

export const webSyncClient = new NoopWebClient();
