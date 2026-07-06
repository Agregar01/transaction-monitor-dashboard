import { type RiskBand, riskBandColors } from "@/config/constants";

export interface CompositionBand {
  band: RiskBand;
  count: number;
}

interface RiskCompositionProps {
  title: string;
  subtitle?: string;
  /** Actionable bands (ALLOW excluded). */
  bands: CompositionBand[];
  /** ALLOW count — the cleared bucket. */
  clearedCount?: number;
}

function fmt(n: number): string {
  return n.toLocaleString();
}

/**
 * Risk decisions as a composition bar + severity ladder.
 *
 * The top bar shows the full-population split (cleared vs needs-action) so the
 * part-to-whole proportion is visible at a glance — you can see how small the
 * actionable slice is against the firehose. The ladder beneath gives the
 * actionable bands their own scale (sized to the largest actionable band, not
 * the total), so BLOCK vs HOLD stay comparable instead of collapsing into the
 * long tail. Proportion (bar) + magnitude (ladder) in one card.
 */
export default function RiskComposition({ title, subtitle, bands, clearedCount = 0 }: RiskCompositionProps) {
  const needsAction = bands.reduce((sum, b) => sum + b.count, 0);
  const total = clearedCount + needsAction;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const needsPct = pct(needsAction);

  const severityRank: Record<RiskBand, number> = { BLOCK: 4, HOLD: 3, STEP_UP: 2, FLAG: 1, ALLOW: 0 };
  const sorted = [...bands].sort((a, b) => severityRank[b.band] - severityRank[a.band]);
  const maxBand = Math.max(1, ...sorted.map((b) => b.count));

  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}

      <p className="sr-only">
        {fmt(total)} transactions: {fmt(clearedCount)} allowed ({pct(clearedCount).toFixed(1)}%),
        {fmt(needsAction)} need action ({sorted.map((b) => `${b.band} ${b.count}`).join(", ")}).
      </p>

      {/* Composition bar — full population split. */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-xs mb-1.5">
          <span className="text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(clearedCount)}</span> allowed
          </span>
          <span className="font-semibold text-orange-700 dark:text-orange-300">
            {fmt(needsAction)} need action · {needsPct < 0.1 ? needsPct.toFixed(2) : needsPct.toFixed(1)}%
          </span>
        </div>
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-navy-800">
          <div
            className="h-full bg-emerald-500/70"
            style={{ width: `${pct(clearedCount)}%` }}
            title={`Allowed: ${fmt(clearedCount)}`}
          />
          <div
            className="h-full bg-orange-500"
            style={{ width: `${Math.max(needsAction > 0 ? 1.5 : 0, needsPct)}%` }}
            title={`Needs action: ${fmt(needsAction)}`}
          />
        </div>
      </div>

      {/* Severity ladder — actionable bands on their own scale. */}
      {needsAction > 0 && (
        <ul className="mt-5 space-y-2.5">
          {sorted.map(({ band, count }) => (
            <li key={band}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">{band}</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">{fmt(count)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-navy-800 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(3, (count / maxBand) * 100)}%`, backgroundColor: riskBandColors[band] }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
