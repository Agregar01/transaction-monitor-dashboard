"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/store";
import { useGetUsageQuery } from "@/redux/slices/api/usageApi";
import { useListCustomersQuery } from "@/redux/slices/api/customersApi";
import { useGetDecisionHistoryQuery } from "@/redux/slices/api/decisionsApi";
import { useListClientsQuery } from "@/redux/slices/api/clientsApi";
import { useListSignupRequestsQuery } from "@/redux/slices/api/signupRequestsApi";
import StatCard from "@/components/StatCard";
import UsageChart from "@/components/UsageChart";
import ActionBadge from "@/components/ActionBadge";
import { showToast } from "@/components/Toast";
import type { DecisionHistoryItem } from "@/types/api";
import TierBadge from "@/components/TierBadge";
import Link from "next/link";
import {
  UsersIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ClockIcon,
  BuildingOfficeIcon,
  InboxArrowDownIcon,
} from "@heroicons/react/24/outline";

function useDecisionToasts(decisions: DecisionHistoryItem[] | undefined) {
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!decisions?.length) return;
    if (!initializedRef.current) {
      // First load — populate seen set without toasting
      for (const d of decisions) seenRef.current.add(d.decision_id);
      initializedRef.current = true;
      return;
    }
    for (const d of decisions) {
      if (seenRef.current.has(d.decision_id)) continue;
      seenRef.current.add(d.decision_id);
      if (d.action === "BLOCK") {
        showToast({ type: "error", title: "Transaction Blocked", message: `${d.customer_external_id} — ${d.event_type}` });
      } else if (d.action === "REVIEW") {
        showToast({ type: "warning", title: "Review Required", message: `${d.customer_external_id} — ${d.event_type}` });
      } else if (d.action === "UPGRADE_REQUIRED") {
        showToast({ type: "info", title: "Upgrade Required", message: `${d.customer_external_id} needs tier upgrade` });
      }
    }
  }, [decisions]);
}

