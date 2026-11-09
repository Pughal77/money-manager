import type { MergeableStore } from 'tinybase';
import type { Cents } from './money';
import type {
  Account,
  AccountType,
  Budget,
  Category,
  CategoryKind,
  Transaction,
  TransactionKind,
} from './schema';

export function listAccounts(store: MergeableStore): Account[] {
  const table = store.getTable('accounts');
  const results: Account[] = [];
  for (const [id, row] of Object.entries(table)) {
    if (row.deleted) continue;
    results.push({
      id,
      name: String(row.name ?? ''),
      type: (row.type as AccountType) ?? 'checking',
      openingBalance: Number(row.openingBalance ?? 0),
      color: String(row.color ?? '#38bdf8'),
      createdAt: String(row.createdAt ?? ''),
      deleted: Boolean(row.deleted),
    });
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export function listCategories(store: MergeableStore, kind?: CategoryKind): Category[] {
  const table = store.getTable('categories');
  const results: Category[] = [];
  for (const [id, row] of Object.entries(table)) {
    if (row.deleted) continue;
    const rowKind = (row.kind as CategoryKind) ?? 'expense';
    if (kind && rowKind !== kind) continue;
    results.push({
      id,
      name: String(row.name ?? ''),
      kind: rowKind,
      icon: String(row.icon ?? 'tag'),
      color: String(row.color ?? '#a78bfa'),
      createdAt: String(row.createdAt ?? ''),
      deleted: Boolean(row.deleted),
    });
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export interface TransactionFilter {
  accountId?: string;
  categoryId?: string;
  kind?: TransactionKind;
  month?: string; // YYYY-MM prefix
  search?: string;
}

export function listTransactions(store: MergeableStore, filter?: TransactionFilter): Transaction[] {
  const table = store.getTable('transactions');
  const searchLower = filter?.search?.trim().toLowerCase();
  const categories = store.getTable('categories');
  const results: Transaction[] = [];

  for (const [id, row] of Object.entries(table)) {
    if (row.deleted) continue;
    const tx: Transaction = {
      id,
      accountId: String(row.accountId ?? ''),
      toAccountId: String(row.toAccountId ?? ''),
      categoryId: String(row.categoryId ?? ''),
      kind: (row.kind as TransactionKind) ?? 'expense',
      amount: Number(row.amount ?? 0),
      date: String(row.date ?? ''),
      note: String(row.note ?? ''),
      createdAt: String(row.createdAt ?? ''),
      deleted: Boolean(row.deleted),
    };

    if (filter?.accountId && tx.accountId !== filter.accountId && tx.toAccountId !== filter.accountId) {
      continue;
    }
    if (filter?.categoryId && tx.categoryId !== filter.categoryId) {
      continue;
    }
    if (filter?.kind && tx.kind !== filter.kind) {
      continue;
    }
    if (filter?.month && !tx.date.startsWith(filter.month)) {
      continue;
    }
    if (searchLower) {
      const catName = String(categories[tx.categoryId]?.name ?? '').toLowerCase();
      const noteMatch = tx.note.toLowerCase().includes(searchLower);
      const catMatch = catName.includes(searchLower);
      if (!noteMatch && !catMatch) continue;
    }
    results.push(tx);
  }

  return results.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.id.localeCompare(a.id);
  });
}

export interface AccountWithBalance extends Account {
  balance: Cents;
}

export function getAccountBalances(store: MergeableStore): AccountWithBalance[] {
  const accounts = listAccounts(store);
  const txs = listTransactions(store);
  const deltaByAccount = new Map<string, number>();

  for (const tx of txs) {
    if (tx.kind === 'income') {
      deltaByAccount.set(tx.accountId, (deltaByAccount.get(tx.accountId) ?? 0) + tx.amount);
    } else if (tx.kind === 'expense') {
      deltaByAccount.set(tx.accountId, (deltaByAccount.get(tx.accountId) ?? 0) - tx.amount);
    } else if (tx.kind === 'transfer') {
      deltaByAccount.set(tx.accountId, (deltaByAccount.get(tx.accountId) ?? 0) - tx.amount);
      if (tx.toAccountId) {
        deltaByAccount.set(tx.toAccountId, (deltaByAccount.get(tx.toAccountId) ?? 0) + tx.amount);
      }
    }
  }

  return accounts.map((acc) => ({
    ...acc,
    balance: acc.openingBalance + (deltaByAccount.get(acc.id) ?? 0),
  }));
}

export function getNetWorth(store: MergeableStore): Cents {
  return getAccountBalances(store).reduce((sum, acc) => sum + acc.balance, 0);
}

export interface MonthlySummary {
  month: string;
  income: Cents;
  expense: Cents;
  net: Cents;
}

export function getMonthlySummary(store: MergeableStore, month: string): MonthlySummary {
  const txs = listTransactions(store, { month });
  let income = 0;
  let expense = 0;
  for (const tx of txs) {
    if (tx.kind === 'income') income += tx.amount;
    else if (tx.kind === 'expense') expense += tx.amount;
  }
  return { month, income, expense, net: income - expense };
}

export interface BudgetStatus extends Budget {
  categoryName: string;
  categoryColor: string;
  spent: Cents;
  remaining: Cents;
  progress: number; // 0..1+
}

export function getBudgetStatuses(store: MergeableStore, month: string): BudgetStatus[] {
  const budgetsTable = store.getTable('budgets');
  const categories = listCategories(store, 'expense');
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const txs = listTransactions(store, { month, kind: 'expense' });

  const spentByCategory = new Map<string, number>();
  for (const tx of txs) {
    spentByCategory.set(tx.categoryId, (spentByCategory.get(tx.categoryId) ?? 0) + tx.amount);
  }

  const statuses: BudgetStatus[] = [];
  for (const [id, row] of Object.entries(budgetsTable)) {
    if (row.deleted) continue;
    if (String(row.month) !== month) continue;
    const categoryId = String(row.categoryId ?? '');
    const cat = catMap.get(categoryId);
    if (!cat) continue;
    const limitAmount = Number(row.limitAmount ?? 0);
    const spent = spentByCategory.get(categoryId) ?? 0;
    const remaining = limitAmount - spent;
    const progress = limitAmount > 0 ? spent / limitAmount : spent > 0 ? 1 : 0;
    statuses.push({
      id,
      categoryId,
      month,
      limitAmount,
      rollover: Boolean(row.rollover),
      deleted: false,
      categoryName: cat.name,
      categoryColor: cat.color,
      spent,
      remaining,
      progress,
    });
  }

  return statuses.sort((a, b) => b.spent - a.spent);
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  color: string;
  amount: Cents;
  percentage: number; // 0..100
}

export function getCategoryBreakdown(store: MergeableStore, month: string): CategoryBreakdownItem[] {
  const txs = listTransactions(store, { month, kind: 'expense' });
  const categories = listCategories(store);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const sums = new Map<string, number>();
  let total = 0;
  for (const tx of txs) {
    const key = tx.categoryId || 'uncategorized';
    sums.set(key, (sums.get(key) ?? 0) + tx.amount);
    total += tx.amount;
  }

  const items: CategoryBreakdownItem[] = [];
  for (const [catId, amount] of sums.entries()) {
    const cat = catMap.get(catId);
    items.push({
      categoryId: catId,
      categoryName: cat?.name ?? 'Uncategorized',
      color: cat?.color ?? '#64748b',
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
    });
  }
  return items.sort((a, b) => b.amount - a.amount);
}

export function getRecentMonthsTrend(store: MergeableStore, months: string[]): MonthlySummary[] {
  return months.map((m) => getMonthlySummary(store, m));
}
