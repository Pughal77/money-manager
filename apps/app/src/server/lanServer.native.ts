import * as Network from 'expo-network';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { MergeableContent, MergeableStore } from 'tinybase';
import { listTransactions } from '@mm/core';
import {
  BrowserApprovalManager,
  createPhoneHttpRouter,
  HttpStreamParser,
  jsonResponse,
  serializeHttpResponse,
  type BrowserApprovalRequest,
  type SyncLogEntry,
} from '@mm/http-lite';
import {
  createSnapshot,
  handleSyncPushOnPhone,
  type SyncPushRequest,
} from '@mm/sync';
import { serveEmbeddedWebAsset } from './webAssets';

const DEFAULT_PORT = 8787;
const KEEP_AWAKE_TAG = 'mm-lan-web-server';

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

class PhoneLanServerController {
  private server: { close: () => void } | null = null;
  private bridgeTimer: ReturnType<typeof setInterval> | null = null;
  private bridgeUrl: string | null = null;
  private running = false;
  private mode: 'stopped' | 'direct-tcp' | 'expo-go-bridge' = 'stopped';
  private ipAddress: string | null = null;
  private port = DEFAULT_PORT;
  private lastError?: string;
  private remotePending: BrowserApprovalRequest[] = [];
  private remoteApproved: Array<{ token: string; deviceName: string; approvedAt: string }> = [];
  private remoteLogs: SyncLogEntry[] = [];
  private listeners = new Set<() => void>();

