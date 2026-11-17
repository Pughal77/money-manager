import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import Papa from 'papaparse';
import type { MergeableStore } from 'tinybase';
import { parseToCents } from './money';
import { TABLES } from './schema';

export type RestoreMode = 'merge' | 'replace';

const TABLE_NAMES = [
  TABLES.accounts,
  TABLES.categories,
  TABLES.transactions,
  TABLES.budgets,
] as const;

function findZipCsvBytes(
  unzipped: Record<string, Uint8Array>,
  tableName: string
): Uint8Array | undefined {
  const directKey = `${tableName}.csv`;
  if (unzipped[directKey]) {
    return unzipped[directKey];
  }
  const matchingKey = Object.keys(unzipped).find((key) => {
    if (key.includes('__MACOSX') || key.split('/').some((part) => part.startsWith('.'))) {
      return false;
    }
    return key === directKey || key.endsWith(`/${directKey}`);
  });
  return matchingKey ? unzipped[matchingKey] : undefined;
}

function parseSafeAmount(val: string | undefined, treatAsDecimal: boolean): number {
  const cleaned = (val ?? '').trim();
  if (!cleaned) return 0;
  if (treatAsDecimal || cleaned.includes('.') || cleaned.includes('$')) {
    try {
      return parseToCents(cleaned);
    } catch {
      const num = Number(cleaned.replace(/[$,\s]/g, ''));
      return Number.isFinite(num) ? Math.round(num * 100) : 0;
    }
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

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

  const hasAnyMatchingTable = TABLE_NAMES.some((t) => findZipCsvBytes(unzipped, t));
  if (!hasAnyMatchingTable) {
    return { importedRows: 0 };
  }

  store.transaction(() => {
    if (mode === 'replace') {
      for (const tableName of TABLE_NAMES) {
        store.delTable(tableName);
      }
    }

    for (const tableName of TABLE_NAMES) {
      const fileBytes = findZipCsvBytes(unzipped, tableName);
      if (!fileBytes) continue;
      const csvText = strFromU8(fileBytes).trim();
      if (!csvText) continue;

      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      const treatAsDecimal =
        tableName === 'transactions' &&
        parsed.data.some(
          (r) =>
            typeof r.amount === 'string' &&
            (r.amount.includes('.') || r.amount.includes('$'))
        );

      for (const rawRow of parsed.data) {
        const id = rawRow.id?.trim();
        if (!id) continue;

        if (tableName === 'accounts') {
          store.setRow('accounts', id, {
            name: String(rawRow.name ?? ''),
            type: String(rawRow.type || 'checking'),
            openingBalance: parseSafeAmount(rawRow.openingBalance, false),
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
            amount: Math.abs(parseSafeAmount(rawRow.amount, treatAsDecimal)),
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
            limitAmount: parseSafeAmount(rawRow.limitAmount, false),
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
