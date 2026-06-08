"use client";

import { useState } from "react";
import {
  useScreenNameMutation,
  useGetSanctionsStatusQuery,
} from "@/redux/slices/api/sanctionsApi";
import ActionBadge from "@/components/ActionBadge";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { ScreenNameResult } from "@/types/api";

export default function SanctionsScreeningPage() {
  const { data: status } = useGetSanctionsStatusQuery();
  const [screen, { isLoading }] = useScreenNameMutation();

  const [name, setName] = useState("");
  const [nationality, setNationality] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [result, setResult] = useState<ScreenNameResult | null>(null);

  const onScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await screen({
        name: name.trim(),
        nationality: nationality.trim() || undefined,
        id_number: idNumber.trim() || undefined,
      }).unwrap();
      setResult(res);
    } catch (err) {
      showToast({ type: "error", title: "Screening failed", message: errorMessage(err) });
    }
  };

  const recommendationColor: Record<ScreenNameResult["recommendation"], string> = {
    CLEAR: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
    REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    MATCH: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Sanctions screening</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Screen a name against OFAC SDN, EU, UN, and PEP lists. Returns CLEAR / REVIEW / MATCH.
        </p>
      </div>

      {status && (
        <div
          className={`rounded-xl border px-4 py-2 text-sm ${
            status.loaded
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
              : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
          }`}
        >
          {status.loaded ? "✓" : "⚠"} {status.loaded_lists.length} lists loaded ·{" "}
          {status.total_name_entries.toLocaleString()} entries
        </div>
      )}

      <form
        onSubmit={onScreen}
        className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4 max-w-2xl"
      >
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Name
          </label>
          <input
            required
            aria-label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Doe"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Nationality (optional)
            </label>
            <input
              aria-label="Nationality (optional)"
              value={nationality}
              onChange={(e) => setNationality(e.target.value.toUpperCase())}
              maxLength={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              ID number (optional)
            </label>
            <input
              aria-label="ID number (optional)"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
        >
          {isLoading ? "Screening…" : "Screen"}
        </button>
      </form>

      {result && (
        <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Recommendation
              </p>
              <p
                className={`mt-1 inline-block px-3 py-1 rounded-full text-base font-semibold ${recommendationColor[result.recommendation]}`}
              >
                {result.recommendation}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              top score {result.highest_score.toFixed(1)} · {result.total_names_checked} names
              checked · {result.screening_duration_ms.toFixed(0)}ms
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Candidates
            </p>
            {result.candidates.length === 0 ? (
              <p className="text-sm text-gray-400">No list hits.</p>
            ) : (
              <ul className="space-y-2">
                {result.candidates.map((m, i) => (
                  <li
                    key={`${m.list_name}-${m.entry_value}-${i}`}
                    className="rounded-lg border border-gray-100 dark:border-navy-600 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {m.matched_name}
                      </span>
                      <ActionBadge action={m.list_name} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      score {m.score.toFixed(1)} · {m.match_type} · {m.list_type}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