  public readonly approval = {
    approve: (requestId: string) => {
      if (this.mode === 'expo-go-bridge' && this.bridgeUrl) {
        void fetch(`${this.bridgeUrl}/api/sim/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        }).catch(() => {});
        this.remotePending = this.remotePending.filter((r) => r.requestId !== requestId);
        this.emit();
        return;
      }
      return this.localApproval.approve(requestId);
    },
    deny: (requestId: string) => {
      if (this.mode === 'expo-go-bridge' && this.bridgeUrl) {
        void fetch(`${this.bridgeUrl}/api/sim/deny`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        }).catch(() => {});
        this.remotePending = this.remotePending.filter((r) => r.requestId !== requestId);
        this.emit();
        return;
      }
      return this.localApproval.deny(requestId);
    },
    revokeToken: (token: string) => {
      if (this.mode === 'expo-go-bridge' && this.bridgeUrl) {
        void fetch(`${this.bridgeUrl}/api/sim/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }).catch(() => {});
        this.remoteApproved = this.remoteApproved.filter((d) => d.token !== token);
        this.emit();
        return;
      }
      this.localApproval.revokeToken(token);
    },
  };

  private readonly localApproval = new BrowserApprovalManager({
    autoApprove: false,
    onUpdate: () => this.emit(),
  });

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  public getState(): LanServerSnapshot {
    if (this.mode === 'expo-go-bridge') {
      return {
        running: this.running,
        mode: this.mode,
        url: this.bridgeUrl,
        port: this.port,
        pendingRequests: this.remotePending,
        approvedDevices: this.remoteApproved,
        logs: this.remoteLogs,
        lastError: this.lastError,
      };
    }

    return {
      running: this.running,
      mode: this.mode,
      url: this.running && this.ipAddress ? `http://${this.ipAddress}:${this.port}` : null,
      port: this.port,
      pendingRequests: this.localApproval.listPendingRequests(),
      approvedDevices: this.localApproval.listApprovedDevices(),
      logs: this.localApproval.getLogs(),
      lastError: this.lastError,
    };
  }

  /**
   * Mode 1 (Expo Go — 100% Free, No Paid Apple Developer Account Needed):
   * Connects the iPhone (SQLite source of truth) over Wi-Fi/Hotspot to the computer's stateless
   * memory bridge (`npm run bridge`). Pushes the iPhone's SQLite store, receives "Allow this browser?"
   * prompts on the phone, and merges browser edits back into the iPhone's SQLite database.
   */
  public async startBridgeLink(store: MergeableStore, rawBridgeUrl: string): Promise<void> {
    this.stop();
    const cleanUrl = rawBridgeUrl.trim().replace(/\/+$/, '');
    this.bridgeUrl = cleanUrl;
    this.lastError = undefined;
    this.mode = 'expo-go-bridge';
    this.running = true;
    this.emit();

    const syncPass = async () => {
      if (!this.running || this.mode !== 'expo-go-bridge' || !this.bridgeUrl) return;
      try {
        const res = await fetch(`${this.bridgeUrl}/api/phone/sync-master`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: store.getMergeableContent(),
          }),
        });
        if (!res.ok) {
          throw new Error(`Bridge returned HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          content: MergeableContent;
          pending: BrowserApprovalRequest[];
          approved: Array<{ token: string; deviceName: string; approvedAt: string }>;
          logs: SyncLogEntry[];
        };
        store.applyMergeableChanges(data.content);
        this.remotePending = data.pending ?? [];
        this.remoteApproved = data.approved ?? [];
        this.remoteLogs = data.logs ?? [];
        this.lastError = undefined;
        this.emit();
      } catch (err) {
        this.lastError =
          err instanceof Error
            ? err.message
            : 'Could not reach computer bridge. Check Wi-Fi / IP.';
        this.emit();
      }
    };

    try {
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    } catch {
      // ignore
    }

    await syncPass();
    this.bridgeTimer = setInterval(() => {
      void syncPass();
    }, 1200);
  }

  /**
   * Mode 2 (Standalone Xcode Build):
   * Runs a direct TCP HTTP server on the iPhone itself (`react-native-tcp-socket`).
   */
  public async start(store: MergeableStore, port: number = DEFAULT_PORT): Promise<string> {
    if (this.running && this.mode === 'direct-tcp' && this.ipAddress) {
      return `http://${this.ipAddress}:${this.port}`;
    }

    this.stop();
    this.port = port;
    this.lastError = undefined;

    try {
      const ip = await Network.getIpAddressAsync();
      this.ipAddress = ip && ip !== '0.0.0.0' ? ip : '172.20.10.1';
      if (this.ipAddress.startsWith('10.7.')) {
        this.lastError =
          'SideStore VPN (10.7.x.x) is active! Please turn OFF LocalDevVPN / WireGuard and tap Restart Server so your Wi-Fi IP is used.';
      }
    } catch {
      this.ipAddress = '172.20.10.1';
    }

    const router = createPhoneHttpRouter(this.localApproval, {
      getSnapshot: () => createSnapshot(store),
      applySyncPush: (body, deviceName) => {
        const req = body as SyncPushRequest;
        const res = handleSyncPushOnPhone(store, req);
        this.localApproval.addLog(
          deviceName,
          `Synced updates (${listTransactions(store).length} total transactions)`
        );
        return res;
      },
      getStaticAsset: (reqPath) => serveEmbeddedWebAsset(reqPath),
    });

    try {
      // Lazy require so running inside Expo Go does not fail at import time
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const TcpSocket = require('react-native-tcp-socket')?.default ?? require('react-native-tcp-socket');
      if (!TcpSocket || typeof TcpSocket.createServer !== 'function') {
        throw new Error(
          'Direct TCP socket is not available inside Expo Go. Use the "Expo Go Bridge Link" below instead!'
        );
      }

      await new Promise<void>((resolve, reject) => {
        const srv = TcpSocket.createServer((socket: {
          on: (ev: string, cb: (d: string | Uint8Array) => void) => void;
          end: (data?: string | Uint8Array) => void;
        }) => {
          const parser = new HttpStreamParser();
          socket.on('data', (data) => {
            try {
              const requests = parser.feed(
                typeof data === 'string' ? data : new Uint8Array(data)
              );
              for (const req of requests) {
                const res = router(req);
                const bytes = serializeHttpResponse(res);
                // Pass Uint8Array directly to socket.end(bytes) so react-native-tcp-socket
                // flushes all bytes over the native bridge before closing the connection.
                socket.end(bytes);
              }
            } catch (err) {
              const res = jsonResponse(400, {
                error: err instanceof Error ? err.message : 'Bad request',
              });
              socket.end(serializeHttpResponse(res));
            }
          });
        });

        srv.on('error', (err: Error) => {
          reject(err);
        });

        srv.listen({ port: this.port, host: '0.0.0.0' }, () => {
          this.server = srv;
          this.running = true;
          this.mode = 'direct-tcp';
          resolve();
        });
      });
    } catch (err) {
      this.lastError =
        err instanceof Error
          ? err.message
          : 'Direct TCP server requires an Xcode build. In Expo Go, use Bridge Link below.';
      this.emit();
      throw err;
    }

    try {
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    } catch {
      // ignore
    }

    this.localApproval.addLog(
      'iPhone Server',
      `Started Web Access at http://${this.ipAddress}:${this.port}`
    );
    this.emit();
    return `http://${this.ipAddress}:${this.port}`;
  }

  public stop(): void {
    if (this.bridgeTimer) {
      clearInterval(this.bridgeTimer);
      this.bridgeTimer = null;
    }
    if (this.server) {
      try {
        this.server.close();
      } catch {
        // ignore
      }
      this.server = null;
    }
    this.running = false;
    this.mode = 'stopped';
    try {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    } catch {
      // ignore
    }
    this.emit();
  }
}

export const phoneLanServer = new PhoneLanServerController();
