import { describe, it, expect } from "vitest";
import {
  isAllowedPath,
  isCsrfExempt,
  requiresCsrf,
  normalizeProxyPath,
} from "@/lib/proxy-policy";

describe("isAllowedPath — SSRF guard", () => {
  it("accepts every whitelisted TMS prefix", () => {
    expect(isAllowedPath("/api/v1/alerts/abc")).toBe(true);
    expect(isAllowedPath("/api/v1/cases")).toBe(true);
    expect(isAllowedPath("/api/v1/rules/R-A01")).toBe(true);
    expect(isAllowedPath("/api/v1/str-reports/uuid")).toBe(true);
    expect(isAllowedPath("/api/v1/approvals")).toBe(true);
    expect(isAllowedPath("/api/v1/health/detailed")).toBe(true);
    expect(isAllowedPath("/api/v1/analytics/summary")).toBe(true);
    expect(isAllowedPath("/api/v1/privacy/requests")).toBe(true);
    expect(isAllowedPath("/api/v1/export/transactions")).toBe(true);
    expect(isAllowedPath("/api/v1/export/str/abc/pdf")).toBe(true);
  });

  it("rejects unknown TMS paths", () => {
    expect(isAllowedPath("/api/v1/admin-only-secret")).toBe(false);
    expect(isAllowedPath("/api/v2/transactions")).toBe(false);
    expect(isAllowedPath("/internal/debug")).toBe(false);
  });

  it("rejects empty + suspicious paths", () => {
    expect(isAllowedPath("")).toBe(false);
    expect(isAllowedPath("/")).toBe(false);
    expect(isAllowedPath("/api/v1")).toBe(false);
  });
});

describe("isCsrfExempt", () => {
  it.each(["/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout"])(
    "exempts %s",
    (p) => expect(isCsrfExempt(p)).toBe(true),
  );

  it("does NOT exempt non-auth endpoints", () => {
    expect(isCsrfExempt("/api/v1/alerts/abc")).toBe(false);
    expect(isCsrfExempt("/api/v1/auth/me")).toBe(false); // /me is gated, not exempt
    expect(isCsrfExempt("/api/v1/auth/users")).toBe(false);
  });
});

describe("requiresCsrf", () => {
  it("requires CSRF on POST/PUT/PATCH/DELETE to protected endpoints", () => {
    expect(requiresCsrf("POST", "/api/v1/alerts/abc/resolve")).toBe(true);
    expect(requiresCsrf("PUT", "/api/v1/rules/R-A01")).toBe(true);
    expect(requiresCsrf("PATCH", "/api/v1/cases/uuid")).toBe(true);
    expect(requiresCsrf("DELETE", "/api/v1/watchlists/SANCTIONS/entries/abc")).toBe(true);
  });

  it("skips CSRF on safe methods", () => {
    expect(requiresCsrf("GET", "/api/v1/alerts/abc")).toBe(false);
    expect(requiresCsrf("HEAD", "/api/v1/alerts/abc")).toBe(false);
  });

  it("skips CSRF on /auth/login + /auth/refresh + /auth/logout (public flows)", () => {
    expect(requiresCsrf("POST", "/api/v1/auth/login")).toBe(false);
    expect(requiresCsrf("POST", "/api/v1/auth/refresh")).toBe(false);
    expect(requiresCsrf("POST", "/api/v1/auth/logout")).toBe(false);
  });
});

describe("normalizeProxyPath", () => {
  it("strips the /api/proxy prefix", () => {
    expect(normalizeProxyPath("/api/proxy/api/v1/alerts")).toBe("/api/v1/alerts");
  });

  it("collapses double slashes", () => {
    expect(normalizeProxyPath("/api/proxy//api/v1//alerts")).toBe("/api/v1/alerts");
  });

  it("strips a trailing slash", () => {
    expect(normalizeProxyPath("/api/proxy/api/v1/alerts/")).toBe("/api/v1/alerts");
  });

  it("preserves a root '/'", () => {
    expect(normalizeProxyPath("/api/proxy/")).toBe("/");
  });
});
