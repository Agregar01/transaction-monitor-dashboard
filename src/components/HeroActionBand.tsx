import Link from "next/link";
import { ExclamationTriangleIcon, CheckCircleIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

export interface ActionItem {
  /** The number that matters — e.g. 3 immediate alerts. */
  count: number;
  /** Short noun, e.g. "IMMEDIATE alerts". */
  label: string;
  /** Why it needs attention, e.g. "untriaged". */
  sublabel: string;
}

interface HeroActionBandProps {
  items: ActionItem[];
  /** Primary call-to-action. */
  cta: { label: string; href: string };
  /** Message shown when nothing needs action. */
  clearMessage?: string;
}

/**
 * The one band an analyst should read first. Surfaces only items with a
 * non-zero count; turns calm (slate/green) when the queue is clear and amber
 * when there's pending work. Creates the top-of-page hierarchy the flat KPI
 * grid lacks.
 */
export default function HeroActionBand({ items, cta, clearMessage = "All clear — nothing needs your attention." }: HeroActionBandProps) {
  const active = items.filter((i) => i.count > 0);
  const hasWork = active.length > 0;

  return (
    <div
      className={`rounded-xl border p-5 ${
        hasWork
          ? "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/15"
          : "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/15"
      }`}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {hasWork ? (
            <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircleIcon className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <div className="min-w-0">
            <p
              className={`text-sm font-semibold ${
                hasWork ? "text-amber-900 dark:text-amber-200" : "text-emerald-900 dark:text-emerald-200"
              }`}
            >
              {hasWork ? "Needs your attention" : clearMessage}
            </p>
            {hasWork && (
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {active.map((i) => (
                  <div key={i.label} className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-amber-900 dark:text-amber-100">{i.count}</span>
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">{i.label}</span>
                    <span className="text-xs text-amber-700/80 dark:text-amber-300/70">{i.sublabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {hasWork && (
          <Link
            href={cta.href}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors"
          >
            {cta.label}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
