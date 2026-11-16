import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import Papa from 'papaparse';
import type { MergeableStore } from 'tinybase';
import { TABLES } from './schema';

export type RestoreMode = 'merge' | 'replace';

const TABLE_NAMES = [
  TABLES.accounts,
  TABLES.categories,
  TABLES.transactions,
  TABLES.budgets,
] as const;

/**
 * Exports all tables (accounts, categories, transactions, budgets) into a single ZIP archive
 * containing one CSV per table (`accounts.csv`, `categories.csv`, `transactions.csv`, `budgets.csv`).
 */
export function exportBackupZip(store: MergeableStore): Uint8Array {
  const files: Record<string, Uint8Array> = {};

  for (const tableName of TABLE_NAMES) {
    const table = store.getTable(tableName);
    const rows = Object.entries(table).map(([id, row]) => ({
      id,
      ...row,
    }));
    const csv = Papa.unparse(rows, { header: true });
    files[`${tableName}.csv`] = strToU8(csv);
  }

  return zipSync(files, { level: 6 });
}

/**
 * Restores a backup ZIP archive into the store.
 * - `mode === 'replace'`: marks existing rows as deleted (or clears tables) before importing.
 * - `mode === 'merge'`: upserts rows from the CSV archive by their `id` while preserving other rows.
 */
export function importBackupZip(
  store: MergeableStore,
  zipBytes: Uint8Array,
  mode: RestoreMode
): { importedRows: number } {
  const unzipped = unzipSync(zipBytes);
  let importedRows = 0;

  store.transaction(() => {
    if (mode === 'replace') {
      for (const tableName of TABLE_NAMES) {
        store.delTable(tableName);
      }
    }

    for (const tableName of TABLE_NAMES) {
      const fileBytes = unzipped[`${tableName}.csv`];
      if (!fileBytes) continue;
      const csvText = strFromU8(fileBytes).trim();
      if (!csvText) continue;

      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      for (const rawRow of parsed.data) {
        const id = rawRow.id?.trim();
        if (!id) continue;

        if (tableName === 'accounts') {
          store.setRow('accounts', id, {
            name: String(rawRow.name ?? ''),
            type: String(rawRow.type || 'checking'),
            openingBalance: Number(rawRow.openingBalance ?? 0),
            color: String(rawRow.color || '#38bdf8'),
            createdAt: String(rawRow.createdAt ?? ''),
            deleted: rawRow.deleted === 'true' || rawRow.deleted === '1',
          });
          importedRows++;
        } else if (tableName === 'categories') {
          store.setRow('categories', id, {
            name: String(rawRow.name ?? ''),
            kind: String(rawRow.kind || 'expense'),
            icon: String(rawRow.icon || 'dots'),
            color: String(rawRow.color || '#F29B9B'),
            subcategories: String(rawRow.subcategories || '["Other"]'),
            sortOrder: Number(rawRow.sortOrder ?? 99),
            createdAt: String(rawRow.createdAt ?? ''),
            deleted: rawRow.deleted === 'true' || rawRow.deleted === '1',
          });
          importedRows++;
        } else if (tableName === 'transactions') {
          store.setRow('transactions', id, {
            accountId: String(rawRow.accountId ?? ''),
            toAccountId: String(rawRow.toAccountId ?? ''),
            categoryId: String(rawRow.categoryId ?? ''),
            subcategory: String(rawRow.subcategory ?? ''),
            kind: String(rawRow.kind || 'expense'),
            amount: Number(rawRow.amount ?? 0),
            date: String(rawRow.date ?? ''),
            note: String(rawRow.note ?? ''),
            createdAt: String(rawRow.createdAt ?? ''),
            deleted: rawRow.deleted === 'true' || rawRow.deleted === '1',
          });
          importedRows++;
        } else if (tableName === 'budgets') {
          const rawMonth = String(rawRow.month ?? '');
          const inferredType =
            rawRow.periodType === 'weekly' ||
            rawRow.periodType === 'monthly' ||
            rawRow.periodType === 'yearly'
              ? rawRow.periodType
              : /^\d{4}$/.test(rawMonth)
                ? 'yearly'
                : /^\d{4}-\d{2}-\d{2}$/.test(rawMonth)
                  ? 'weekly'
                  : 'monthly';
          store.setRow('budgets', id, {
            categoryId: String(rawRow.categoryId ?? ''),
            month: rawMonth,
            periodType: inferredType,
            limitAmount: Number(rawRow.limitAmount ?? 0),
            rollover: rawRow.rollover === 'true' || rawRow.rollover === '1',
            deleted: rawRow.deleted === 'true' || rawRow.deleted === '1',
          });
          importedRows++;
        }
      }
    }
    store.setValue('vaultInitialized', true);
  });

  return { importedRows };
}
