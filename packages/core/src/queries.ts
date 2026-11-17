import type { MergeableStore } from 'tinybase';
import type { Cents } from './money';
import {
  parseSubcategoriesJson,
  type Account,
  type AccountType,
  type Budget,
  type BudgetPeriodType,
  type Category,
  type CategoryKind,
  type ThemeMode,
  type ThemeAccent,
  type Transaction,
  type TransactionKind,
} from './schema';
import { normalizeBudgetPeriod } from './uiMath';

export function getThemeMode(store: MergeableStore): ThemeMode {
  const val = String(store.getValue('theme') ?? 'dark');
  return val === 'light' ? 'light' : 'dark';
}

export function getThemeAccent(store: MergeableStore): ThemeAccent {
  const val = String(store.getValue('themeAccent') ?? 'emerald');
  switch (val) {
    case 'cobalt':
    case 'amethyst':
    case 'slate':
      return val;
    default:
      return 'emerald';
  }
}

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
      color: String(row.color ?? '#F3A833'),
      createdAt: String(row.createdAt ?? ''),
      deleted: Boolean(row.deleted),
    });
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export function getAccountById(store: MergeableStore, id: string): Account | undefined {
  if (!id || !store.hasRow('accounts', id)) return undefined;
  const row = store.getRow('accounts', id);
  if (row.deleted) return undefined;
  return {
    id,
    name: String(row.name ?? ''),
    type: (row.type as AccountType) ?? 'checking',
    openingBalance: Number(row.openingBalance ?? 0),
    color: String(row.color ?? '#F3A833'),
    createdAt: String(row.createdAt ?? ''),
    deleted: Boolean(row.deleted),
  };
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
      icon: String(row.icon ?? 'dots'),
      color: String(row.color ?? '#F29B9B'),
      subcategories: parseSubcategoriesJson(row.subcategories),
      sortOrder: Number(row.sortOrder ?? 99),
      createdAt: String(row.createdAt ?? ''),
      deleted: Boolean(row.deleted),
    });
  }
  return results.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

export function getCategoryById(store: MergeableStore, id: string): Category | undefined {
  if (!id || !store.hasRow('categories', id)) return undefined;
  const row = store.getRow('categories', id);
  if (row.deleted) return undefined;
  return {
    id,
    name: String(row.name ?? ''),
    kind: (row.kind as CategoryKind) ?? 'expense',
    icon: String(row.icon ?? 'dots'),
    color: String(row.color ?? '#F29B9B'),
    subcategories: parseSubcategoriesJson(row.subcategories),
    sortOrder: Number(row.sortOrder ?? 99),
    createdAt: String(row.createdAt ?? ''),
    deleted: Boolean(row.deleted),
  };
}

/**
 * Formats the display title for a transaction matching the reference UI:
 * - Income transactions: `income > Salary` (or `income > ${subcategory}`)
 * - Expense transactions: `Food > Eating out` (or `Online shopping > Other`)
 * - Uncategorized: `Uncategorized > Uncategorized`
 */
export function formatTransactionTitle(category: Category | undefined, tx: Transaction): string {
  if (tx.kind === 'transfer') {
    return 'Transfer';
  }
  if (!category) {
    return tx.kind === 'income' ? 'income > Other' : 'Uncategorized > Uncategorized';
  }
  if (tx.kind === 'income') {
    const sub = tx.subcategory && tx.subcategory !== category.name ? tx.subcategory : category.name;
    return `income > ${sub}`;
  }
  const sub = tx.subcategory || category.subcategories[0] || 'Other';
  return `${category.name} > ${sub}`;
}

export interface TransactionFilter {
  accountId?: string;
  categoryId?: string;
  subcategory?: string;
  kind?: TransactionKind;
  month?: string; // YYYY-MM prefix
  date?: string; // exact YYYY-MM-DD
  startDate?: string; // inclusive YYYY-MM-DD
  endDate?: string; // inclusive YYYY-MM-DD
  search?: string;
}

