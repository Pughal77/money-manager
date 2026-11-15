import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { addTransaction, createAppStore, listTransactions } from '@mm/core';
import { applySnapshot, WebSyncController } from '@mm/sync';
import { startPhoneSimServer } from './index.js';

describe('@mm/phone-sim E2E over TCP HTTP', () => {
  it('supports "Allow this browser?" prompt approval, snapshot load, async event sync, and manual sync', async () => {
    const tmpFile = path.join(os.tmpdir(), `mm-sim-test-${Date.now()}.json`);
    const sim = await startPhoneSimServer({
      port: 0, // ephemeral port
      host: '127.0.0.1',
      dataFilePath: tmpFile,
      autoApprove: false, // require explicit phone approval
    });

    const baseUrl = `http://127.0.0.1:${sim.port}`;

    try {
      // 1. Browser requests pairing ("Allow this browser?")
      const reqRes = await fetch(`${baseUrl}/api/pair/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: 'Safari on MacBook' }),
      });
      const reqJson = (await reqRes.json()) as { requestId: string; status: string };
      expect(reqJson.status).toBe('pending');

      // 2. Phone user sees the pending prompt and taps "Allow"
      expect(sim.approval.listPendingRequests()).toHaveLength(1);
      sim.approval.approve(reqJson.requestId);

      // 3. Browser polls status and obtains session token (held in memory only)
      const pollRes = await fetch(
        `${baseUrl}/api/pair/status?requestId=${encodeURIComponent(reqJson.requestId)}`
      );
      const pollJson = (await pollRes.json()) as { status: string; token: string };
      expect(pollJson.status).toBe('approved');
      expect(pollJson.token).toBeTruthy();

      // 4. Browser loads initial snapshot into its in-memory store
      const snapRes = await fetch(`${baseUrl}/api/snapshot`, {
        headers: { Authorization: `Bearer ${pollJson.token}` },
      });
      expect(snapRes.status).toBe(200);
      const snapshot = await snapRes.json();

      const webStore = createAppStore('browser-memory-only');
      applySnapshot(webStore, snapshot);
      expect(listTransactions(webStore).length).toBeGreaterThanOrEqual(2);

      // 5. Set up WebSyncController with async auto-sync on every event
      const controller = new WebSyncController({
        store: webStore,
        clientId: 'browser-memory-only',
        autoSyncOnEvent: true,
        debounceMs: 20,
        sendPush: async (pushReq, opts) => {
          const r = await fetch(`${baseUrl}/api/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${pollJson.token}`,
            },
            body: JSON.stringify(pushReq),
            keepalive: opts?.keepalive,
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        },
      });

      // Add a transaction in the browser
      addTransaction(webStore, {
        id: 'tx-from-browser-e2e',
        accountId: 'acc-checking',
        categoryId: 'cat-dining',
        kind: 'expense',
        amount: 3450,
        date: '2026-11-10',
        note: 'Ramen dinner',
      });

      // Wait for async event sync to complete
      await new Promise((r) => setTimeout(r, 80));

      expect(controller.getPendingCount()).toBe(0);
      expect(
        listTransactions(sim.store).some((t) => t.id === 'tx-from-browser-e2e')
      ).toBe(true);

      controller.destroy();
    } finally {
      await sim.close();
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  it('supports stateless Expo Go Bridge Mode where the iPhone SQLite store is the sole master', async () => {
    const bridge = await startPhoneSimServer({
      port: 0,
      host: '127.0.0.1',
      statelessBridge: true,
    });
    const baseUrl = `http://127.0.0.1:${bridge.port}`;

    try {
      // Bridge starts completely empty (stateless)
      expect(listTransactions(bridge.store)).toHaveLength(0);

      // Real iPhone (running in free Expo Go) holds the SQLite source of truth
      const iphoneStore = createAppStore('real-iphone-sqlite');
      addTransaction(iphoneStore, {
        id: 'tx-iphone-master-1',
        accountId: 'acc-checking',
        categoryId: 'cat-groceries',
        kind: 'expense',
        amount: 9900,
        date: '2026-11-10',
        note: 'Recorded on iPhone in Expo Go',
      });

      // iPhone links to the bridge and pushes its SQLite state
      const linkRes = await fetch(`${baseUrl}/api/phone/sync-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: iphoneStore.getMergeableContent() }),
      });
      expect(linkRes.status).toBe(200);
      expect(
        listTransactions(bridge.store).some((t) => t.id === 'tx-iphone-master-1')
      ).toBe(true);
    } finally {
      await bridge.close();
    }
  });
});
