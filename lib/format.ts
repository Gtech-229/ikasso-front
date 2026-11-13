// French formatting for amounts and dates shown in the admin.

const AMOUNT_PATTERN = /^-?[1-9][0-9]{0,17}$|^0$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface MoneyFormat {
  /** Currency symbol from the store's country, e.g. "F". */
  symbol: string;
  /** Digits after the decimal separator (0 for XOF). */
  decimals: number;
}

const integerFormat = new Intl.NumberFormat("fr-FR");

/**
 * Formats an API amount: an integer string in the currency's smallest unit
 * ("325000" -> "325 000 F"). Uses BigInt so large amounts keep every digit.
 */
export function formatMoney(amount: string, { symbol, decimals }: MoneyFormat): string {
  if (!AMOUNT_PATTERN.test(amount)) {
    throw new Error(`Montant invalide : ${JSON.stringify(amount)}`);
  }
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`Nombre de décimales invalide : ${decimals}`);
  }

  const negative = amount.startsWith("-");
  const digits = (negative ? amount.slice(1) : amount).padStart(decimals + 1, "0");
  const integerPart = digits.slice(0, digits.length - decimals);
  const fractionPart = decimals > 0 ? digits.slice(-decimals) : "";

  const grouped = integerFormat.format(BigInt(integerPart));
  const number = fractionPart ? `${grouped},${fractionPart}` : grouped;
  // Non-breaking space: the amount and its symbol never wrap apart.
  return `${negative ? "-" : ""}${number} ${symbol}`;
}

/**
 * Every timestamp is shown in one fixed zone, so the server render and the
 * browser render produce the same text (no hydration mismatch). UTC+0, the
 * zone of both pilot countries (Mali, Côte d'Ivoire).
 */
export const DISPLAY_TIME_ZONE = "Africa/Abidjan";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: DISPLAY_TIME_ZONE,
});
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  timeStyle: "short",
  timeZone: DISPLAY_TIME_ZONE,
});

function toDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Date invalide : ${JSON.stringify(value)}`);
  }
  return date;
}

/**
 * "4 octobre 2026". A day string (YYYY-MM-DD, UTC) is formatted in UTC so it
 * never moves to the previous day; a timestamp uses DISPLAY_TIME_ZONE.
 */
export function formatDate(value: string): string {
  return DAY_PATTERN.test(value)
    ? dayFormat.format(toDate(`${value}T00:00:00Z`))
    : dateFormat.format(toDate(value));
}

/** "4 octobre 2026, 10:42", in DISPLAY_TIME_ZONE. */
export function formatDateTime(value: string): string {
  const date = toDate(value);
  return `${dateFormat.format(date)}, ${timeFormat.format(date)}`;
}
