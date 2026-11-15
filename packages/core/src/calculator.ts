import type { Cents } from './money';
import { formatAmountPlain } from './money';

export type CalcOperator = '+' | '-' | '×' | '÷';

export interface CalculatorState {
  currentInput: string; // e.g. "52.45" or "0"
  previousValue: number | null; // floating value before operator
  operator: CalcOperator | null;
  expression: string; // top small line e.g. "50 + 25"
  justEvaluated: boolean;
}

export function createCalculatorState(initialCents: Cents = 0): CalculatorState {
  if (initialCents <= 0) {
    return {
      currentInput: '0',
      previousValue: null,
      operator: null,
      expression: '0',
      justEvaluated: false,
    };
  }
  const plain = (initialCents / 100).toString();
  return {
    currentInput: plain,
    previousValue: null,
    operator: null,
    expression: plain,
    justEvaluated: true,
  };
}

function evalBinary(a: number, op: CalcOperator, b: number): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return Math.max(0, a - b);
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? a : a / b;
  }
}

function formatInputNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  const rounded = Math.round(n * 100) / 100;
  return rounded.toString();
}

export function stepCalculator(state: CalculatorState, key: string): CalculatorState {
  if (/^[0-9]$/.test(key)) {
    if (state.justEvaluated && !state.operator) {
      const nextInput = key;
      return {
        currentInput: nextInput,
        previousValue: null,
        operator: null,
        expression: nextInput,
        justEvaluated: false,
      };
    }

    const base = state.currentInput === '0' ? '' : state.currentInput;
    if (base.includes('.')) {
      const [, dec = ''] = base.split('.');
      if (dec.length >= 2) return state;
    }
    if (base.replace('.', '').length >= 9) return state;

    const nextInput = (base + key) || '0';
    const expr = state.operator && state.previousValue !== null
      ? `${formatInputNumber(state.previousValue)} ${state.operator} ${nextInput}`
      : nextInput;

    return {
      ...state,
      currentInput: nextInput,
      expression: expr,
      justEvaluated: false,
    };
  }

  if (key === '.') {
    if (state.justEvaluated && !state.operator) {
      return {
        currentInput: '0.',
        previousValue: null,
        operator: null,
        expression: '0.',
        justEvaluated: false,
      };
    }
    if (state.currentInput.includes('.')) return state;
    const nextInput = `${state.currentInput}.`;
    const expr = state.operator && state.previousValue !== null
      ? `${formatInputNumber(state.previousValue)} ${state.operator} ${nextInput}`
      : nextInput;
    return {
      ...state,
      currentInput: nextInput,
      expression: expr,
      justEvaluated: false,
    };
  }

  if (key === 'backspace') {
    if (state.currentInput.length <= 1) {
      const expr = state.operator && state.previousValue !== null
        ? `${formatInputNumber(state.previousValue)} ${state.operator} 0`
        : '0';
      return {
        ...state,
        currentInput: '0',
        expression: expr,
        justEvaluated: false,
      };
    }
    const nextInput = state.currentInput.slice(0, -1);
    const expr = state.operator && state.previousValue !== null
      ? `${formatInputNumber(state.previousValue)} ${state.operator} ${nextInput}`
      : nextInput;
    return {
      ...state,
      currentInput: nextInput,
      expression: expr,
      justEvaluated: false,
    };
  }

  if (key === '+' || key === '-' || key === '×' || key === '÷') {
    const op = key as CalcOperator;
    const currentNum = Number(state.currentInput) || 0;
    const nextPrev =
      state.operator && state.previousValue !== null && !state.justEvaluated
        ? evalBinary(state.previousValue, state.operator, currentNum)
        : currentNum;

    return {
      currentInput: '0',
      previousValue: nextPrev,
      operator: op,
      expression: `${formatInputNumber(nextPrev)} ${op}`,
      justEvaluated: false,
    };
  }

  if (key === '=' || key === 'confirm') {
    if (state.operator && state.previousValue !== null) {
      const currentNum = Number(state.currentInput) || 0;
      const result = evalBinary(state.previousValue, state.operator, currentNum);
      const formatted = formatInputNumber(result);
      return {
        currentInput: formatted,
        previousValue: null,
        operator: null,
        expression: formatted,
        justEvaluated: true,
      };
    }
    return {
      ...state,
      justEvaluated: true,
    };
  }

  return state;
}

export function getCalculatorCents(state: CalculatorState): Cents {
  const currentNum = Number(state.currentInput) || 0;
  const val =
    state.operator && state.previousValue !== null
      ? evalBinary(state.previousValue, state.operator, currentNum)
      : currentNum;
  return Math.max(0, Math.round(val * 100));
}

export function getCalculatorDisplayAmount(state: CalculatorState): string {
  if (!state.operator && state.currentInput.endsWith('.')) {
    const cents = Math.round((Number(state.currentInput.slice(0, -1)) || 0) * 100);
    return `${formatAmountPlain(cents)}.`;
  }
  const cents = getCalculatorCents(state);
  return formatAmountPlain(cents);
}
