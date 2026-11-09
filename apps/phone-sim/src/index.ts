import fs from 'node:fs';
import net from 'node:net';
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
}

export function startPhoneSimServer(options?: PhoneSimOptions) {
  const port = options?.port ?? Number(process.env.PORT ?? 8787);
  const host = options?.host ?? '0.0.0.0';
  const dataFile =
    options?.dataFilePath ?? path.resolve(process.cwd(), '.sim-data.json');
  const autoApprove =
    options?.autoApprove ?? process.env.AUTO_APPROVE !== 'false';

  const store = createAppStore('iphone-sim-master');

  // Load persisted data if present, else seed default accounts/categories and sample transactions
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
  });

  const server = net.createServer((socket) => {
    const parser = new HttpStreamParser();
    socket.on('data', (chunk) => {
      try {
        const requests = parser.feed(chunk);
        for (const req of requests) {
          // Simulator control endpoints (for inspecting or approving pending browser requests during dev/testing)
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

// Run directly when executed via `npm run sim`
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('index.ts');

if (isMain) {
  startPhoneSimServer().then(({ port }) => {
    console.log(
      `[phone-sim] iPhone master simulator listening on http://127.0.0.1:${port}`
    );
  });
}
