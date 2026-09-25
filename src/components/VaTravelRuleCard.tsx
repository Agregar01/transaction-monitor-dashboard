"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { useSetVaTravelRuleMutation, type Institution } from "@/redux/slices/api/institutionsApi";

const INPUT =
  "w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white";

type Mode = "SHADOW" | "ENFORCE";

const MODES: { value: Mode; label: string; blurb: string }[] = [
  {
    value: "SHADOW",
    label: "Shadow",
    blurb:
      "Travel Rule verdicts are computed, recorded and queued for review, but never hold or block a transaction and add no rule risk. Use this to trial the checks.",
  },
  {
    value: "ENFORCE",
    label: "Enforce",
    blurb:
      "Travel Rule dispositions hold or block virtual asset transfers, R-VA rules add risk and raise alerts, and breaches raise P1 alerts.",
  },
];

/** Institution Policy card: virtual asset Travel Rule mode and the institution's own VASP identity. */
export default function VaTravelRuleCard({ institution, canManage }: { institution: Institution; canManage: boolean }) {
  const [setVa, { isLoading }] = useSetVaTravelRuleMutation();
  const [applied, setApplied] = useState<Mode | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [lei, setLei] = useState(institution.vasp_lei ?? "");
  const [reg, setReg] = useState(institution.vasp_registration_number ?? "");
  const current: Mode = applied ?? institution.va_travel_rule_mode ?? "SHADOW";

  const saveMode = async (mode: Mode) => {
    try {
      const out = await setVa({ id: institution.id, va_travel_rule_mode: mode }).unwrap();
      setApplied(out.va_travel_rule_mode);
      showToast({ type: "success", title: "Travel Rule mode updated", message: `Virtual asset Travel Rule is now in ${mode.toLowerCase()} mode.` });
    } catch (e) {
      showToast({ type: "error", title: "Update failed", message: errorMessage(e) });
    }
  };

  const saveIdentity = async () => {
    try {
      await setVa({ id: institution.id, vasp_lei: lei.trim() || null, vasp_registration_number: reg.trim() || null }).unwrap();
      showToast({ type: "success", title: "VASP identity saved", message: "Used as this institution's identity in Travel Rule data." });
    } catch (e) {
      showToast({ type: "error", title: "Save failed", message: errorMessage(e) });
    }
  };

  const choose = (mode: Mode) => {
    if (mode === current) return;
    if (mode === "ENFORCE") setConfirm(true);
    else saveMode(mode);
  };

  return (
    <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Virtual asset Travel Rule
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          How FATF Travel Rule verdicts on virtual asset transfers (channel VirtualAsset) affect decisions. Every change is
          written to the audit trail.
        </p>
      </div>
      <div className="space-y-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => choose(m.value)}
            disabled={!canManage || isLoading}
            className={`w-full text-left rounded-lg border p-4 transition-colors ${
              m.value === current
                ? "border-primary bg-primary/5 dark:bg-primary/10"
                : "border-gray-200 dark:border-navy-500 hover:bg-gray-50 dark:hover:bg-navy-600"
            } ${!canManage ? "cursor-not-allowed opacity-70" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{m.label}</span>
              {m.value === current && <span className="text-xs font-medium text-primary">Current</span>}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.blurb}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Institution LEI
          <input className={INPUT} value={lei} onChange={(e) => setLei(e.target.value)} disabled={!canManage} placeholder="20-character LEI" />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          VASP registration or licence number
          <input className={INPUT} value={reg} onChange={(e) => setReg(e.target.value)} disabled={!canManage} />
        </label>
      </div>
      {canManage && (
        <button
          onClick={saveIdentity}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium border border-gray-200 dark:border-navy-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 disabled:opacity-50"
        >
          Save VASP identity
        </button>
      )}

      <ConfirmDialog
        open={confirm}
        title="Enforce the Travel Rule?"
        message="Virtual asset transfers with missing Travel Rule data, sanctioned wallets or unassessed counterparties will be held or blocked, and breaches will raise P1 alerts. Review the exception queue in shadow mode first."
        confirmLabel="Enforce"
        variant="warning"
        onConfirm={() => {
          setConfirm(false);
          saveMode("ENFORCE");
        }}
        onCancel={() => setConfirm(false)}
      />
    </section>
  );
}
