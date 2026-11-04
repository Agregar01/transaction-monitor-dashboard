import type { CSSProperties } from "react";

// Visible marker on every non-production deployment so nobody works a real
// case in the staging console, or thinks a staging alert is live. Both values
// are inlined at build time: NEXT_PUBLIC_APP_ENV per Netlify context
// (netlify.toml), NEXT_PUBLIC_BACKEND_HOST derived from BACKEND_URL in
// next.config.mjs. Production and unset render nothing.

export const PRODUCTION_BACKEND_HOST = "monitor.agregartech.com";
const BANNER_HEIGHT = "1.5rem";

export type Banner = { tone: "notice" | "danger"; text: string };

// A non-production build pointed at the production backend gets a red
// warning instead of "test data only": that label would be a lie there.
export function environmentBanner(environment?: string, backendHost?: string): Banner | null {
  const env = (environment ?? "").trim().toLowerCase();
  if (env === "" || env === "production") return null;
  if ((backendHost ?? "").trim().toLowerCase() === PRODUCTION_BACKEND_HOST) {
    return { tone: "danger", text: `${env} build connected to the PRODUCTION backend: live data` };
  }
  return { tone: "notice", text: `${env} environment: test data only` };
}

// Set on <html>; fixed/sticky chrome offsets itself by var(--env-banner-h,0px)
// so the banner never covers navigation.
export function bannerOffsetStyle(banner: Banner | null): CSSProperties | undefined {
  return banner ? ({ "--env-banner-h": BANNER_HEIGHT } as CSSProperties) : undefined;
}

type Props = { environment?: string; backendHost?: string };

export default function EnvironmentBanner({
  environment = process.env.NEXT_PUBLIC_APP_ENV,
  backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST,
}: Props) {
  const banner = environmentBanner(environment, backendHost);
  if (!banner) return null;
  const tone = banner.tone === "danger" ? "bg-red-600 text-white" : "bg-amber-400 text-black";
  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-0 z-[60] flex h-[var(--env-banner-h,1.5rem)] items-center justify-center text-xs font-semibold uppercase tracking-wide ${tone}`}
    >
      {banner.text}
    </div>
  );
}
