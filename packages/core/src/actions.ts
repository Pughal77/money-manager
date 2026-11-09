import type { MergeableStore } from 'tinybase';
import { uuidv7 } from './id';
import { assertIntegerCents, type Cents } from './money';
import type { AccountType, CategoryKind, TransactionKind } from './schema';

export interface CreateAccountInput {
  id?: string;
  name: string;
  type: AccountType;
  openingBalance: Cents;
  color?: string;
}

export function addAccount(store: MergeableStore, input: CreateAccountInput): string {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Account name is required');
  }
  assertIntegerCents(input.openingBalance);
  const id = input.id ?? uuidv7();
  store.setRow('accounts', id, {
    name,
    type: input.type,
    openingBalance: input.openingBalance,
    color: input.color ?? '#38bdf8',
    createdAt: new Date().toISOString(),
    deleted: false,
  });
  return id;
}

export function updateAccount(
  store: MergeableStore,
  id: string,
  patch: Partial<Omit<CreateAccountInput, 'id'>>
): void {
  if (!store.hasRow('accounts', id)) {
    throw new Error(`Account not found: ${id}`);
  }
  store.transaction(() => {
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (!trimmed) throw new Error('Account name cannot be empty');
      store.setCell('accounts', id, 'name', trimmed);
    }
    if (patch.type !== undefined) {
      store.setCell('accounts', id, 'type', patch.type);
    }
    if (patch.openingBalance !== undefined) {
      assertIntegerCents(patch.openingBalance);
      store.setCell('accounts', id, 'openingBalance', patch.openingBalance);
    }
    if (patch.color !== undefined) {
      store.setCell('accounts', id, 'color', patch.color);
    }
  });
}

export function deleteAccount(store: MergeableStore, id: string): void {
  if (store.hasRow('accounts', id)) {
    store.setCell('accounts', id, 'deleted', true);
  }
}

export interface CreateCategoryInput {
  id?: string;
  name: string;
  kind: CategoryKind;
  icon?: string;
  color?: string;
}

export function addCategory(store: MergeableStore, input: CreateCategoryInput): string {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Category name is required');
  }
  const id = input.id ?? uuidv7();
  store.setRow('categories', id, {
    name,
    kind: input.kind,
    icon: input.icon ?? 'tag',
    color: input.color ?? '#a78bfa',
    createdAt: new Date().toISOString(),
    deleted: false,
  });
  return id;
}

export function deleteCategory(store: MergeableStore, id: string): void {
  if (store.hasRow('categories', id)) {
    store.setCell('categories', id, 'deleted', true);
  }
}

export interface CreateTransactionInput {
  id?: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  kind: TransactionKind;
  amount: Cents;
  date: string; // YYYY-MM-DD
  note?: string;
}

export function addTransaction(store: MergeableStore, input: CreateTransactionInput): string {
  assertIntegerCents(input.amount);
  if (input.amount <= 0) {
    throw new Error('Transaction amount must be positive integer cents');
  }
  if (!input.accountId) {
    throw new Error('Account is required');
  }
  if (input.kind === 'transfer' && (!input.toAccountId || input.toAccountId === input.accountId)) {
    throw new Error('Transfer requires a distinct destination account');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error(`Invalid date format (expected YYYY-MM-DD): ${input.date}`);
  }
  const id = input.id ?? uuidv7();
  store.setRow('transactions', id, {
    accountId: input.accountId,
    toAccountId: input.kind === 'transfer' ? (input.toAccountId ?? '') : '',
    categoryId: input.kind === 'transfer' ? '' : (input.categoryId ?? ''),
    kind: input.kind,
    amount: input.amount,
    date: input.date,
    note: (input.note ?? '').trim(),
    createdAt: new Date().toISOString(),
    deleted: false,
  });
  return id;
}

export function updateTransaction(
  store: MergeableStore,
  id: string,
  patch: Partial<Omit<CreateTransactionInput, 'id'>>
): void {
  if (!store.hasRow('transactions', id)) {
    throw new Error(`Transaction not found: ${id}`);
  }
  store.transaction(() => {
    if (patch.amount !== undefined) {
      assertIntegerCents(patch.amount);
      if (patch.amount <= 0) throw new Error('Transaction amount must be positive integer cents');
      store.setCell('transactions', id, 'amount', patch.amount);
    }
    if (patch.accountId !== undefined) {
      store.setCell('transactions', id, 'accountId', patch.accountId);
    }
    if (patch.toAccountId !== undefined) {
      store.setCell('transactions', id, 'toAccountId', patch.toAccountId);
    }
    if (patch.categoryId !== undefined) {
      store.setCell('transactions', id, 'categoryId', patch.categoryId);
    }
    if (patch.kind !== undefined) {
      store.setCell('transactions', id, 'kind', patch.kind);
    }
    if (patch.date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) {
        throw new Error(`Invalid date format: ${patch.date}`);
      }
      store.setCell('transactions', id, 'date', patch.date);
    }
    if (patch.note !== undefined) {
      store.setCell('transactions', id, 'note', patch.note.trim());
    }
  });
}

export function deleteTransaction(store: MergeableStore, id: string): void {
  if (store.hasRow('transactions', id)) {
    store.setCell('transactions', id, 'deleted', true);
  }
}

export interface SetBudgetInput {
  categoryId: string;
  month: string; // YYYY-MM
  limitAmount: Cents;
  rollover?: boolean;
}

export function setBudget(store: MergeableStore, input: SetBudgetInput): string {
  assertIntegerCents(input.limitAmount);
  if (input.limitAmount < 0) {
    throw new Error('Budget limit cannot be negative');
  }
  if (!/^\d{4}-\d{2}$/.test(input.month)) {
    throw new Error(`Invalid month format (expected YYYY-MM): ${input.month}`);
  }
  const id = `${input.month}:${input.categoryId}`;
  store.setRow('budgets', id, {
    categoryId: input.categoryId,
    month: input.month,
    limitAmount: input.limitAmount,
    rollover: input.rollover ?? false,
    deleted: false,
  });
  return id;
}

export function deleteBudget(store: MergeableStore, id: string): void {
  if (store.hasRow('budgets', id)) {
    store.setCell('budgets', id, 'deleted', true);
  }
}
