import { riskBand, type RiskBand } from "@/config/constants";

const bandClasses: Record<RiskBand, string> = {
  ALLOW: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
  FLAG: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  HOLD: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
  BLOCK: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
};

interface RiskBadgeProps {
  /** 0-300 combined risk score from TMS. */
  score: number;
  /** When true, only renders the band label without the numeric score. */
  bandOnly?: boolean;
}

export default function RiskBadge({ score, bandOnly = false }: RiskBadgeProps) {
  const band = riskBand(score);
  const cls = bandClasses[band];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}
      title={`Risk score ${score} (${band})`}
    >
      <span>{band}</span>
      {!bandOnly && <span className="font-mono text-[10px] opacity-80">{score}</span>}
    </span>
  );
}
