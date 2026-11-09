import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  addTransaction,
  createAppStore,
  listTransactions,
  seedDefaultData,
  updateTransaction,
} from '@mm/core';
import {
  applySnapshot,
  createSnapshot,
  handleSyncPushOnPhone,
  WebSyncController,
} from './index.js';

describe('@mm/sync', () => {
  it('loads snapshot on web, auto-syncs events asynchronously, and merges changes deterministically', async () => {
    const phoneStore = createAppStore('iphone-node');
    seedDefaultData(phoneStore);
    addTransaction(phoneStore, {
      id: 'tx-phone-1',
      accountId: 'acc-checking',
      categoryId: 'cat-groceries',
      kind: 'expense',
      amount: 1200,
      date: '2026-11-08',
      note: 'Initial phone tx',
    });

    // Browser starts completely empty in memory
    const webStore = createAppStore('web-node');
    const snapshot = createSnapshot(phoneStore);
    applySnapshot(webStore, snapshot);

    expect(listTransactions(webStore).map((t) => t.id)).toContain('tx-phone-1');

    // Wire up WebSyncController with autoSyncOnEvent (small 10ms debounce for fast test)
    const controller = new WebSyncController({
      store: webStore,
      clientId: 'web-node',
      autoSyncOnEvent: true,
      debounceMs: 10,
      sendPush: async (req) => handleSyncPushOnPhone(phoneStore, req),
    });

    // Perform an edit on the web client
    addTransaction(webStore, {
      id: 'tx-web-1',
      accountId: 'acc-checking',
      categoryId: 'cat-dining',
      kind: 'expense',
      amount: 2500,
      date: '2026-11-09',
      note: 'Coffee & Lunch from web',
    });

    expect(controller.getPendingCount()).toBeGreaterThan(0);

    // Wait for async event sync to complete
    await new Promise((r) => setTimeout(r, 40));

    expect(controller.getPendingCount()).toBe(0);
    expect(controller.getState()).toBe('synced');
    expect(listTransactions(phoneStore).map((t) => t.id)).toContain('tx-web-1');

    // Also add a transaction on the phone directly and click "Sync" (flushNow) on web
    addTransaction(phoneStore, {
      id: 'tx-phone-2',
      accountId: 'acc-checking',
      categoryId: 'cat-transport',
      kind: 'expense',
      amount: 800,
      date: '2026-11-09',
      note: 'Subway on phone',
    });

    await controller.flushNow();
    expect(listTransactions(webStore).map((t) => t.id)).toContain('tx-phone-2');
    controller.destroy();
  });

  it('converges deterministically under arbitrary concurrent edits and duplicate pushes (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            actor: fc.constantFrom('phone', 'web'),
            txIndex: fc.integer({ min: 1, max: 5 }),
            amount: fc.integer({ min: 100, max: 50000 }),
            note: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { minLength: 1, maxLength: 25 }
        ),
        (ops) => {
          const phone = createAppStore('phone-peer');
          const web = createAppStore('web-peer');
          seedDefaultData(phone);
          applySnapshot(web, createSnapshot(phone));

          for (const op of ops) {
            const target = op.actor === 'phone' ? phone : web;
            const txId = `tx-${op.txIndex}`;
            if (!target.hasRow('transactions', txId)) {
              addTransaction(target, {
                id: txId,
                accountId: 'acc-checking',
                categoryId: 'cat-groceries',
                kind: 'expense',
                amount: op.amount,
                date: '2026-11-09',
                note: op.note,
              });
            } else {
              updateTransaction(target, txId, {
                amount: op.amount,
                note: op.note,
              });
            }
          }

          // Sync web -> phone, and apply response back to web
          const resp1 = handleSyncPushOnPhone(phone, {
            protocolVersion: 1,
            clientId: 'web-peer',
            changes: web.getMergeableContent(),
          });
          web.applyMergeableChanges(resp1.content);

          // Duplicate sync must be idempotent
          const resp2 = handleSyncPushOnPhone(phone, {
            protocolVersion: 1,
            clientId: 'web-peer',
            changes: web.getMergeableContent(),
          });
          web.applyMergeableChanges(resp2.content);

          expect(phone.getTables()).toEqual(web.getTables());
        }
      ),
      { numRuns: 30 }
    );
  });
});
