"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/redux/store";
import { useListTiersQuery, useListWorkflowsQuery } from "@/redux/slices/api/policiesApi";
import TierBadge from "@/components/TierBadge";
import RoleGuard from "@/components/RoleGuard";

function formatLimit(v: number) {
  if (v < 0) return "Unlimited";
  return `GHS ${v.toLocaleString()}`;
}

export default function TiersPage() {
  useEffect(() => { document.title = "Tiers | Deferred KYC"; }, []);
  const { clientId: rawClientId, isAdmin } = useAppSelector((s) => s.auth);
  const clientId = rawClientId || "";
  const [entityFilter, setEntityFilter] = useState("");
  const { data: tiers, isLoading: tiersLoading } = useListTiersQuery({
    client_id: isAdmin ? undefined : clientId,
    entity_type: entityFilter || undefined,
  });
  const { data: workflows, isLoading: workflowsLoading } = useListWorkflowsQuery({
    client_id: isAdmin ? undefined : clientId,
    entity_type: entityFilter || undefined,
  });

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tier Configuration</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">KYC and KYB tier limits, requirements, and workflows</p>
      </div>

      {/* Tier Progression Diagrams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Individual (KYC) Progression</p>
          <div className="flex items-center justify-between">
            {(["T0", "T1", "T2", "T3"] as const).map((tier, i) => (
              <div key={tier} className="flex items-center flex-1">
                <div className="flex-1 flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                    tier === "T0" ? "border-gray-400 bg-gray-100 text-gray-700 dark:bg-navy-600 dark:text-gray-300 dark:border-gray-500" :
                    tier === "T1" ? "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                    tier === "T2" ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" :
                    "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  }`}>{tier}</div>
                  <p className="text-[10px] text-gray-400 mt-1 text-center">
                    {tier === "T0" ? "Instant" : tier === "T1" ? "Basic ID" : tier === "T2" ? "Full KYC" : "Enhanced"}
                  </p>
                </div>
                {i < 3 && <div className="text-gray-300 dark:text-gray-600 text-xl font-light pb-5">›</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Business (KYB) Progression</p>
          <div className="flex items-center justify-between">
            {(["B0", "B1", "B2", "B3"] as const).map((tier, i) => (
              <div key={tier} className="flex items-center flex-1">
                <div className="flex-1 flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                    tier === "B0" ? "border-gray-400 bg-gray-100 text-gray-700 dark:bg-navy-600 dark:text-gray-300 dark:border-gray-500" :
                    tier === "B1" ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
                    tier === "B2" ? "border-teal-400 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" :
                    "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
                  }`}>{tier}</div>
                  <p className="text-[10px] text-gray-400 mt-1 text-center">
                    {tier === "B0" ? "Instant" : tier === "B1" ? "Reg. Check" : tier === "B2" ? "Full KYB" : "Enhanced"}
                  </p>
                </div>
                {i < 3 && <div className="text-gray-300 dark:text-gray-600 text-xl font-light pb-5">›</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Types</option>
          <option value="INDIVIDUAL">Individual (KYC)</option>
          <option value="BUSINESS">Business (KYB)</option>
        </select>
      </div>

      {/* Tier Cards */}
      {tiersLoading ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-8 text-center text-gray-400">Loading...</div>
      ) : tiers && tiers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier) => (
            <div key={tier.tier} className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <TierBadge tier={tier.tier} />
                <span className="text-xs text-gray-400">{tier.entity_type}</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Daily Limit</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatLimit(tier.daily_limit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Monthly Limit</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatLimit(tier.monthly_limit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Per Transaction</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatLimit(tier.per_transaction_limit)}</span>
                </div>
              </div>

              {tier.allowed_activities && tier.allowed_activities.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Allowed Activities</p>
                  <div className="flex flex-wrap gap-1">
                    {tier.allowed_activities.map((a) => (
                      <span key={a} className="px-2 py-0.5 bg-gray-100 dark:bg-navy-600 text-gray-600 dark:text-gray-300 rounded text-xs">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {tier.requirements && tier.requirements.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Requirements</p>
                  <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                    {tier.requirements.map((r, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-primary mt-0.5">&#8226;</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-8 text-center text-gray-400">No tier configurations found</div>
      )}

      {/* Workflows */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upgrade Workflows</h2>
        {workflowsLoading ? (
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-8 text-center text-gray-400">Loading...</div>
        ) : workflows && workflows.length > 0 ? (
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-600">
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th scope="col" className="px-6 py-3 font-medium">Workflow</th>
                  <th scope="col" className="px-6 py-3 font-medium">Name</th>
                  <th scope="col" className="px-6 py-3 font-medium">Entity</th>
                  <th scope="col" className="px-6 py-3 font-medium">Upgrade Path</th>
                  <th scope="col" className="px-6 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((w) => (
                  <tr key={w.workflow} className="border-t dark:border-navy-600 hover:bg-gray-50 dark:hover:bg-navy-600">
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-primary">{w.workflow}</td>
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{w.name}</td>
                    <td className="px-6 py-3 text-xs text-gray-600 dark:text-gray-400">{w.entity_type}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <TierBadge tier={w.from_tier} />
                        <span className="text-gray-400">&rarr;</span>
                        <TierBadge tier={w.to_tier} />
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">{w.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-8 text-center text-gray-400">No workflows found</div>
        )}
      </div>
    </div>
    </RoleGuard>
  );
}
