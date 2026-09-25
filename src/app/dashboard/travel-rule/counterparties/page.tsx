"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ActionBadge from "@/components/ActionBadge";
import QueryState from "@/components/QueryState";
import TravelRuleTabs from "@/components/TravelRuleTabs";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { useAppSelector } from "@/redux/store";
import { useCreateCounterpartyMutation, useListCounterpartiesQuery } from "@/redux/slices/api/travelRuleApi";

const TH = "px-4 py-3 text-left font-semibold";
const TD = "px-4 py-3 text-sm";
const INPUT =
  "w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white";

function CreateForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ legal_name: "", lei: "", registration_number: "", country: "", licence_status: "UNKNOWN" });
  const [create, { isLoading }] = useCreateCounterpartyMutation();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    try {
      await create({
        legal_name: form.legal_name.trim(),
        lei: form.lei.trim() || null,
        registration_number: form.registration_number.trim() || null,
        country: form.country.trim() || null,
        licence_status: form.licence_status,
      }).unwrap();
      showToast({ type: "success", title: "Counterparty added", message: "Start a due diligence review to approve it." });
      onDone();
    } catch (e) {
      showToast({ type: "error", title: "Could not add", message: errorMessage(e) });
    }
  };

  return (
    <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Add counterparty VASP</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className={INPUT} placeholder="Legal name" value={form.legal_name} onChange={set("legal_name")} />
        <input className={INPUT} placeholder="LEI (20 characters, optional)" value={form.lei} onChange={set("lei")} />
        <input className={INPUT} placeholder="Registration number (optional)" value={form.registration_number} onChange={set("registration_number")} />
        <input className={INPUT} placeholder="Country (ISO-2, e.g. ZA)" value={form.country} maxLength={2} onChange={set("country")} />
        <select className={INPUT} value={form.licence_status} onChange={set("licence_status")} aria-label="Licence status">
          {["UNKNOWN", "LICENSED", "REGISTERED", "EXEMPT", "UNLICENSED"].map((s) => (
            <option key={s} value={s}>{s.toLowerCase()}</option>
          ))}
        </select>
      </div>
      <button
        onClick={submit}
        disabled={!form.legal_name.trim() || isLoading}
        className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
      >
        {isLoading ? "Saving..." : "Add"}
      </button>
    </section>
  );
}

export default function CounterpartiesPage() {
  useEffect(() => {
    document.title = "Counterparty VASPs | Transaction Monitor";
  }, []);
  const permissions = useAppSelector((s) => s.auth.permissions);
  const institutionId = useAppSelector((s) => s.auth.institutionId);
  const canManage = permissions.includes("manage_counterparty_vasps") && !!institutionId;
  const [ddStatus, setDdStatus] = useState("");
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, error } = useListCounterpartiesQuery({
    dd_status: ddStatus || undefined,
    q: q.trim() || undefined,
  });
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <TravelRuleTabs subtitle="Counterparty VASP register and due diligence. Each institution assesses its counterparties independently (FATF)." />

      <div className="flex flex-wrap items-end gap-3">
        <input
          className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          placeholder="Search by name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Due diligence status"
          value={ddStatus}
          onChange={(e) => setDdStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        >
          <option value="">All due diligence statuses</option>
          {["NOT_STARTED", "IN_REVIEW", "APPROVED", "RESTRICTED", "REJECTED", "EXPIRED"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>
          ))}
        </select>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="ml-auto px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600"
          >
            {showForm ? "Close" : "Add counterparty"}
          </button>
        )}
      </div>

      {showForm && <CreateForm onDone={() => setShowForm(false)} />}

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No counterparty VASPs yet. Unknown VASPs seen in transfers are added automatically as stubs awaiting due diligence."
      >
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className={TH}>VASP</th>
                <th className={TH}>Country</th>
                <th className={TH}>Licence</th>
                <th className={TH}>Due diligence</th>
                <th className={TH}>Risk</th>
                <th className={TH}>Next review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {rows.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-navy-600/50">
                  <td className={TD}>
                    <Link href={`/dashboard/travel-rule/counterparties/${v.id}`} className="text-primary hover:underline">
                      {v.legal_name}
                    </Link>
                    {v.auto_created && <span className="ml-2 text-xs text-amber-600 dark:text-amber-300">auto-created</span>}
                    {v.lei && <p className="font-mono text-xs text-gray-400">{v.lei}</p>}
                  </td>
                  <td className={TD}>{v.country ?? "n/a"}</td>
                  <td className={`${TD} text-gray-600 dark:text-gray-300`}>{v.licence_status.toLowerCase()}</td>
                  <td className={TD}><ActionBadge action={v.dd_status} /></td>
                  <td className={TD}>{v.risk_rating ? <ActionBadge action={v.risk_rating} /> : "n/a"}</td>
                  <td className={`${TD} text-gray-600 dark:text-gray-300`}>
                    {v.dd_next_review_at ? new Date(v.dd_next_review_at).toLocaleDateString() : "n/a"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
