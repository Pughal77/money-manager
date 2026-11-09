import type { MergeableChanges, MergeableContent, MergeableStore } from 'tinybase';
import { SYNC_PROTOCOL_VERSION, type SnapshotResponse, type SyncPushRequest, type SyncPushResponse } from './protocol';

/**
 * Exports a full MergeableContent snapshot from the phone's source-of-truth store.
 */
export function createSnapshot(phoneStore: MergeableStore): SnapshotResponse {
  return {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    content: phoneStore.getMergeableContent(),
    serverTime: new Date().toISOString(),
  };
}

/**
 * Loads a full MergeableContent snapshot into the browser's in-memory store.
 */
export function applySnapshot(webStore: MergeableStore, snapshot: SnapshotResponse): void {
  webStore.setMergeableContent(snapshot.content);
}

/**
 * Applies incoming client changes onto the phone's store using TinyBase's HLC LWW CRDT merge,
 * and returns the updated authoritative content for the client to reconcile.
 */
export function handleSyncPushOnPhone(
  phoneStore: MergeableStore,
  request: SyncPushRequest
): SyncPushResponse {
  phoneStore.applyMergeableChanges(request.changes);
  return {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    content: phoneStore.getMergeableContent(),
    serverTime: new Date().toISOString(),
  };
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface WebSyncQueueOptions {
  store: MergeableStore;
  clientId: string;
  /**
   * Function that transmits the SyncPushRequest to the phone (e.g., via fetch).
   * When `keepalive` is true, the caller is flushing on tab hide/close.
   */
  sendPush: (req: SyncPushRequest, options?: { keepalive?: boolean }) => Promise<SyncPushResponse>;
  /**
   * Automatically schedule an async flush upon every local mutation event.
   * Defaults to true.
   */
  autoSyncOnEvent?: boolean;
  /**
   * Debounce window in milliseconds for coalescing rapid local edits before firing async sync.
   * Defaults to 150ms.
   */
  debounceMs?: number;
  onStateChange?: (state: SyncState, pendingCount: number, lastError?: string) => void;
}

/**
 * Tracks local mutations on the browser's in-memory store, queues them,
 * and flushes them to the phone:
 * 1. Asynchronously after every local event (when `autoSyncOnEvent` is enabled),
 * 2. Immediately when the user clicks the "Sync" button (`flushNow()`),
 * 3. With `keepalive: true` when the browser tab is hidden or closed (`flushOnClose()`).
 */
export class WebSyncController {
  private store: MergeableStore;
  private clientId: string;
  private sendPush: WebSyncQueueOptions['sendPush'];
  private autoSyncOnEvent: boolean;
  private debounceMs: number;
  private onStateChange?: WebSyncQueueOptions['onStateChange'];

  private pendingEventCount = 0;
  private isApplyingRemote = false;
  private isFlushing = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private state: SyncState = 'idle';
  private lastError?: string;
  private listenerId: string | null = null;

  constructor(options: WebSyncQueueOptions) {
    this.store = options.store;
    this.clientId = options.clientId;
    this.sendPush = options.sendPush;
    this.autoSyncOnEvent = options.autoSyncOnEvent ?? true;
    this.debounceMs = options.debounceMs ?? 150;
    this.onStateChange = options.onStateChange;

    this.listenerId = this.store.addDidFinishTransactionListener(() => {
      if (this.isApplyingRemote) return;
      this.pendingEventCount += 1;
      this.notifyState(this.state);
      if (this.autoSyncOnEvent) {
        this.scheduleAsyncSync();
      }
    });
  }

  public getPendingCount(): number {
    return this.pendingEventCount;
  }

  public getState(): SyncState {
    return this.state;
  }

  public getLastError(): string | undefined {
    return this.lastError;
  }

  public hasUnsyncedChanges(): boolean {
    return this.pendingEventCount > 0;
  }

  /**
   * Loads an initial or refreshed snapshot without triggering local mutation listeners.
   */
  public loadRemoteContent(content: MergeableContent): void {
    this.isApplyingRemote = true;
    try {
      this.store.setMergeableContent(content);
    } finally {
      this.isApplyingRemote = false;
    }
  }

  private scheduleAsyncSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flushNow();
    }, this.debounceMs);
  }

  /**
   * Asynchronously flushes all current state/changes to the phone.
   * Safe to call manually from the "Sync" button or automatically after events.
   */
  public async flushNow(): Promise<boolean> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.isFlushing) {
      return false;
    }
    this.isFlushing = true;
    const countAtStart = this.pendingEventCount;
    this.notifyState('syncing');

    try {
      const changes: MergeableContent = this.store.getMergeableContent();
      const response = await this.sendPush(
        {
          protocolVersion: SYNC_PROTOCOL_VERSION,
          clientId: this.clientId,
          changes,
        },
        { keepalive: false }
      );

      this.isApplyingRemote = true;
      try {
        this.store.applyMergeableChanges(response.content);
      } finally {
        this.isApplyingRemote = false;
      }

      this.pendingEventCount = Math.max(0, this.pendingEventCount - countAtStart);
      this.lastError = undefined;
      this.notifyState('synced');
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      this.notifyState('error');
      return false;
    } finally {
      this.isFlushing = false;
      // If more local events occurred while in-flight, schedule another pass
      if (this.pendingEventCount > 0 && this.autoSyncOnEvent && this.state !== 'error') {
        this.scheduleAsyncSync();
      }
    }
  }

  /**
   * Best-effort flush when the browser tab is closing or hiding (`keepalive: true`).
   */
  public flushOnClose(): void {
    if (this.pendingEventCount <= 0) return;
    const changes: MergeableContent = this.store.getMergeableContent();
    void this.sendPush(
      {
        protocolVersion: SYNC_PROTOCOL_VERSION,
        clientId: this.clientId,
        changes,
      },
      { keepalive: true }
    ).catch(() => {
      // Tab is closing; ignore network rejection
    });
  }

  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.listenerId !== null) {
      this.store.delListener(this.listenerId);
      this.listenerId = null;
    }
  }

  private notifyState(nextState: SyncState): void {
    this.state = nextState;
    this.onStateChange?.(this.state, this.pendingEventCount, this.lastError);
  }
}
