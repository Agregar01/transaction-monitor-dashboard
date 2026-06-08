import { describe, it, expect } from "vitest";
import { currencyForJurisdiction, formatMoney } from "@/lib/currency";

describe("currencyForJurisdiction", () => {
  it("maps each jurisdiction to its ISO currency", () => {
    expect(currencyForJurisdiction("GHA")).toBe("GHS");
    expect(currencyForJurisdiction("NGA")).toBe("NGN");
    expect(currencyForJurisdiction("KEN")).toBe("KES");
    expect(currencyForJurisdiction("ZAF")).toBe("ZAR");
  });

  it("falls back to GHS for unknown / null / undefined", () => {
    expect(currencyForJurisdiction(null)).toBe("GHS");
    expect(currencyForJurisdiction(undefined)).toBe("GHS");
    expect(currencyForJurisdiction("XX")).toBe("GHS");
  });
});

describe("formatMoney", () => {
  it("groups thousands and shows the currency", () => {
    const out = formatMoney(50000, "NGN");
    expect(out).toMatch(/50,000/);
    expect(out).toMatch(/NGN|₦/);
  });

  it("does not throw on a malformed currency code", () => {
    expect(() => formatMoney(1000, "Z")).not.toThrow();
  });
});
