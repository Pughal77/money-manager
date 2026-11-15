/**
 * Integer-cents money utilities.
 * All monetary amounts in the database and domain models are integer cents
 * (e.g., $12.34 = 1234, -$5.00 = -500) to avoid floating-point errors.
 */

export type Cents = number;

export function assertIntegerCents(cents: Cents): void {
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Amount must be a safe integer in cents, got: ${cents}`);
  }
}

/**
 * Parses a user-entered decimal string (e.g., "12.34", "-5", "1,234.50") into integer cents.
 */
export function parseToCents(input: string | number): Cents {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      throw new Error(`Invalid numeric amount: ${input}`);
    }
    return Math.round(input * 100);
  }
  const cleaned = input.trim().replace(/[$,\s]/g, '');
  if (!cleaned || !/^[+-]?\d+(\.\d{0,2})?$/.test(cleaned)) {
    throw new Error(`Invalid money string: "${input}"`);
  }
  const sign = cleaned.startsWith('-') ? -1 : 1;
  const unsigned = cleaned.replace(/^[+-]/, '');
  const [wholePart, fracPart = ''] = unsigned.split('.');
  const paddedFrac = (fracPart + '00').slice(0, 2);
  const total = Number(wholePart) * 100 + Number(paddedFrac);
  const result = sign * total;
  // Normalize -0 to 0
  return result === 0 ? 0 : result;
}

/**
 * Formats integer cents into a human-readable currency string.
 */
export function formatCents(
  cents: Cents,
  currency: string = 'USD',
  options?: { showPlusSign?: boolean }
): string {
  assertIntegerCents(cents);
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formatted = formatter.format(cents / 100);
  if (options?.showPlusSign && cents > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Converts integer cents into a plain decimal string (e.g. 1234 -> "12.34") for inputs/CSVs.
 */
export function centsToDecimalString(cents: Cents): string {
  assertIntegerCents(cents);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}

/**
 * Formats integer cents in the clean numeric style used across the app UI:
 * - No currency symbol
 * - Comma thousands separators
 * - Strips trailing ".00" (e.g. 391100 -> "3,911") and trailing "0" in tenths (e.g. 377310 -> "3,773.1")
 */
export function formatAmountPlain(cents: Cents): string {
  assertIntegerCents(cents);
  if (cents === 0) return '0';
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const rem = abs % 100;
  const wholeFormatted = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (rem === 0) {
    return `${sign}${wholeFormatted}`;
  }
  if (rem % 10 === 0) {
    return `${sign}${wholeFormatted}.${rem / 10}`;
  }
  return `${sign}${wholeFormatted}.${String(rem).padStart(2, '0')}`;
}
