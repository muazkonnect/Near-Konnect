// Consistent rounding & formatting for Spark ↔ currency conversions.
// PKR: integer (no decimals, banker-friendly round half-up).
// USDT: 2 decimals everywhere we display, 4 decimals only in admin pricing inputs.

export type SparkCurrency = "PKR" | "USDT";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function sparksToPrice(sparks: number, rate: number, currency: SparkCurrency): number {
  const raw = (sparks || 0) * (rate || 0);
  return currency === "PKR" ? Math.round(raw) : round2(raw);
}

export function formatPrice(amount: number, currency: SparkCurrency): string {
  const n = Number(amount) || 0;
  if (currency === "PKR") {
    return `PKR ${Math.round(n).toLocaleString("en-US")}`;
  }
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
}

export function formatPriceShort(amount: number, currency: SparkCurrency): string {
  const n = Number(amount) || 0;
  if (currency === "PKR") return Math.round(n).toLocaleString("en-US");
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