export function getTransactionById(store: MergeableStore, id: string): Transaction | undefined {
  if (!id || !store.hasRow('transactions', id)) return undefined;
  const row = store.getRow('transactions', id);
  if (row.deleted) return undefined;
  return {
    id,
    accountId: String(row.accountId ?? ''),
    toAccountId: String(row.toAccountId ?? ''),
    categoryId: String(row.categoryId ?? ''),
    subcategory: String(row.subcategory ?? ''),
    kind: (row.kind as TransactionKind) ?? 'expense',
    amount: Number(row.amount ?? 0),
    date: String(row.date ?? ''),
    note: String(row.note ?? ''),
    createdAt: String(row.createdAt ?? ''),
    deleted: Boolean(row.deleted),
  };
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
      subcategory: String(row.subcategory ?? ''),
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
    if (filter?.subcategory !== undefined && filter.subcategory !== '') {
      const catRow = categories[tx.categoryId];
      const catSubs = parseSubcategoriesJson(catRow?.subcategories);
      const effectiveSub = tx.subcategory || catSubs[0] || 'Other';
      if (effectiveSub !== filter.subcategory) continue;
    }
    if (filter?.kind && tx.kind !== filter.kind) {
      continue;
    }
    if (filter?.month && !tx.date.startsWith(filter.month)) {
      continue;
    }
    if (filter?.date && tx.date !== filter.date) {
      continue;
    }
    if (filter?.startDate && tx.date < filter.startDate) {
      continue;
    }
    if (filter?.endDate && tx.date > filter.endDate) {
      continue;
    }
    if (searchLower) {
      const catName = String(categories[tx.categoryId]?.name ?? '').toLowerCase();
      const subMatch = tx.subcategory.toLowerCase().includes(searchLower);
      const noteMatch = tx.note.toLowerCase().includes(searchLower);
      const catMatch = catName.includes(searchLower);
      if (!noteMatch && !catMatch && !subMatch) continue;
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

export interface PeriodSummary {
  startDate: string;
  endDate: string;
  income: Cents;
  expense: Cents;
  net: Cents;
}

export function getPeriodSummary(
  store: MergeableStore,
  startDate: string,
  endDate: string
): PeriodSummary {
  const txs = listTransactions(store, { startDate, endDate });
  let income = 0;
  let expense = 0;
  for (const tx of txs) {
    if (tx.kind === 'income') income += tx.amount;
    else if (tx.kind === 'expense') expense += tx.amount;
  }
  return { startDate, endDate, income, expense, net: income - expense };
}

export interface DailyCalendarTotal {
  date: string; // YYYY-MM-DD
  income: Cents;
  expense: Cents;
}

export function getDailyCalendarTotals(
  store: MergeableStore,
  startDate: string,
  endDate: string
): Record<string, DailyCalendarTotal> {
  const txs = listTransactions(store, { startDate, endDate });
  const map: Record<string, DailyCalendarTotal> = {};
  for (const tx of txs) {
    if (!map[tx.date]) {
      map[tx.date] = { date: tx.date, income: 0, expense: 0 };
    }
    if (tx.kind === 'income') {
      map[tx.date].income += tx.amount;
    } else if (tx.kind === 'expense') {
      map[tx.date].expense += tx.amount;
    }
  }
  return map;
}

export interface BudgetStatus extends Budget {
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string;
  periodLabel: string;
  categoryName: string;
  categoryColor: string;
  spent: Cents;
  remaining: Cents;
  progress: number; // 0..1+
}

export function getBudgetStatuses(store: MergeableStore, monthOrPeriod: string): BudgetStatus[] {
  const { periodKey, periodType, range } = normalizeBudgetPeriod(monthOrPeriod);
  const budgetsTable = store.getTable('budgets');
  const categories = listCategories(store, 'expense');
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const txs = listTransactions(store, {
    startDate: range.startDate,
    endDate: range.endDate,
    kind: 'expense',
  });

  const spentByCategory = new Map<string, number>();
  let totalSpent = 0;
  for (const tx of txs) {
    spentByCategory.set(tx.categoryId, (spentByCategory.get(tx.categoryId) ?? 0) + tx.amount);
    totalSpent += tx.amount;
  }

  const statuses: BudgetStatus[] = [];
  for (const [id, row] of Object.entries(budgetsTable)) {
    if (row.deleted) continue;

    let rowPeriodKey: string;
    let rowPeriodType: BudgetPeriodType;
    try {
      const norm = normalizeBudgetPeriod(String(row.month ?? ''));
      rowPeriodKey = norm.periodKey;
      rowPeriodType =
        row.periodType === 'weekly' || row.periodType === 'monthly' || row.periodType === 'yearly'
          ? row.periodType
          : norm.periodType;
    } catch {
      continue;
    }
    if (rowPeriodKey !== periodKey) continue;

    const categoryId = String(row.categoryId ?? '');
    const isAll = categoryId === 'all';
    const cat = isAll ? undefined : catMap.get(categoryId);
    if (!isAll && !cat) continue;

    const limitAmount = Number(row.limitAmount ?? 0);
    const spent = isAll ? totalSpent : (spentByCategory.get(categoryId) ?? 0);
    const remaining = limitAmount - spent;
    const progress = limitAmount > 0 ? spent / limitAmount : spent > 0 ? 1 : 0;
    const periodLabel =
      rowPeriodType === 'weekly'
        ? `${range.rangeLabel} (${range.fullMonthYearLabel})`
        : range.fullMonthYearLabel;

    statuses.push({
      id,
      categoryId,
      month: periodKey,
      periodType: rowPeriodType,
      startDate: range.startDate,
      endDate: range.endDate,
      periodLabel,
      limitAmount,
      rollover: Boolean(row.rollover),
      deleted: false,
      categoryName: isAll ? 'All Expenses' : cat!.name,
      categoryColor: isAll ? '#F3A833' : cat!.color,
      spent,
      remaining,
      progress,
    });
  }

  return statuses.sort((a, b) => {
    if (a.categoryId === 'all' && b.categoryId !== 'all') return -1;
    if (b.categoryId === 'all' && a.categoryId !== 'all') return 1;
    return b.spent - a.spent;
  });
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  amount: Cents;
  percentage: number; // 0..100
  transactionCount: number;
}

export function getCategoryBreakdown(
  store: MergeableStore,
  month: string,
  kind: CategoryKind = 'expense'
): CategoryBreakdownItem[] {
  const txs = listTransactions(store, { month, kind });
  return buildCategoryBreakdown(store, txs, kind);
}

export function getCategoryBreakdownByRange(
  store: MergeableStore,
  startDate: string,
  endDate: string,
  kind: CategoryKind = 'expense'
): CategoryBreakdownItem[] {
  const txs = listTransactions(store, { startDate, endDate, kind });
  return buildCategoryBreakdown(store, txs, kind);
}

function buildCategoryBreakdown(
  store: MergeableStore,
  txs: Transaction[],
  kind: CategoryKind
): CategoryBreakdownItem[] {
  const categories = listCategories(store);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  let total = 0;
  for (const tx of txs) {
    const key = tx.categoryId || 'uncategorized';
    sums.set(key, (sums.get(key) ?? 0) + tx.amount);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total += tx.amount;
  }

  const items: CategoryBreakdownItem[] = [];
  for (const [catId, amount] of sums.entries()) {
    const cat = catMap.get(catId);
    items.push({
      categoryId: catId,
      categoryName: cat?.name ?? 'Uncategorized',
      icon: cat?.icon ?? (kind === 'income' ? 'banknotes' : 'question'),
      color: cat?.color ?? (kind === 'income' ? '#FCE07D' : '#CBD5E1'),
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      transactionCount: counts.get(catId) ?? 0,
    });
  }
  return items.sort((a, b) => b.amount - a.amount);
}

export interface SubcategoryBreakdownItem {
  subcategory: string;
  color: string;
  amount: Cents;
  percentage: number;
  transactionCount: number;
}

export function getSubcategoryBreakdown(
  store: MergeableStore,
  categoryId: string,
  startDate: string,
  endDate: string
): SubcategoryBreakdownItem[] {
  const cat = getCategoryById(store, categoryId);
  const txs = listTransactions(store, { categoryId, startDate, endDate });
  const presetSubs = cat?.subcategories.length ? cat.subcategories : ['Other'];
  const baseColor = cat?.color ?? '#F29B9B';

  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const sub of presetSubs) {
    sums.set(sub, 0);
    counts.set(sub, 0);
  }

  let total = 0;
  for (const tx of txs) {
    const sub = tx.subcategory || presetSubs[0] || 'Other';
    sums.set(sub, (sums.get(sub) ?? 0) + tx.amount);
    counts.set(sub, (counts.get(sub) ?? 0) + 1);
    total += tx.amount;
  }

  const items: SubcategoryBreakdownItem[] = [];
  for (const [subcategory, amount] of sums.entries()) {
    items.push({
      subcategory,
      color: baseColor,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      transactionCount: counts.get(subcategory) ?? 0,
    });
  }

  // Sort active subcategories (> 0) by amount descending first, then preserve preset order for 0-amount rows
  return items.sort((a, b) => {
    if (a.amount > 0 && b.amount > 0) return b.amount - a.amount;
    if (a.amount > 0) return -1;
    if (b.amount > 0) return 1;
    return 0;
  });
}

export function getRecentMonthsTrend(store: MergeableStore, months: string[]): MonthlySummary[] {
  return months.map((m) => getMonthlySummary(store, m));
}
