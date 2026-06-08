/**
 * Active-jurisdiction currency helpers.
 *
 * The frontend maps jurisdiction → ISO currency locally because the backend
 * does not yet expose `currency_code` on `/tenant/info` (it only lives on
 * `/jurisdictions/{code}`, which is gated behind `configure_thresholds`, so an
 * analyst can't read their own currency). When `/tenant/info` starts returning
 * `currency_code`, switch `currencyForJurisdiction` to read it and keep this map
 * as the fallback.
 */
export const JURISDICTION_CURRENCY: Record<string, string> = {
  GHA: "GHS",
  NGA: "NGN",
  KEN: "KES",
  ZAF: "ZAR",
};

export function currencyForJurisdiction(code: string | null | undefined): string {
  return (code && JURISDICTION_CURRENCY[code]) || "GHS";
}

/** Currency-aware money, e.g. "GHS 50,000". Falls back gracefully on bad codes. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}

/** Compact money for dense cells, e.g. "GHS 1.2M". */
export function formatMoneyCompact(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}
