import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EnvironmentBanner, {
  PRODUCTION_BACKEND_HOST,
  bannerOffsetStyle,
  environmentBanner,
} from "@/components/EnvironmentBanner";

const STAGING_HOST = "monitor-staging.agregartech.com";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("environmentBanner (what to show)", () => {
  it.each([["production"], ["Production "], [""], [undefined]])(
    "shows nothing for environment %j",
    (environment) => {
      expect(environmentBanner(environment, STAGING_HOST)).toBeNull();
    },
  );

  it.each([["staging"], ["preview"], ["branch"], ["development"]])(
    "labels a %s build pointed at a non-production backend as test data",
    (environment) => {
      const banner = environmentBanner(environment, STAGING_HOST);
      expect(banner?.tone).toBe("notice");
      expect(banner?.text).toMatch(new RegExp(environment, "i"));
      expect(banner?.text).toMatch(/test data/i);
    },
  );

  it("warns loudly when a non-production build is pointed at the production backend", () => {
    const banner = environmentBanner("preview", PRODUCTION_BACKEND_HOST);
    expect(banner?.tone).toBe("danger");
    expect(banner?.text).toMatch(/production backend/i);
    expect(banner?.text).not.toMatch(/test data/i);
  });

  it("matches the production host case-insensitively", () => {
    expect(environmentBanner("staging", "Monitor.AgregarTech.com")?.tone).toBe("danger");
  });
});

describe("<EnvironmentBanner /> (build-time env path)", () => {
  it("reads NEXT_PUBLIC_APP_ENV and NEXT_PUBLIC_BACKEND_HOST when no props are given", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_HOST", STAGING_HOST);
    render(<EnvironmentBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/staging environment: test data only/i);
  });

  it("renders nothing when NEXT_PUBLIC_APP_ENV is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "");
    const { container } = render(<EnvironmentBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the danger banner for a preview pointed at production", () => {
    render(<EnvironmentBanner environment="preview" backendHost={PRODUCTION_BACKEND_HOST} />);
    expect(screen.getByRole("status")).toHaveTextContent(/production backend/i);
  });
});

describe("layout offset (the banner must not cover navigation)", () => {
  it("reserves banner height only when a banner shows", () => {
    expect(bannerOffsetStyle(null)).toBeUndefined();
    const style = bannerOffsetStyle(environmentBanner("staging", STAGING_HOST)) as Record<string, string>;
    expect(style["--env-banner-h"]).toBe("1.5rem");
  });

  // Fixed/sticky chrome must start below the banner, via --env-banner-h.
  it.each([
    ["src/components/Sidebar.tsx", ["fixed top-4 ", "fixed inset-0 z-40", "fixed inset-y-0"]],
    ["src/app/dashboard/layout.tsx", ["sticky top-0 "]],
    // The focused skip link must appear below the banner, not under it.
    ["src/app/layout.tsx", ["focus:top-2 "]],
  ])("%s offsets its fixed/sticky elements by the banner height", (file, forbidden) => {
    const src = readFileSync(path.resolve(__dirname, "../../..", file), "utf-8");
    for (const pattern of forbidden) expect(src).not.toContain(pattern);
    expect(src).toContain("var(--env-banner-h,0px)");
  });
});

describe("netlify.toml contexts", () => {
  const toml = readFileSync(path.resolve(__dirname, "../../../netlify.toml"), "utf-8");

  it.each([["production"], ["staging"], ["deploy-preview"], ["branch-deploy"], ["dev"]])(
    "labels the %s context so no Netlify build is unlabelled",
    (context) => {
      expect(toml).toMatch(
        new RegExp(`\\[context\\.${context}\\.environment\\]\\s*\\n\\s*NEXT_PUBLIC_APP_ENV\\s*=`),
      );
    },
  );
});
