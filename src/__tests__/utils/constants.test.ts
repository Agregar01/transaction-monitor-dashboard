import { describe, it, expect } from "vitest";
import { chartColors } from "@/config/constants";

describe("chartColors", () => {
  it("has action colors for all actions", () => {
    expect(chartColors.action.ALLOW).toBeDefined();
    expect(chartColors.action.BLOCK).toBeDefined();
    expect(chartColors.action.REVIEW).toBeDefined();
    expect(chartColors.action.UPGRADE_REQUIRED).toBeDefined();
  });

  it("has risk colors for all levels", () => {
    expect(chartColors.risk.LOW).toBeDefined();
    expect(chartColors.risk.MEDIUM).toBeDefined();
    expect(chartColors.risk.HIGH).toBeDefined();
    expect(chartColors.risk.CRITICAL).toBeDefined();
  });

  it("has tier colors for KYC and KYB", () => {
    expect(chartColors.tier.T0).toBeDefined();
    expect(chartColors.tier.T3).toBeDefined();
    expect(chartColors.tier.B0).toBeDefined();
    expect(chartColors.tier.B3).toBeDefined();
  });

  it("colors are valid hex strings", () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    Object.values(chartColors.action).forEach((color) => {
      expect(color).toMatch(hexRegex);
    });
    Object.values(chartColors.risk).forEach((color) => {
      expect(color).toMatch(hexRegex);
    });
  });
});