/* ── Admin Platform Overview ── */
function AdminOverview() {
  const { data: clients } = useListClientsQuery({ page_size: 100 });
  const { data: usage } = useGetUsageQuery({});
  const { data: signupsPending } = useListSignupRequestsQuery({ status: "pending" });
  const { data: signupsUnverified } = useListSignupRequestsQuery({ status: "pending_verification" });

  const activeClients = clients?.items.filter((c) => c.is_active && !c.is_admin).length ?? 0;
  const totalClients = clients?.items.filter((c) => !c.is_admin).length ?? 0;
  const pendingSignups = (signupsPending?.total ?? 0) + (signupsUnverified?.total ?? 0);
  const allPendingSignups = [
    ...(signupsUnverified?.items ?? []),
    ...(signupsPending?.items ?? []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Agregar Deferred KYC Engine — admin console</p>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Clients"
          value={activeClients}
          subtitle={`${totalClients} total registered`}
          icon={<BuildingOfficeIcon className="h-8 w-8" />}
          color="text-purple-600"
        />
        <StatCard
          title="Pending Signups"
          value={pendingSignups}
          subtitle="Awaiting review"
          icon={<InboxArrowDownIcon className="h-8 w-8" />}
          color="text-amber-500"
        />
        <StatCard
          title="Decisions (30d)"
          value={usage ? (usage.total_allow + usage.total_block + usage.total_review + usage.total_upgrade) : "..."}
          subtitle={usage ? `${usage.total_block} blocked` : undefined}
          icon={<ShieldCheckIcon className="h-8 w-8" />}
          color="text-green-600"
        />
        <StatCard
          title="API Calls (30d)"
          value={usage?.total_calls ?? "..."}
          icon={<ChartBarIcon className="h-8 w-8" />}
          color="text-blue-600"
        />
      </div>

      {/* Client List + Pending Signups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold dark:text-white">Clients</h2>
            <Link href="/dashboard/clients" className="text-sm text-primary hover:text-primary-600 font-medium">
              View all &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {clients?.items && clients.items.filter((c) => !c.is_admin).length > 0 ? (
              clients.items.filter((c) => !c.is_admin).slice(0, 6).map((c) => (
                <div key={c.client_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${c.is_active ? "bg-green-400" : "bg-gray-300"}`} />
                    <div>
                      <span className="text-gray-900 dark:text-white font-medium">{c.name}</span>
                      {c.contact_email && (
                        <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">{c.contact_email}</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.integration_mode === "full_platform"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>
                    {c.integration_mode === "full_platform" ? "Full Platform" : "API Only"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No clients yet</p>
            )}
          </div>
        </div>

        {/* Pending Signup Requests */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold dark:text-white">Pending Signups</h2>
            <Link href="/dashboard/signup-requests" className="text-sm text-primary hover:text-primary-600 font-medium">
              Review &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {allPendingSignups.length > 0 ? (
              allPendingSignups.slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div className="truncate mr-2">
                    <span className="text-gray-900 dark:text-white font-medium">{s.company_name}</span>
                    <span className="text-gray-400 ml-1 text-xs">{s.contact_name}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No pending signup requests</p>
            )}
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
        <h2 className="text-lg font-semibold dark:text-white mb-4">Platform Activity (30 days)</h2>
        {usage && usage.daily_breakdown.length > 0 ? (
          <UsageChart data={usage.daily_breakdown} />
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
            No activity data yet.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Client Dashboard Overview ── */
function ClientOverview({ clientId }: { clientId: string }) {
  const { data: usage } = useGetUsageQuery({ client_id: clientId });
  const { data: customers } = useListCustomersQuery({ client_id: clientId, page_size: 5 });
  const { data: decisions } = useGetDecisionHistoryQuery({ client_id: clientId, limit: 10 }, { pollingInterval: 60000 });
  useDecisionToasts(decisions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Overview of your Deferred KYC Engine activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Customers"
          value={customers?.total ?? "..."}
          icon={<UsersIcon className="h-8 w-8" />}
        />
        <StatCard
          title="API Calls (30d)"
          value={usage?.total_calls ?? "..."}
          icon={<ChartBarIcon className="h-8 w-8" />}
          color="text-blue-600"
        />
        <StatCard
          title="Decisions Allow"
          value={usage?.total_allow ?? "..."}
          subtitle={usage ? `${usage.total_block} blocked` : undefined}
          icon={<ShieldCheckIcon className="h-8 w-8" />}
          color="text-green-600"
        />
        <StatCard
          title="Upgrades Required"
          value={usage?.total_upgrade ?? "..."}
          subtitle={usage ? `${usage.total_review} reviews` : undefined}
          icon={<ClockIcon className="h-8 w-8" />}
          color="text-primary"
        />
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4">Decision Activity (30 days)</h2>
          {usage && usage.daily_breakdown.length > 0 ? (
            <UsageChart data={usage.daily_breakdown} />
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
              No usage data yet. Make API calls to see activity.
            </div>
          )}
        </div>

        {/* Recent Decisions */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4">Recent Decisions</h2>
          <div className="space-y-3">
            {decisions && decisions.length > 0 ? (
              decisions.slice(0, 8).map((d) => (
                <div key={d.decision_id} className="flex items-center justify-between text-sm">
                  <div className="truncate mr-2">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{d.customer_external_id}</span>
                    <span className="text-gray-400 ml-1 text-xs">{d.event_type}</span>
                  </div>
                  <ActionBadge action={d.action} />
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No decisions yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Customers */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
        <h2 className="text-lg font-semibold dark:text-white mb-4">Recent Customers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-navy-600 text-left text-gray-500 dark:text-gray-400">
                <th className="pb-3 font-medium">External ID</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Tier</th>
                <th className="pb-3 font-medium">Risk</th>
                <th className="pb-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {customers?.items.map((c) => (
                <tr key={c.id} className="border-b dark:border-navy-600 last:border-0 hover:bg-gray-50 dark:hover:bg-navy-600">
                  <td className="py-3 font-medium text-gray-900 dark:text-white">{c.external_id}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{c.entity_type}</td>
                  <td className="py-3"><TierBadge tier={c.current_tier} /></td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{c.risk_level}</td>
                  <td className="py-3 text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!customers?.items.length && (
            <p className="text-gray-400 text-sm text-center py-4">No customers registered yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  useEffect(() => { document.title = "Dashboard | Deferred KYC"; }, []);
  const { clientId, isAdmin, isRegulator, userRole } = useAppSelector((s) => s.auth);
  const router = useRouter();
  const cid = clientId || "";

  useEffect(() => {
    if (isRegulator) router.replace("/dashboard/regulator");
  }, [isRegulator, router]);

  // Supervisors have a dedicated Approval Dashboard — redirect them there
  useEffect(() => {
    if (!isAdmin && !isRegulator && userRole === "SUPERVISOR") {
      router.replace("/dashboard/supervisor");
    }
  }, [isAdmin, isRegulator, userRole, router]);

  // Operations team's primary dashboard is the Onboarding page
  useEffect(() => {
    if (!isAdmin && !isRegulator && userRole === "OPERATIONS") {
      router.replace("/dashboard/onboarding");
    }
  }, [isAdmin, isRegulator, userRole, router]);

  if (isRegulator) return null;
  if (!isAdmin && (userRole === "SUPERVISOR" || userRole === "OPERATIONS")) return null;
  return isAdmin ? <AdminOverview /> : <ClientOverview clientId={cid} />;
}
