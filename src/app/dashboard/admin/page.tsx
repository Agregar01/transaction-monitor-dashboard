"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useListRulesQuery,
  useUpdateRuleMutation,
  useEnableRuleMutation,
  useDisableRuleMutation,
} from "@/redux/slices/api/rulesApi";
import { useListJurisdictionsQuery } from "@/redux/slices/api/jurisdictionsApi";
import { useGetAnalyticsSummaryQuery } from "@/redux/slices/api/analyticsApi";
import { SkeletonTable } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { Rule } from "@/types/api";
import { useAppSelector } from "@/redux/store";
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ChartBarIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

type AdminTab = "rules" | "jurisdictions" | "system";

const CATEGORY_COLORS: Record<string, string> = {
  AMOUNT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  VELOCITY: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  BEHAVIORAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  NETWORK: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  AFRICA: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  DEVICE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  COMPLIANCE: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

function RuleRow({ rule }: { rule: Rule }) {
  const [editingContrib, setEditingContrib] = useState(false);
  const [contrib, setContrib] = useState(String(rule.risk_contribution));
  const [updateRule, { isLoading: updating }] = useUpdateRuleMutation();
  const [enableRule, { isLoading: enabling }] = useEnableRuleMutation();
  const [disableRule, { isLoading: disabling }] = useDisableRuleMutation();

  const toggleEnabled = async () => {
    try {
      if (rule.enabled) {
        await disableRule({ rule_id: rule.rule_id }).unwrap();
        showToast({ type: "info", title: "Disabled", message: rule.rule_id });
      } else {
        await enableRule({ rule_id: rule.rule_id }).unwrap();
        showToast({ type: "success", title: "Enabled", message: rule.rule_id });
      }
    } catch (e) {
      showToast({ type: "error", title: "Toggle failed", message: errorMessage(e) });
    }
  };

  const saveContrib = async () => {
    const val = parseInt(contrib, 10);
    if (isNaN(val) || val < 0 || val > 200) {
      showToast({ type: "error", title: "Invalid", message: "Risk contribution: 0–200" });
      return;
    }
    try {
      await updateRule({ rule_id: rule.rule_id, risk_contribution: val }).unwrap();
      showToast({ type: "success", title: "Updated", message: `${rule.rule_id} contribution → ${val}` });
      setEditingContrib(false);
    } catch (e) {
      showToast({ type: "error", title: "Update failed", message: errorMessage(e) });
    }
  };

  const catCls = CATEGORY_COLORS[rule.rule_category] ?? CATEGORY_COLORS.COMPLIANCE;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
      <td className="px-4 py-3">
        <button
          onClick={toggleEnabled}
          disabled={enabling || disabling}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
            rule.enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-navy-500"
          }`}
          aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${
              rule.enabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-primary">{rule.rule_id}</td>
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[200px] truncate">
        {rule.rule_name}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${catCls}`}>
          {rule.rule_category}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{rule.severity}</td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{rule.status}</td>
      <td className="px-4 py-3">
        {editingContrib ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              aria-label="Risk contribution"
              value={contrib}
              onChange={(e) => setContrib(e.target.value)}
              min={0}
              max={200}
              className="w-16 px-2 py-1 text-xs font-mono border border-gray-200 dark:border-navy-500 rounded bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
            />
            <button
              onClick={saveContrib}
              disabled={updating}
              className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => { setEditingContrib(false); setContrib(String(rule.risk_contribution)); }}
              className="text-xs text-gray-400 hover:underline"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingContrib(true)}
            className="font-mono text-xs text-gray-900 dark:text-white hover:text-primary transition-colors"
            title="Click to edit"
          >
            {rule.risk_contribution}
          </button>
        )}
      </td>
    </tr>
  );
}

