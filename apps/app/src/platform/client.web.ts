import type { MergeableStore } from 'tinybase';
import {
  WebSyncController,
  type PairStatusResponse,
  type SnapshotResponse,
  type SyncPushResponse,
  type SyncState,
} from '@mm/sync';

export type ConnectionPhase =
  | 'disconnected'
  | 'awaiting-phone-approval'
  | 'connected'
  | 'error';

export interface WebClientState {
  phase: ConnectionPhase;
  phoneUrl: string;
  deviceName: string;
  syncState: SyncState;
  pendingChanges: number;
  lastError?: string;
}

class BrowserSyncClient {
  private phase: ConnectionPhase = 'disconnected';
  private phoneUrl = 'http://127.0.0.1:8787';
  private deviceName = 'Mac Browser';
  private token: string | null = null;
  private syncState: SyncState = 'idle';
  private pendingChanges = 0;
  private lastError?: string;
  private controller: WebSyncController | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private unloadAttached = false;
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window !== 'undefined' && window.location) {
      // If served directly from the phone on port 8787, default to current origin
      if (window.location.port === '8787') {
        this.phoneUrl = window.location.origin;
      }
      const ua = navigator.userAgent || '';
      if (ua.includes('Macintosh')) {
        this.deviceName = ua.includes('Safari') && !ua.includes('Chrome')
          ? 'Safari on Mac'
          : 'Browser on Mac';
      } else {
        this.deviceName = 'Web Browser';
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  public getState(): WebClientState {
    return {
      phase: this.phase,
      phoneUrl: this.phoneUrl,
      deviceName: this.deviceName,
      syncState: this.syncState,
      pendingChanges: this.pendingChanges,
      lastError: this.lastError,
    };
  }

  public setPhoneUrl(url: string): void {
    this.phoneUrl = url.trim().replace(/\/+$/, '');
    this.emit();
  }

  public setDeviceName(name: string): void {
    this.deviceName = name;
    this.emit();
  }

  /**
   * Initiates the "Allow this browser?" prompt on the phone and polls until approved or denied.
   */
  public async connectAndRequestApproval(store: MergeableStore): Promise<void> {
    this.stopPolling();
    this.lastError = undefined;
    this.phase = 'awaiting-phone-approval';
    this.emit();

    try {
      const res = await fetch(`${this.phoneUrl}/api/pair/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: this.deviceName }),
      });
      if (!res.ok) {
        throw new Error(`Could not reach phone at ${this.phoneUrl} (HTTP ${res.status})`);
      }
      const data = (await res.json()) as PairStatusResponse;

      if (data.status === 'approved' && data.token) {
        await this.completeConnection(store, data.token);
        return;
      }

      // Poll every 1.2s until the user taps "Allow" or "Deny" on the phone
      this.pollTimer = setInterval(async () => {
        try {
          const pollRes = await fetch(
            `${this.phoneUrl}/api/pair/status?requestId=${encodeURIComponent(data.requestId)}`
          );
          if (!pollRes.ok) return;
          const statusData = (await pollRes.json()) as PairStatusResponse;
          if (statusData.status === 'approved' && statusData.token) {
            this.stopPolling();
            await this.completeConnection(store, statusData.token);
          } else if (statusData.status === 'denied') {
            this.stopPolling();
            this.phase = 'error';
            this.lastError = 'Connection was denied on the phone.';
            this.emit();
          }
        } catch {
          // Keep polling while awaiting user tap
        }
      }, 1200);
    } catch (err) {
      this.phase = 'error';
      this.lastError =
        err instanceof Error
          ? err.message
          : 'Unable to reach phone. Check Wi-Fi / Hotspot.';
      this.emit();
    }
  }

  private async completeConnection(store: MergeableStore, token: string): Promise<void> {
    this.token = token;

    // Fetch initial snapshot into the in-memory store
    const snapRes = await fetch(`${this.phoneUrl}/api/snapshot`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!snapRes.ok) {
      throw new Error(`Failed to load snapshot (HTTP ${snapRes.status})`);
    }
    const snapshot = (await snapRes.json()) as SnapshotResponse;

    if (this.controller) {
      this.controller.destroy();
    }

    this.controller = new WebSyncController({
      store,
      clientId: this.deviceName,
      autoSyncOnEvent: true,
      debounceMs: 150,
      onStateChange: (state, pending, err) => {
        this.syncState = state;
        this.pendingChanges = pending;
        this.lastError = err;
        this.emit();
      },
      sendPush: async (req, opts): Promise<SyncPushResponse> => {
        const r = await fetch(`${this.phoneUrl}/api/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token ?? ''}`,
          },
          body: JSON.stringify(req),
          keepalive: opts?.keepalive,
        });
        if (!r.ok) {
          throw new Error(`Sync failed (HTTP ${r.status})`);
        }
        return r.json();
      },
    });

    this.controller.loadRemoteContent(snapshot.content);
    this.phase = 'connected';
    this.syncState = 'synced';
    this.pendingChanges = 0;
    this.attachBrowserLifecycleHooks();
    this.emit();
  }

  /**
   * Manual "Sync" button action.
   */
  public async syncNow(): Promise<boolean> {
    if (!this.controller) return false;
    return this.controller.flushNow();
  }

  private attachBrowserLifecycleHooks(): void {
    if (this.unloadAttached || typeof window === 'undefined') return;
    this.unloadAttached = true;

    // 1. Flush with keepalive when the page becomes hidden or is closing
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.controller?.hasUnsyncedChanges()) {
        this.controller.flushOnClose();
      }
    });

    window.addEventListener('pagehide', () => {
      if (this.controller?.hasUnsyncedChanges()) {
        this.controller.flushOnClose();
      }
    });

    // 2. Warn before closing if there are unsynced changes AND the last sync attempt failed
    window.addEventListener('beforeunload', (e) => {
      if (!this.controller) return;
      if (this.controller.hasUnsyncedChanges()) {
        this.controller.flushOnClose();
        if (this.syncState === 'error') {
          e.preventDefault();
          e.returnValue =
            'You have unsynced changes that could not reach your phone. Close anyway?';
        }
      }
    });
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

export const webSyncClient = new BrowserSyncClient();
