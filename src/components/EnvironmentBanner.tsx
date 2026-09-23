// Visible marker on every non-production deployment so nobody works a real
// case in the staging console, or thinks a staging alert is live. The value
// is inlined at build time (NEXT_PUBLIC_*), set per Netlify context in
// netlify.toml. Production and unset render nothing.
type Props = { environment?: string };

export default function EnvironmentBanner({
  environment = process.env.NEXT_PUBLIC_APP_ENV,
}: Props) {
  const env = (environment ?? "").trim().toLowerCase();
  if (env === "" || env === "production") return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-50 w-full bg-amber-400 py-1 text-center text-xs font-semibold uppercase tracking-wide text-black"
    >
      {env} environment: test data only
    </div>
  );
}
