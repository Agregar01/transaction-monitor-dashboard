"use client";

/**
 * Shared presentation primitives for the public decision sandbox.
 *
 * Both the single-payment and the sequence view render the same verdict
 * language, so the scale, the panels and the section headings live here once.
 * Keeping them together is what stops the two tabs drifting into two different
 * looking products, which is the thing a visitor notices first.
 */

import { riskBand, riskBandColors, type RiskBand } from "@/config/constants";

/* ── tokens ──────────────────────────────────────────────────────────────── */

/** Raised panel. Used for input surfaces that the visitor acts on. */
export const panelCls =
  "rounded-xl border border-white/[0.06] bg-[#101031] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]";

/** Recessed well. Used for read-only readouts inside a panel. */
export const wellCls = "rounded-lg bg-[#0B0B24] border border-white/[0.05]";

export const inputCls =
  "text-sm rounded-lg border border-white/10 bg-[#0B0B24] text-[#F2F3FA] px-3 py-2 w-full " +
  "placeholder:text-[#5B6091] focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-colors";

/** Machine-written values only: scores, ids, rule codes, amounts. Never prose. */
export const monoCls = "font-mono tabular-nums";

/* ── decision model ──────────────────────────────────────────────────────── */

export const BAND_LABEL: Record<RiskBand, string> = {
  ALLOW: "Allow",
  FLAG: "Flag",
  STEP_UP: "Step up",
  HOLD: "Hold",
  BLOCK: "Block",
};

/**
 * The five bands as discrete segments rather than a gradient. The engine cuts
 * hard at 90 / 120 / 150 / 200, so a gradient would misdescribe the model to
 * the one audience most likely to read the graphic closely.
 */
const SEGMENTS: { band: RiskBand; from: number; to: number }[] = [
  { band: "ALLOW", from: 0, to: 90 },
  { band: "FLAG", from: 90, to: 120 },
  { band: "STEP_UP", from: 120, to: 150 },
  { band: "HOLD", from: 150, to: 200 },
  { band: "BLOCK", from: 200, to: 300 },
];

const MAX = 300;
const pct = (n: number) => (n / MAX) * 100;

/**
 * The band to display for a scored result.
 *
 * The engine returns its own `risk_band` (lower case, e.g. "block") and that is
 * authoritative: it is the band the decision was actually taken in. Deriving
 * the band locally from the score instead makes the page argue with the engine
 * whenever the two disagree, which showed up as a verdict reading "Hold" above
 * a disposition of "Blocked" on a score of 195.
 *
 * The score-derived band stays as the fallback for responses that omit the
 * field, and for the offline local estimate.
 */
export function bandOf(score: number, reported?: string | null): RiskBand {
  const key = String(reported ?? "").trim().toUpperCase().replace(/[\s-]/g, "_");
  if (key in riskBandColors) return key as RiskBand;
  return riskBand(score);
}

/**
 * The hero graphic. With no score it is the explainer: five bands, four
 * thresholds, nothing hidden. With a score the marker travels to its position,
 * which is the page's single piece of non-user-triggered motion.
 */
