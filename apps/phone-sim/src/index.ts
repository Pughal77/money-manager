import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {
  addTransaction,
  createAppStore,
  getNetWorth,
  listTransactions,
  seedDefaultData,
} from '@mm/core';
import {
  BrowserApprovalManager,
  createPhoneHttpRouter,
  HttpStreamParser,
  jsonResponse,
  serializeHttpResponse,
} from '@mm/http-lite';
import {
  createSnapshot,
  handleSyncPushOnPhone,
  type SyncPushRequest,
} from '@mm/sync';

export interface PhoneSimOptions {
  port?: number;
  host?: string;
  dataFilePath?: string;
  autoApprove?: boolean;
  /**
   * When true (`npm run bridge`), runs as a stateless, memory-only LAN bridge for a real iPhone
   * running inside the free Expo Go app. Writes nothing to disk; the iPhone's SQLite database
   * remains the sole persisted source of truth.
   */
  statelessBridge?: boolean;
}

export function startPhoneSimServer(options?: PhoneSimOptions) {
  const isBridge =
    options?.statelessBridge ?? process.argv.includes('--bridge');
  const port = options?.port ?? Number(process.env.PORT ?? 8787);
  const host = options?.host ?? '0.0.0.0';
  const dataFile =
    options?.dataFilePath ?? path.resolve(process.cwd(), '.sim-data.json');
  const autoApprove =
    options?.autoApprove ??
    (isBridge ? false : process.env.AUTO_APPROVE !== 'false');

  const store = createAppStore(isBridge ? 'lan-memory-bridge' : 'iphone-sim-master');

  if (!isBridge) {
    // Simulator mode: load persisted data if present, else seed sample data
    if (fs.existsSync(dataFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
        store.setMergeableContent(raw);
      } catch {
        seedDefaultData(store);
      }
    } else {
      seedDefaultData(store);
      const today = new Date().toISOString().slice(0, 10);
      addTransaction(store, {
        id: 'tx-sample-1',
        accountId: 'acc-checking',
        categoryId: 'cat-groceries',
        kind: 'expense',
        amount: 6450,
        date: today,
        note: 'Weekly groceries',
      });
      addTransaction(store, {
        id: 'tx-sample-2',
        accountId: 'acc-checking',
        categoryId: 'cat-salary',
        kind: 'income',
        amount: 320000,
        date: today,
        note: 'Monthly paycheck',
      });
    }

    const persistToDisk = () => {
      try {
        fs.writeFileSync(
          dataFile,
          JSON.stringify(store.getMergeableContent()),
          'utf-8'
        );
      } catch (err) {
        console.error('[phone-sim] Failed to persist data:', err);
      }
    };

    store.addDidFinishTransactionListener(() => {
      persistToDisk();
    });
    persistToDisk();
  }

  const approval = new BrowserApprovalManager({ autoApprove });

  const baseRouter = createPhoneHttpRouter(approval, {
    getSnapshot: () => createSnapshot(store),
    applySyncPush: (body, deviceName) => {
      const req = body as SyncPushRequest;
      const res = handleSyncPushOnPhone(store, req);
      approval.addLog(
        deviceName,
        `Synced changes (Total transactions: ${listTransactions(store).length})`
      );
      return res;
    },
    getStaticAsset: (reqPath) => {
      const distDir = path.resolve(process.cwd(), 'apps/app/dist');
      if (!fs.existsSync(distDir)) return undefined;
      const normalized = reqPath === '' || reqPath === '/' ? '/index.html' : reqPath;
      let filePath = path.join(distDir, normalized);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }
      if (!fs.existsSync(filePath)) return undefined;
      const ext = path.extname(filePath).toLowerCase();
      const MIME_MAP: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
      };
      return {
        status: 200,
        headers: {
          'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
        },
        body: fs.readFileSync(filePath, 'utf-8'),
      };
    },
  });

  const server = net.createServer((socket) => {
    const parser = new HttpStreamParser();
    socket.on('data', (chunk) => {
      try {
        const requests = parser.feed(chunk);
        for (const req of requests) {
          // Endpoint used by a real iPhone in free Expo Go mode to push its authoritative
          // SQLite state, pull browser edits, and receive "Allow this browser?" prompts.
          if (req.method === 'POST' && req.path === '/api/phone/sync-master') {
            const body = req.body ? JSON.parse(req.body) : {};
            if (body.content) {
              store.applyMergeableChanges(body.content);
            }
            const res = jsonResponse(200, {
              content: store.getMergeableContent(),
              pending: approval.listPendingRequests(),
              approved: approval.listApprovedDevices(),
              logs: approval.getLogs(),
            });
            socket.write(serializeHttpResponse(res));
            socket.end();
            return;
          }

          // Control endpoints for inspecting or approving pending browser requests
          if (req.method === 'GET' && req.path === '/api/sim/pending') {
            const res = jsonResponse(200, {
              pending: approval.listPendingRequests(),
              approved: approval.listApprovedDevices(),
              logs: approval.getLogs(),
              netWorth: getNetWorth(store),
              txCount: listTransactions(store).length,
            });
            socket.write(serializeHttpResponse(res));
            socket.end();
            return;
          }
          if (req.method === 'POST' && req.path === '/api/sim/approve') {
            const body = req.body ? JSON.parse(req.body) : {};
            const updated = approval.approve(String(body.requestId ?? ''));
            const res = updated
              ? jsonResponse(200, updated)
              : jsonResponse(404, { error: 'Request not found' });
            socket.write(serializeHttpResponse(res));
            socket.end();
            return;
          }
          if (req.method === 'POST' && req.path === '/api/sim/deny') {
            const body = req.body ? JSON.parse(req.body) : {};
            const updated = approval.deny(String(body.requestId ?? ''));
            const res = updated
              ? jsonResponse(200, updated)
              : jsonResponse(404, { error: 'Request not found' });
            socket.write(serializeHttpResponse(res));
            socket.end();
            return;
          }
          if (req.method === 'POST' && req.path === '/api/sim/revoke') {
            const body = req.body ? JSON.parse(req.body) : {};
            approval.revokeToken(String(body.token ?? ''));
            const res = jsonResponse(200, { ok: true });
            socket.write(serializeHttpResponse(res));
            socket.end();
            return;
          }

          const res = baseRouter(req);
          socket.write(serializeHttpResponse(res));
          socket.end();
        }
      } catch (err) {
        const res = jsonResponse(400, {
          error: err instanceof Error ? err.message : 'Bad request',
        });
        socket.write(serializeHttpResponse(res));
        socket.end();
      }
    });
  });

  return new Promise<{
    server: net.Server;
    port: number;
    store: typeof store;
    approval: BrowserApprovalManager;
    close: () => Promise<void>;
  }>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const addr = server.address();
      const boundPort = typeof addr === 'object' && addr ? addr.port : port;
      resolve({
        server,
        port: boundPort,
        store,
        approval,
        close: () =>
          new Promise<void>((resClose) => {
            server.close(() => resClose());
          }),
      });
    });
  });
}

function getLocalLanIps(): string[] {
  const nets = os.networkInterfaces();
  const results: string[] = [];
  for (const entries of Object.values(nets)) {
    if (!entries) continue;
    for (const netInfo of entries) {
      if (netInfo.family === 'IPv4' && !netInfo.internal) {
        results.push(netInfo.address);
      }
    }
  }
  return results;
}

const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('index.ts');

if (isMain) {
  const isBridge = process.argv.includes('--bridge');
  startPhoneSimServer({ statelessBridge: isBridge }).then(({ port }) => {
    const ips = getLocalLanIps();
    if (isBridge) {
      console.log(
        `[bridge] Stateless Memory Bridge running on http://127.0.0.1:${port}`
      );
      for (const ip of ips) {
        console.log(
          `[bridge] -> In your iPhone Expo Go app (Sync & Backup tab), enter Bridge URL: http://${ip}:${port}`
        );
      }
    } else {
      console.log(
        `[phone-sim] iPhone master simulator listening on http://127.0.0.1:${port}`
      );
    }
  });
}
