"use client";

import { useState } from "react";
import {
  useListJurisdictionsQuery,
  useUpdateJurisdictionMutation,
} from "@/redux/slices/api/jurisdictionsApi";
import { SkeletonTable } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { DEFAULT_DECISION_BANDS, type Jurisdiction } from "@/types/api";

type BandField = "flag_threshold" | "step_up_threshold" | "hold_threshold" | "block_threshold";

const BAND_FIELDS: { key: BandField; label: string }[] = [
  { key: "flag_threshold", label: "Flag" },
  { key: "step_up_threshold", label: "Step-up" },
  { key: "hold_threshold", label: "Hold" },
  { key: "block_threshold", label: "Block" },
];

/** Blank input = "use the static default" (null). Parses to a validated int, or null. */
function parseBand(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Validates flag <= step_up <= hold <= block within 0-300, substituting the static
 * default for any band left blank so the ordering check reflects the value that
 * will actually be in effect. Returns an error message, or null if valid. */
function validateBands(raw: Record<BandField, string>): string | null {
  const resolved = BAND_FIELDS.map(({ key }) => {
    const parsed = parseBand(raw[key]);
    return parsed ?? DEFAULT_DECISION_BANDS[key];
  });
  for (const v of resolved) {
    if (v < 0 || v > 300) return "Decision bands must be between 0 and 300.";
  }
  for (let i = 1; i < resolved.length; i++) {
    if (resolved[i] < resolved[i - 1]) {
      return "Decision bands must be non-decreasing: Flag ≤ Step-up ≤ Hold ≤ Block.";
    }
  }
  return null;
}

export default function JurisdictionsPage() {
  const { data, isLoading, error } = useListJurisdictionsQuery();
  const [editing, setEditing] = useState<Jurisdiction | null>(null);
  const [ctrCash, setCtrCash] = useState("");
  const [ctrNonCash, setCtrNonCash] = useState("");
  const [strDeadline, setStrDeadline] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [bands, setBands] = useState<Record<BandField, string>>({
    flag_threshold: "",
    step_up_threshold: "",
    hold_threshold: "",
    block_threshold: "",
  });
  const [bandError, setBandError] = useState<string | null>(null);
  const [updateJurisdiction, { isLoading: saving }] = useUpdateJurisdictionMutation();

  const startEdit = (j: Jurisdiction) => {
    setEditing(j);
    setCtrCash(j.ctr_threshold_cash.toString());
    setCtrNonCash(j.ctr_threshold_non_cash.toString());
    setStrDeadline(j.str_deadline_hours.toString());
    setIsActive(j.is_active);
    setBands({
      flag_threshold: j.flag_threshold != null ? String(j.flag_threshold) : "",
      step_up_threshold: j.step_up_threshold != null ? String(j.step_up_threshold) : "",
      hold_threshold: j.hold_threshold != null ? String(j.hold_threshold) : "",
      block_threshold: j.block_threshold != null ? String(j.block_threshold) : "",
    });
    setBandError(null);
  };

  const submitEdit = async () => {
    if (!editing) return;
    const validationError = validateBands(bands);
    if (validationError) {
      setBandError(validationError);
      return;
    }
    try {
      const res = await updateJurisdiction({
        code: editing.code,
        ctr_threshold_cash: Number(ctrCash),
        ctr_threshold_non_cash: Number(ctrNonCash),
        str_deadline_hours: Number(strDeadline),
        is_active: isActive,
        flag_threshold: parseBand(bands.flag_threshold),
        step_up_threshold: parseBand(bands.step_up_threshold),
        hold_threshold: parseBand(bands.hold_threshold),
        block_threshold: parseBand(bands.block_threshold),
      }).unwrap();
      showToast({
        type: "info",
        title: res.approval_id ? "Awaiting approval" : "Updated",
        message: res.approval_id
          ? `Approval ${res.approval_id.slice(0, 8)}… — change pending second approver.`
          : `${editing.code} updated.`,
      });
      setEditing(null);
    } catch (e) {
      showToast({ type: "error", title: "Update failed", message: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Jurisdictions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Per-jurisdiction CTR/STR thresholds and reporting deadlines. Edits trigger four-eyes
          approval.
        </p>
      </div>

      {isLoading ? (
        <SkeletonTable rows={4} cols={7} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load jurisdictions.
        </div>
      ) : !data || data.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No jurisdictions configured.
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-right">CTR cash</th>
                <th className="px-4 py-2 text-right">CTR non-cash</th>
                <th className="px-4 py-2 text-left">Currency</th>
                <th className="px-4 py-2 text-right">STR deadline</th>
                <th className="px-4 py-2 text-left">Regulator</th>
                <th className="px-4 py-2 text-left">Active</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.map((j) => (
                <tr key={j.code} className="hover:bg-gray-50 dark:hover:bg-navy-600">
                  <td className="px-4 py-2 font-mono text-xs">{j.code}</td>
                  <td className="px-4 py-2">{j.name}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {Number(j.ctr_threshold_cash).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {Number(j.ctr_threshold_non_cash).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-xs">{j.currency_code}</td>
                  <td className="px-4 py-2 text-right text-xs">{j.str_deadline_hours}h</td>
                  <td className="px-4 py-2 text-xs">{j.regulator_name}</td>
                  <td className="px-4 py-2 text-xs">
                    {j.is_active ? (
                      <span className="text-green-600">●</span>
                    ) : (
                      <span className="text-gray-400">○</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => startEdit(j)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl p-6 max-w-md w-full space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Editing
              </p>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing.code} — {editing.name}
              </h2>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                CTR threshold — cash ({editing.currency_code})
              </label>
              <input
                type="number"
                aria-label="CTR threshold — cash"
                value={ctrCash}
                onChange={(e) => setCtrCash(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                CTR threshold — non-cash ({editing.currency_code})
              </label>
              <input
                type="number"
                aria-label="CTR threshold — non-cash"
                value={ctrNonCash}
                onChange={(e) => setCtrNonCash(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                STR deadline (hours)
              </label>
              <input
                type="number"
                aria-label="STR deadline (hours)"
                value={strDeadline}
                onChange={(e) => setStrDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Decision bands
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Leave a field blank to use the engine default shown in its placeholder.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {BAND_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label
                      htmlFor={`band-${key}`}
                      className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5"
                    >
                      {label}
                    </label>
                    <input
                      id={`band-${key}`}
                      type="number"
                      min={0}
                      max={300}
                      placeholder={`default (${DEFAULT_DECISION_BANDS[key]})`}
                      value={bands[key]}
                      onChange={(e) => {
                        setBands((prev) => ({ ...prev, [key]: e.target.value }));
                        setBandError(null);
                      }}
                      className="w-full px-2 py-1.5 text-xs font-mono border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
              {bandError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{bandError}</p>
              )}
            </div>

            <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              Saving creates a four-eyes approval; the change only takes effect after a different
              user approves it.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={saving}
                className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                {saving ? "Submitting…" : "Submit change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