export function DecisionScale({ score, band = null }: { score: number | null; band?: RiskBand | null }) {
  return (
    <div>
      <div className="flex h-9 w-full gap-[3px]" role="img" aria-label={
        score === null
          ? "Decision scale from 0 to 300 with five bands"
          : `Score ${score} of 300${band ? `, in the ${BAND_LABEL[band]} band` : ""}`
      }>
        {SEGMENTS.map((s) => {
          const live = band === s.band;
          return (
            <div
              key={s.band}
              className="relative rounded-[3px] transition-[opacity,box-shadow] duration-500"
              style={{
                width: `${pct(s.to - s.from)}%`,
                background: riskBandColors[s.band],
                // At rest every band is legible: the scale is the explainer.
                // Once a score lands the others recede so the eye goes to one.
                opacity: score === null ? 0.7 : live ? 1 : 0.14,
                boxShadow: live ? `0 0 0 1px ${riskBandColors[s.band]}66, 0 6px 22px -8px ${riskBandColors[s.band]}` : undefined,
              }}
            />
          );
        })}
      </div>

      {/* Marker rail. Absolute so the marker can travel the full width. */}
      <div className="relative h-4">
        {score !== null && (
          <div
            className="absolute top-0 -translate-x-1/2 motion-safe:transition-[left] motion-safe:duration-700 motion-safe:ease-out"
            style={{ left: `${Math.max(0, Math.min(100, pct(score)))}%` }}
          >
            <div className="mx-auto h-3 w-[2px] rounded bg-[#F2F3FA]" />
          </div>
        )}
      </div>

      {/* The thresholds sit too close to read below ~640px, where the legend
          underneath carries the same numbers on its own lines instead. */}
      <div className="relative hidden h-4 text-[11px] text-[#767CAB] sm:block">
        {[0, 90, 120, 150, 200, 300].map((t) => (
          <span
            key={t}
            className={`absolute top-0 ${monoCls} ${t === 0 ? "" : t === MAX ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: `${pct(t)}%` }}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[#767CAB]">
        {SEGMENTS.map((s) => (
          <span key={s.band} className="inline-flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: riskBandColors[s.band], opacity: band === s.band || score === null ? 1 : 0.3 }}
            />
            <span className={band === s.band ? "text-[#F2F3FA]" : undefined}>{BAND_LABEL[s.band]}</span>
            <span className={monoCls}>{s.from}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The verdict line above the scale. Shared so the two tabs state their result
 * in exactly the same shape.
 *
 * With no score the numeral is omitted rather than shown as a greyed "000",
 * which reads as a real score of zero. `min-h` holds the row's height so the
 * scale underneath does not jump when the first result lands.
 */
export function VerdictHeader({
  score,
  band,
  headline,
  sub,
  aside,
  asideSub,
  asideMono = false,
}: {
  score: number | null;
  band: RiskBand | null;
  headline: string;
  sub: string;
  aside?: string;
  asideSub?: string;
  /** Machine values (a transaction id) set in mono; a name stays in prose. */
  asideMono?: boolean;
}) {
  return (
    <div className="mb-6 flex min-h-[62px] flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="flex items-end gap-5">
        {score !== null && (
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-[52px] font-semibold leading-none ${monoCls}`}
              style={{ color: band ? riskBandColors[band] : "#8A8FB8" }}
            >
              {score}
            </span>
            <span className={`text-[15px] ${monoCls} text-[#5B6091]`}>/300</span>
          </div>
        )}
        <div className="pb-1">
          <div className="text-[17px] font-semibold leading-tight">{headline}</div>
          <div className="text-[13px] text-[#9FA3C4]">{sub}</div>
        </div>
      </div>
      {aside && (
        <div className="text-right">
          <div className={`text-[12px] text-[#8A8FB8] ${asideMono ? monoCls : "font-medium"}`}>{aside}</div>
          {asideSub && <div className="text-[11px] text-[#767CAB]">{asideSub}</div>}
        </div>
      )}
    </div>
  );
}

/**
 * Bring the verdict back into view once a run finishes.
 *
 * The controls are long enough that the run button sits below the fold on a
 * laptop, so without this the score updates somewhere off-screen and the
 * person demonstrating has to scroll up to find their own result. Motion is
 * fine here because a click asked for it; reduced-motion users get a jump.
 */
export function revealVerdict(el: HTMLElement | null) {
  if (!el) return;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

/* ── structure ───────────────────────────────────────────────────────────── */

/**
 * Sentence-case heading with a hairline filling the rest of the row. The rule
 * carries the separation that a tracked all-caps label would otherwise be
 * doing, without shouting at the reader.
 */
export function SectionHeading({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h3 className="text-[13px] font-semibold text-[#C9CCE8] shrink-0">{children}</h3>
      <span className="h-px flex-1 bg-white/[0.07]" />
      {aside && <span className="text-[11px] text-[#767CAB] shrink-0">{aside}</span>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-xs font-medium text-[#9FA3C4]">{label}</label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-[#666C99]">{hint}</p>}
    </div>
  );
}

/** Segmented control. Deliberately not primary-orange: orange is reserved for
 *  the run button and the live verdict, so it keeps meaning one thing. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-[#0B0B24] p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3.5 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
            value === o.value ? "bg-[#22224F] text-[#F2F3FA]" : "text-[#8A8FB8] hover:text-[#C9CCE8]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-primary/60 bg-primary/[0.12] text-[#F5C0A5]"
          : "border-white/10 bg-[#0B0B24] text-[#9FA3C4] hover:border-white/20 hover:text-[#C9CCE8]"
      }`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ background: active ? "#E06030" : "#3A3F6B" }}
      />
      {children}
    </button>
  );
}

export function RunButton({
  onClick,
  busy,
  disabled,
  children,
}: {
  onClick: () => void;
  busy: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {busy ? "Running through the pipeline" : children}
    </button>
  );
}

/** Neutral note. Errors say what happened and what to do, without apologising. */
export function Notice({ tone, children }: { tone: "error" | "warn" | "ok"; children: React.ReactNode }) {
  const tones = {
    error: "border-red-500/30 bg-red-500/[0.08] text-red-200",
    warn: "border-amber-500/30 bg-amber-500/[0.08] text-amber-200",
    ok: "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200/90",
  } as const;
  return <div className={`rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${tones[tone]}`}>{children}</div>;
}
