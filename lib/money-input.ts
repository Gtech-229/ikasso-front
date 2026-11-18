// Amounts typed by an admin <-> the API's integer strings in the smallest unit.
// Pure string work: an amount never goes through Number (no rounding, no limit).

/** The API's amount rule: a positive integer, no leading zero, at most 18 digits. */
const AMOUNT_PATTERN = /^[1-9][0-9]{0,17}$/;

/**
 * "200 000" (0 decimals) -> "200000"; "12,5" (2 decimals) -> "1250". Spaces and
 * non-breaking spaces are ignored; one "," or "." with at most `decimals`
 * digits. Anything else (sign, letters, too many decimals, zero) -> null.
 */
export function toMinorUnits(text: string, decimals: number): string | null {
  const compact = text.replace(/[\s\u00a0\u202f]/g, "");
  const match = /^(\d+)(?:[.,](\d*))?$/.exec(compact);
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  if (fraction.length > decimals) return null;
  const digits = (whole + fraction.padEnd(decimals, "0")).replace(/^0+/, "");
  return AMOUNT_PATTERN.test(digits) ? digits : null;
}

/** "1250" (2 decimals) -> "12,50"; "200000" (0 decimals) -> "200000". */
export function fromMinorUnits(amount: string, decimals: number): string {
  if (decimals === 0) return amount;
  const padded = amount.padStart(decimals + 1, "0");
  return `${padded.slice(0, -decimals)},${padded.slice(-decimals)}`;
}

/** Compares two valid amount strings without converting them to numbers. */
export function compareAmounts(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}
