/**
 * Currency + number formatting helpers for the LGA (PKR) context.
 */

export function formatPKR(
  amount: number,
  options?: { maximumFractionDigits?: number }
): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: options?.maximumFractionDigits ?? 0
  }).format(amount);
}

/** Compact PKR, e.g. Rs. 150.2K / Rs. 1.5M */
export function formatPKRCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `Rs. ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `Rs. ${(amount / 1_000).toFixed(1)}K`;
  }
  return formatPKR(amount);
}
