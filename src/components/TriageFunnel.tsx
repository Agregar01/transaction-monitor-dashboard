import { type RiskBand, riskBandColors } from "@/config/constants";

export interface FunnelBand {
  band: RiskBand;
  count: number;
}

interface TriageFunnelProps {
  title: string;
  subtitle?: string;
  /** Actionable bands (ALLOW excluded). */
  bands: FunnelBand[];
  /** ALLOW count — the cleared bucket. */
  clearedCount?: number;
}

function fmt(n: number): string {
  return n.toLocaleString();
}

/**
 * Risk decisions as a triage funnel. A donut/ladder answers "which bands and how
 * many" but loses the part-to-whole story; this leads with the funnel — All
 * transactions → Cleared → Needs action — so an analyst sees at a glance how
 * few of the firehose require a human, then the actionable bands broken out.
 *
 * Two scales on purpose: the funnel rows scale to the TOTAL (so "needs action"
 * reads as the tiny sliver it is), while the band rows scale to the largest
 * ACTIONABLE band (so BLOCK vs HOLD stay comparable instead of collapsing into
 * the long tail).
 */
export default function TriageFunnel({ title, subtitle, bands, clearedCount = 0 }: TriageFunnelProps) {
  const needsAction = bands.reduce((sum, b) => sum + b.count, 0);
  const total = clearedCount + needsAction;
  const pctOfTotal = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const needsPct = pctOfTotal(needsAction);

  // Severity order, most-urgent first.
  const severityRank: Record<RiskBand, number> = { BLOCK: 4, HOLD: 3, STEP_UP: 2, FLAG: 1, ALLOW: 0 };
  const sorted = [...bands].sort((a, b) => severityRank[b.band] - severityRank[a.band]);
  const maxBand = Math.max(1, ...sorted.map((b) => b.count));

  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}

      {/* Screen-reader summary — bars are decorative. */}
      <p className="sr-only">
        {fmt(total)} transactions: {fmt(clearedCount)} cleared, {fmt(needsAction)} need action
        ({sorted.map((b) => `${b.band} ${b.count}`).join(", ")}).
      </p>

      {/* Funnel: scaled to total so "needs action" reads as a sliver. */}
      <div className="mt-4 space-y-2">
        <FunnelRow label="All transactions" count={total} pct={100} color="#64748b" muted />
        <FunnelRow label="Cleared" count={clearedCount} pct={pctOfTotal(clearedCount)} color="#22c55e" muted />
        <FunnelRow label="Needs action" count={needsAction} pct={needsPct} color="#f97316" emphasize />
      </div>

      {/* Actionable bands, scaled to each other so magnitudes stay comparable. */}
      {needsAction > 0 && (
        <ul className="mt-4 pt-4 border-t border-gray-100 dark:border-navy-600 space-y-2.5">
          {sorted.map(({ band, count }, i) => (
            <li key={band} className="flex items-center gap-2">
              <span className="text-gray-300 dark:text-navy-500 font-mono text-xs select-none">
                {i === sorted.length - 1 ? "└─" : "├─"}
              </span>
              <span className="w-16 shrink-0 text-xs font-medium text-gray-700 dark:text-gray-200">{band}</span>
              <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-navy-800 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(3, (count / maxBand) * 100)}%`, backgroundColor: riskBandColors[band] }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-xs font-semibold text-gray-900 dark:text-white">
                {fmt(count)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FunnelRow({
  label,
  count,
  pct,
  color,
  muted,
  emphasize,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
  muted?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-28 shrink-0 text-xs ${
          emphasize ? "font-semibold text-orange-700 dark:text-orange-300" : "text-gray-600 dark:text-gray-300"
        }`}
      >
        {label}
      </span>
      <div className="flex-1 h-5 rounded bg-gray-100 dark:bg-navy-800 overflow-hidden">
        <div
          className="h-full rounded transition-all"
          style={{ width: `${Math.max(0.5, pct)}%`, backgroundColor: color, opacity: muted ? 0.55 : 1 }}
        />
      </div>
      <span
        className={`w-20 shrink-0 text-right font-mono text-xs ${
          emphasize ? "font-bold text-orange-700 dark:text-orange-300" : "text-gray-700 dark:text-gray-200"
        }`}
      >
        {fmt(count)}
      </span>
    </div>
  );
}
