import { type RiskBand, riskBandColors } from "@/config/constants";

export interface LadderBand {
  band: RiskBand;
  count: number;
}

interface SeverityLadderProps {
  title: string;
  subtitle?: string;
  /** Actionable bands in severity order (least → most). ALLOW excluded. */
  bands: LadderBand[];
  /** The "cleared" context number (ALLOW) shown as text, not a bar. */
  clearedCount?: number;
}

/**
 * Replaces the risk-band donut. A donut encodes *proportion*, which is the
 * wrong tool for an extreme long-tail where the dominant bucket (ALLOW ~99%)
 * is the one with zero triage value — it shrinks the actionable bands into
 * invisible slivers. This gives each actionable band a full-width row scaled
 * to the largest actionable count, so BLOCK reads as alarming as it is, and
 * relegates the cleared bucket to a single context number.
 */
export default function SeverityLadder({ title, subtitle, bands, clearedCount }: SeverityLadderProps) {
  // Severity order, most-urgent first — the eye lands on BLOCK/HOLD.
  const severityRank: Record<RiskBand, number> = { BLOCK: 4, HOLD: 3, STEP_UP: 2, FLAG: 1, ALLOW: 0 };
  const sorted = [...bands].sort((a, b) => severityRank[b.band] - severityRank[a.band]);
  // Scale bars to the largest actionable count, NOT the total — so rare-but-
  // severe bands stay visible relative to each other.
  const max = Math.max(1, ...sorted.map((b) => b.count));
  const actionableTotal = sorted.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h2>
        {clearedCount != null && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {clearedCount.toLocaleString()} cleared
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}

      {actionableTotal === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No transactions needed action.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {sorted.map(({ band, count }) => (
            <li key={band}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">{band}</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                  {count.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-navy-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(2, (count / max) * 100)}%`,
                    backgroundColor: riskBandColors[band],
                  }}
                  role="img"
                  aria-label={`${band}: ${count}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