function PermissionDenied({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <LockClosedIcon className="h-8 w-8 text-gray-300 dark:text-navy-500" />
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        You don&apos;t have permission to view {section}.
      </p>
      <p className="text-xs text-gray-400 dark:text-navy-400">
        Contact your system administrator to request access.
      </p>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("rules");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { permissions } = useAppSelector((s) => s.auth);
  const canManageRules = permissions.includes("create_rule") || permissions.includes("modify_rule") || permissions.includes("view_rules");
  const canManageJurisdictions = permissions.includes("configure_thresholds");
  const canViewAnalytics = permissions.includes("view_analytics");

  const { data: rules, isLoading: rulesLoading, isError: rulesError } = useListRulesQuery({}, { skip: !canManageRules });
  const { data: jurisdictions, isLoading: juriLoading, isError: juriError } = useListJurisdictionsQuery(undefined, { skip: !canManageJurisdictions });
  const { data: analytics } = useGetAnalyticsSummaryQuery({ period_days: 90 }, { skip: !canViewAnalytics });

  const filteredRules = (rules ?? []).filter((r) => {
    if (categoryFilter !== "ALL" && r.rule_category !== categoryFilter) return false;
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    return true;
  });

  const categories = ["ALL", ...Array.from(new Set((rules ?? []).map((r) => r.rule_category))).sort()];
  const statuses = ["ALL", "DRAFT", "SHADOW", "PRODUCTION", "ARCHIVED"];

  const tabs: { key: AdminTab; label: string; icon: React.ElementType }[] = [
    { key: "rules", label: "Rule Config", icon: Cog6ToothIcon },
    { key: "jurisdictions", label: "Jurisdiction SLA", icon: GlobeAltIcon },
    { key: "system", label: "System", icon: ShieldCheckIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Config</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Rule thresholds, jurisdiction SLA settings, and system overview
          </p>
        </div>
        <Link
          href="/dashboard/reports"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-navy-700 border border-gray-200 dark:border-navy-600 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600"
        >
          <ChartBarIcon className="h-4 w-4" />
          Reports
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-navy-600" role="tablist">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Rule Config tab ─────────────────────────────────────────────────── */}
      {tab === "rules" && (!canManageRules || rulesError ? (
        <PermissionDenied section="rule configuration" />
      ) : (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c === "ALL" ? "All categories" : c}</option>
              ))}
            </select>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s === "ALL" ? "All statuses" : s}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400">{filteredRules.length} rules</span>
            <Link
              href="/dashboard/rules/new"
              className="ml-auto px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-600"
            >
              + New rule
            </Link>
          </div>

          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
            {rulesLoading ? (
              <SkeletonTable rows={8} cols={7} />
            ) : filteredRules.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">No rules match filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3 text-left w-12">On</th>
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Severity</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Risk contrib</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                    {filteredRules.map((r) => (
                      <RuleRow key={r.rule_id} rule={r} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Toggle enables/disables a rule immediately. Risk contribution (0–200) is the score added to a
            transaction when this rule fires. Changes to logic or category require four-eyes approval via
            the{" "}
            <Link href="/dashboard/rules" className="text-primary hover:underline">
              Rule builder
            </Link>
            .
          </p>
        </div>
      ))}

      {/* ── Jurisdiction SLA tab ─────────────────────────────────────────────── */}
      {tab === "jurisdictions" && (!canManageJurisdictions || juriError ? (
        <PermissionDenied section="jurisdiction settings" />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Regulatory thresholds and STR deadlines per jurisdiction. Edits require four-eyes approval.
            Full edit form at{" "}
            <Link href="/dashboard/jurisdictions" className="text-primary hover:underline">
              Jurisdictions
            </Link>
            .
          </p>
          {juriLoading ? (
            <SkeletonTable rows={4} cols={5} />
          ) : !jurisdictions || jurisdictions.length === 0 ? (
            <p className="text-sm text-gray-400">No jurisdictions configured.</p>
          ) : (
            <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-right">CTR cash</th>
                    <th className="px-4 py-3 text-right">CTR non-cash</th>
                    <th className="px-4 py-3 text-right">STR min</th>
                    <th className="px-4 py-3 text-right">SLA (hours)</th>
                    <th className="px-4 py-3 text-left">Currency</th>
                    <th className="px-4 py-3 text-left">Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {jurisdictions.map((j) => (
                    <tr key={j.code} className="hover:bg-gray-50 dark:hover:bg-navy-800">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{j.code}</td>
                      <td className="px-4 py-3 text-sm">{j.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {Number(j.ctr_threshold_cash).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {Number(j.ctr_threshold_non_cash).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {Number(j.str_min_amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{j.str_deadline_hours}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{j.currency_code}</td>
                      <td className="px-4 py-3">
                        {j.is_active ? (
                          <span className="text-emerald-500 text-xs">● Active</span>
                        ) : (
                          <span className="text-gray-400 text-xs">○ Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href="/dashboard/jurisdictions"
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* ── System tab ────────────────────────────────────────────────────────── */}
      {tab === "system" && (
        <div className="space-y-6">
          {/* Quick links */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Rules", count: (rules ?? []).length, href: "/dashboard/rules", color: "text-blue-600" },
              { label: "PRODUCTION rules", count: (rules ?? []).filter(r => r.status === "PRODUCTION").length, href: "/dashboard/rules", color: "text-emerald-600" },
              { label: "Jurisdictions", count: (jurisdictions ?? []).length, href: "/dashboard/jurisdictions", color: "text-purple-600" },
              { label: "Alerts (90d)", count: analytics?.overall_stats?.alerts_total ?? 0, href: "/dashboard/alerts", color: "text-amber-600" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-4 hover:shadow-md transition-shadow"
              >
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {item.label}
                </p>
                <p className={`text-2xl font-semibold mt-1 ${item.color}`}>{item.count.toLocaleString()}</p>
              </Link>
            ))}
          </div>

          {/* Config pointers */}
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
              Configuration sections
            </h2>
            <ul className="space-y-3 text-sm">
              {[
                { label: "Rule builder", desc: "Create and promote detection rules", href: "/dashboard/rules" },
                { label: "Jurisdiction thresholds", desc: "CTR/STR amounts and SLA deadlines", href: "/dashboard/jurisdictions" },
                { label: "Sanctions & watchlists", desc: "PEP lists and sanctions screening", href: "/dashboard/watchlists" },
                { label: "Approvals queue", desc: "Four-eyes pending approvals", href: "/dashboard/approvals" },
                { label: "Audit trail", desc: "Tamper-proof change log with hash chain", href: "/dashboard/audit" },
                { label: "Reports", desc: "Alert trends, risk distribution, STR/CTR summaries", href: "/dashboard/reports" },
                { label: "Shadow comparison", desc: "EzRules shadow deployment statistics", href: "/dashboard/shadow" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    <span className="text-gray-400 text-sm">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
