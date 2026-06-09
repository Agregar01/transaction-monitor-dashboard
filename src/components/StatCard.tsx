import Link from "next/link";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  /** Period-over-period change. Colour is derived from goodWhen so e.g. a
   *  rising false-positive rate reads red but rising STR-filed reads green. */
  delta?: { pct: number; goodWhen: "up" | "down"; label?: string };
  /** Small inline sparkline (recent trend). ~8-14 points works best. */
  trend?: number[];
  /** When set, the whole card becomes a click-through link. */
  href?: string;
}

/** Minimal dependency-free sparkline as an inline SVG polyline. */
function Sparkline({ points, className }: { points: number[]; className?: string }) {
  if (points.length < 2) return null;
  const w = 72;
  const h = 20;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - ((p - min) / span) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden="true" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function StatCard({ title, value, subtitle, icon, color = "text-primary", delta, trend, href }: StatCardProps) {
  // "up is bad" → red when rising; "up is good" → green when rising. Zero is neutral.
  const deltaColor =
    !delta || delta.pct === 0
      ? "text-gray-400 dark:text-gray-500"
      : (delta.pct > 0) === (delta.goodWhen === "up")
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-600 dark:text-red-400";
  const arrow = !delta || delta.pct === 0 ? "→" : delta.pct > 0 ? "▲" : "▼";

  const body = (
    <div
      className={`bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6 transition-colors ${
        href ? "hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-sm" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {delta && (
              <span className={`text-xs font-semibold ${deltaColor}`}>
                {arrow} {Math.abs(delta.pct)}%{delta.label ? ` ${delta.label}` : ""}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-gray-400 dark:text-gray-500">{icon}</div>
          {trend && trend.length > 1 && <Sparkline points={trend} className={color} />}
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}
