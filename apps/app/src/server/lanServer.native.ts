import * as Network from 'expo-network';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import TcpSocket from 'react-native-tcp-socket';
import type { MergeableStore } from 'tinybase';
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
  url: string | null;
  port: number;
  pendingRequests: BrowserApprovalRequest[];
  approvedDevices: Array<{ token: string; deviceName: string; approvedAt: string }>;
  logs: SyncLogEntry[];
}

class PhoneLanServerController {
  private server: ReturnType<typeof TcpSocket.createServer> | null = null;
  private running = false;
  private ipAddress: string | null = null;
  private port = DEFAULT_PORT;
  private listeners = new Set<() => void>();

  public readonly approval = new BrowserApprovalManager({
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
    return {
      running: this.running,
      url: this.running && this.ipAddress ? `http://${this.ipAddress}:${this.port}` : null,
      port: this.port,
      pendingRequests: this.approval.listPendingRequests(),
      approvedDevices: this.approval.listApprovedDevices(),
      logs: this.approval.getLogs(),
    };
  }

  public async start(store: MergeableStore, port: number = DEFAULT_PORT): Promise<string> {
    if (this.running && this.ipAddress) {
      return `http://${this.ipAddress}:${this.port}`;
    }

    this.port = port;
    try {
      const ip = await Network.getIpAddressAsync();
      this.ipAddress = ip && ip !== '0.0.0.0' ? ip : '172.20.10.1';
    } catch {
      // Fallback to standard iOS Personal Hotspot gateway IP
      this.ipAddress = '172.20.10.1';
    }

    const router = createPhoneHttpRouter(this.approval, {
      getSnapshot: () => createSnapshot(store),
      applySyncPush: (body, deviceName) => {
        const req = body as SyncPushRequest;
        const res = handleSyncPushOnPhone(store, req);
        this.approval.addLog(
          deviceName,
          `Synced updates (${listTransactions(store).length} total transactions)`
        );
        return res;
      },
      getStaticAsset: (reqPath) => serveEmbeddedWebAsset(reqPath),
    });

    await new Promise<void>((resolve, reject) => {
      const srv = TcpSocket.createServer((socket) => {
        const parser = new HttpStreamParser();
        socket.on('data', (data) => {
          try {
            const requests = parser.feed(
              typeof data === 'string' ? data : new Uint8Array(data)
            );
            for (const req of requests) {
              const res = router(req);
              const bytes = serializeHttpResponse(res);
              socket.write(Buffer.from(bytes));
              socket.end();
            }
          } catch (err) {
            const res = jsonResponse(400, {
              error: err instanceof Error ? err.message : 'Bad request',
            });
            socket.write(Buffer.from(serializeHttpResponse(res)));
            socket.end();
          }
        });
      });

      srv.on('error', (err) => {
        reject(err);
      });

      srv.listen({ port: this.port, host: '0.0.0.0' }, () => {
        this.server = srv;
        this.running = true;
        resolve();
      });
    });

    try {
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    } catch {
      // Keep-awake is best effort
    }

    this.approval.addLog('iPhone Server', `Started Web Access at http://${this.ipAddress}:${this.port}`);
    this.emit();
    return `http://${this.ipAddress}:${this.port}`;
  }

  public stop(): void {
    if (this.server) {
      try {
        this.server.close();
      } catch {
        // ignore
      }
      this.server = null;
    }
    this.running = false;
    try {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    } catch {
      // ignore
    }
    this.approval.addLog('iPhone Server', 'Stopped Web Access');
    this.emit();
  }
}

export const phoneLanServer = new PhoneLanServerController();
