"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAppSelector } from "@/redux/store";
import { useListCustomersQuery, useRegisterCustomerMutation } from "@/redux/slices/api/customersApi";
import { useUploadDocumentMutation } from "@/redux/slices/api/documentsApi";
import { useGetDecisionStatisticsQuery } from "@/redux/slices/api/decisionsApi";
import StatCard from "@/components/StatCard";
import RiskBadge from "@/components/RiskBadge";
import TierBadge from "@/components/TierBadge";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import RoleGuard from "@/components/RoleGuard";
import type { EntityType, CustomerListItem } from "@/types/api";
import {
  UserPlusIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  MapPinIcon,
  BuildingLibraryIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getVerificationStatus(tier: string): { label: string; step: number; colorClass: string } {
  if (tier === "T0" || tier === "B0")
    return { label: "Pending", step: 0, colorClass: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" };
  if (tier === "T1" || tier === "B1")
    return { label: "In Progress", step: 1, colorClass: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" };
  if (tier === "T2" || tier === "B2")
    return { label: "In Progress", step: 2, colorClass: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" };
  if (tier === "T3" || tier === "B3")
    return { label: "Completed", step: 4, colorClass: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" };
  return { label: "Unknown", step: 0, colorClass: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" };
}

function getCheckStatuses(step: number, entityType: EntityType, createdAt: string) {
  const isBusiness = entityType === "BUSINESS";
  const base = new Date(createdAt).getTime();
  const fmt = (ms: number) => new Date(ms).toLocaleString();

  return [
    {
      id: "identity",
      label: "Identity Verification",
      provider: "Ghana Card API",
      status: step >= 1 ? "pass" : "pending",
      timestamp: step >= 1 ? fmt(base + 30 * 60_000) : null,
      confidence: step >= 1 ? 96 : null,
    },
    {
      id: "aml",
      label: "AML / Sanctions Screening",
      provider: "XDS Data / Internal",
      status: step >= 2 ? "pass" : step >= 1 ? "in_progress" : "pending",
      timestamp: step >= 2 ? fmt(base + 60 * 60_000) : step >= 1 ? fmt(base + 45 * 60_000) : null,
      confidence: step >= 2 ? 92 : null,
    },
    {
      id: "address",
      label: "Address Verification",
      provider: "Rules Engine",
      status: step >= 3 ? "pass" : step >= 2 ? "in_progress" : "pending",
      timestamp: step >= 3 ? fmt(base + 90 * 60_000) : step >= 2 ? fmt(base + 75 * 60_000) : null,
      confidence: step >= 3 ? 88 : null,
    },
    {
      id: "document",
      label: "Document Validation",
      provider: "Document OCR",
      status: step >= 3 ? "pass" : step >= 1 ? "in_progress" : "pending",
      timestamp: step >= 3 ? fmt(base + 2 * 3600_000) : step >= 1 ? fmt(base + 60 * 60_000) : null,
      confidence: step >= 3 ? 91 : null,
    },
    {
      id: "registry",
      label: isBusiness ? "Business Registry Check" : "Credit Check",
      provider: isBusiness ? "CAC / GRS" : "XDS Credit Bureau",
      status: step >= 4 ? "pass" : step >= 3 ? "in_progress" : "pending",
      timestamp: step >= 4 ? fmt(base + 3 * 3600_000) : step >= 3 ? fmt(base + 2.5 * 3600_000) : null,
      confidence: step >= 4 ? 94 : null,
    },
  ];
}

const CHECK_ICONS = {
  identity: UserGroupIcon,
  aml: ShieldCheckIcon,
  address: MapPinIcon,
  document: DocumentCheckIcon,
  registry: BuildingLibraryIcon,
} as const;

const CHECK_STATUS_STYLES = {
  pass: { label: "Pass", dot: "bg-green-500", text: "text-green-600 dark:text-green-400" },
  in_progress: { label: "In Progress", dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
  pending: { label: "Pending", dot: "bg-gray-300 dark:bg-gray-600", text: "text-gray-500 dark:text-gray-400" },
};

function exportCSV(items: CustomerListItem[]) {
  const headers = ["Case ID", "Customer Name", "Account Type", "Tier", "Verification Status", "Risk Level", "Risk Score", "Date"];
  const rows = items.map((c) => {
    const vs = getVerificationStatus(c.current_tier);
    return [
      c.external_id,
      c.name || "—",
      c.entity_type,
      c.current_tier,
      vs.label,
      c.risk_level,
      c.risk_score.toFixed(1),
      new Date(c.created_at).toLocaleDateString(),
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `onboarding-cases-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { clientId } = useAppSelector((s) => s.auth);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState<string>("ALL");
  const [showNewCase, setShowNewCase] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
    }
  };

  const bulkExport = () => {
    const selected = filteredCustomers.filter((c) => selectedIds.has(c.id));
    exportCSV(selected);
  };

  useEffect(() => {
    document.title = "Operations / Onboarding | Deferred KYC";
  }, []);

  const { data: customers, isLoading: customersLoading, refetch } = useListCustomersQuery(
    {
      client_id: clientId || undefined,
      page: 1,
      page_size: 100,
      entity_type: entityFilter !== "ALL" ? (entityFilter as EntityType) : undefined,
      search: search || undefined,
    },
    { skip: !clientId }
  );

  const { data: stats, isLoading: statsLoading } = useGetDecisionStatisticsQuery(
    { client_id: clientId!, period: "30d" },
    { skip: !clientId }
  );

  const counts = useMemo(() => {
    const items = customers?.items || [];
    return {
      total: customers?.total || 0,
      pending: items.filter((c) => c.current_tier === "T0" || c.current_tier === "B0").length,
      inProgress: items.filter((c) => ["T1", "T2", "B1", "B2"].includes(c.current_tier)).length,
      completed: items.filter((c) => c.current_tier === "T3" || c.current_tier === "B3").length,
    };
  }, [customers]);

  const failedCount =
    (stats?.decisions_by_action?.BLOCK || 0) + (stats?.decisions_by_action?.FREEZE || 0);

  const filteredCustomers = useMemo(() => {
    return (customers?.items || []).filter((c) => {
      if (statusFilter !== "ALL") {
        const vs = getVerificationStatus(c.current_tier);
        if (statusFilter === "PENDING" && vs.label !== "Pending") return false;
        if (statusFilter === "IN_PROGRESS" && vs.label !== "In Progress") return false;
        if (statusFilter === "COMPLETED" && vs.label !== "Completed") return false;
      }
      return true;
    });
  }, [customers, statusFilter]);

  const checkStatuses = selectedCustomer
    ? getCheckStatuses(
        getVerificationStatus(selectedCustomer.current_tier).step,
        selectedCustomer.entity_type,
        selectedCustomer.created_at
      )
    : null;

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN", "OPERATIONS", "COMPLIANCE"]}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operations / Onboarding</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage customer onboarding, initiate verifications, and track case progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-navy-700 border border-gray-200 dark:border-navy-600 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
            <button
              onClick={() => { setShowNewCase(true); setSelectedCustomer(null); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
              New Onboarding
            </button>
          </div>
        </div>

        {/* 1. Summary Metrics Panel */}
        {statsLoading || customersLoading ? (
          <SkeletonStats count={5} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              title="Total Requests"
              value={counts.total}
              subtitle="All onboarding cases"
              icon={<UserGroupIcon className="h-8 w-8" aria-hidden="true" />}
              color="text-primary"
            />
            <StatCard
              title="Pending Verification"
              value={counts.pending}
              subtitle="Awaiting checks (T0/B0)"
              icon={<ClockIcon className="h-8 w-8" aria-hidden="true" />}
              color="text-amber-500"
            />
            <StatCard
              title="In Progress"
              value={counts.inProgress}
              subtitle="Verification underway"
              icon={<ArrowPathIcon className="h-8 w-8" aria-hidden="true" />}
              color="text-blue-500"
            />
            <StatCard
              title="Completed"
              value={counts.completed}
              subtitle="Fully verified (T3/B3)"
              icon={<CheckCircleIcon className="h-8 w-8" aria-hidden="true" />}
              color="text-green-500"
            />
            <StatCard
              title="Failed / Blocked"
              value={failedCount}
              subtitle="Blocked or frozen decisions"
              icon={<XCircleIcon className="h-8 w-8" aria-hidden="true" />}
              color="text-red-500"
            />
          </div>
        )}

        {/* New Case Form */}
        {showNewCase && (
          <NewCaseForm
            clientId={clientId!}
            onComplete={() => { setShowNewCase(false); refetch(); }}
            onCancel={() => setShowNewCase(false)}
          />
        )}

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-lg">
            <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <button
                onClick={bulkExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-navy-700 border border-gray-200 dark:border-navy-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
              >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Export Selected
              </button>
              <button
                onClick={() => showToast({ type: "info", title: "Bulk Assign", message: "Select an officer to assign cases to — feature requires backend support." })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-navy-700 border border-gray-200 dark:border-navy-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
              >
                <UserGroupIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Assign Officer
              </button>
              <button
                onClick={() => showToast({ type: "warning", title: "Bulk Escalate", message: "Escalating selected cases requires backend support." })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <ExclamationTriangleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Escalate
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1.5"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* 2. Onboarding Case Table */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-3 border-b border-gray-200 dark:border-navy-600 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Case Management ({filteredCustomers.length})
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search by ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent w-44"
                />
              </div>
              <FunnelIcon className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="text-xs border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white px-2 py-1.5"
              >
                <option value="ALL">All Types</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="BUSINESS">Business</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white px-2 py-1.5"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <button
                onClick={() => filteredCustomers.length > 0 && exportCSV(filteredCustomers)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-600 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
              >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Export CSV
              </button>
            </div>
          </div>

          {customersLoading ? (
            <SkeletonTable rows={8} cols={7} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 dark:border-navy-500 text-primary focus:ring-primary"
                      />
                    </th>
                    <th className="px-4 py-2.5 font-medium">Case ID</th>
                    <th className="px-4 py-2.5 font-medium">Customer Name</th>
                    <th className="px-4 py-2.5 font-medium">Account Type</th>
                    <th className="px-4 py-2.5 font-medium">Submission Date</th>
                    <th className="px-4 py-2.5 font-medium">Verification Status</th>
                    <th className="px-4 py-2.5 font-medium">Risk Level</th>
                    <th className="px-4 py-2.5 font-medium">Assigned Officer</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                        No onboarding cases found.
                      </td>
                    </tr>
                  )}
                  {filteredCustomers.map((customer) => {
                    const vs = getVerificationStatus(customer.current_tier);
                    const isSelected = selectedCustomer?.id === customer.id;
                    const isChecked = selectedIds.has(customer.id);
                    return (
                      <tr
                        key={customer.id}
                        onClick={() => setSelectedCustomer(isSelected ? null : customer)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/5 dark:bg-primary/10 border-l-2 border-primary"
                            : "hover:bg-gray-50 dark:hover:bg-navy-600"
                        }`}
                      >
                        <td className="px-4 py-2.5 w-10" onClick={(e) => { e.stopPropagation(); toggleSelect(customer.id); }}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${customer.external_id}`}
                            checked={isChecked}
                            onChange={() => toggleSelect(customer.id)}
                            className="rounded border-gray-300 dark:border-navy-500 text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-primary font-mono text-xs">{customer.external_id}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 text-xs">
                          {customer.name || <span className="text-gray-400 dark:text-gray-500">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded ${
                              customer.entity_type === "INDIVIDUAL"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                            }`}
                          >
                            {customer.entity_type === "INDIVIDUAL" ? (
                              <UserGroupIcon className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <BuildingOfficeIcon className="h-3 w-3" aria-hidden="true" />
                            )}
                            {customer.entity_type === "INDIVIDUAL" ? "Individual" : "Business"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${vs.colorClass}`}>
                            {vs.label === "Pending" && <ClockIcon className="h-3 w-3" aria-hidden="true" />}
                            {vs.label === "In Progress" && <ArrowPathIcon className="h-3 w-3" aria-hidden="true" />}
                            {vs.label === "Completed" && <CheckCircleIcon className="h-3 w-3" aria-hidden="true" />}
                            {vs.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5"><RiskBadge level={customer.risk_level} /></td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 dark:text-gray-500">Unassigned</td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/dashboard/customers/${customer.external_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary text-xs font-medium hover:text-primary-600"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3. Verification Progress Tracker */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Verification Progress Tracker</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {selectedCustomer
                ? `Showing verification checks for: ${selectedCustomer.external_id}`
                : "Click any row in the case table above to inspect verification checks"}
            </p>
          </div>

          {!selectedCustomer ? (
            <div className="px-6 py-10 text-center">
              <ExclamationTriangleIcon className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a case to view identity, AML, address, document, and registry check statuses
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {checkStatuses!.map((check) => {
                  const style = CHECK_STATUS_STYLES[check.status as keyof typeof CHECK_STATUS_STYLES];
                  const Icon = CHECK_ICONS[check.id as keyof typeof CHECK_ICONS];
                  return (
                    <div
                      key={check.id}
                      className="bg-gray-50 dark:bg-navy-800 rounded-lg p-4 border border-gray-100 dark:border-navy-600 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" aria-hidden="true" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-tight">{check.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                        <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
                        {check.confidence !== null && (
                          <span className="ml-auto text-[10px] font-semibold text-green-600 dark:text-green-400">
                            {check.confidence}%
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        Provider: {check.provider}
                      </p>
                      {check.timestamp && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                          {check.status === "in_progress" ? "Started" : "Completed"}: {check.timestamp}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-navy-600 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  Current Tier: <TierBadge tier={selectedCustomer.current_tier} />
                </span>
                <span>Onboarded: {new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
                <Link
                  href={`/dashboard/customers/${selectedCustomer.external_id}`}
                  className="ml-auto text-primary font-medium hover:text-primary-600"
                >
                  Full Customer Profile →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 4. Quick Actions Panel */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => { setShowNewCase(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-colors group"
            >
              <UserPlusIcon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">New Onboarding</span>
              <span className="text-xs text-gray-400">Register a customer</span>
            </button>
            <Link
              href="/dashboard/customers"
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-navy-600 hover:border-primary hover:bg-primary/5 transition-colors group"
            >
              <UserGroupIcon className="h-8 w-8 text-gray-400 group-hover:text-primary group-hover:scale-110 transition-all" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">All Customers</span>
              <span className="text-xs text-gray-400">Browse full list</span>
            </Link>
            <button
              onClick={() => filteredCustomers.length > 0 && exportCSV(filteredCustomers)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-navy-600 hover:border-primary hover:bg-primary/5 transition-colors group"
            >
              <ArrowDownTrayIcon className="h-8 w-8 text-gray-400 group-hover:text-primary group-hover:scale-110 transition-all" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">Export Cases</span>
              <span className="text-xs text-gray-400">Download CSV</span>
            </button>
            <Link
              href="/dashboard/decisions"
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-navy-600 hover:border-primary hover:bg-primary/5 transition-colors group"
            >
              <ClipboardDocumentListIcon className="h-8 w-8 text-gray-400 group-hover:text-primary group-hover:scale-110 transition-all" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">Decision Log</span>
              <span className="text-xs text-gray-400">View all decisions</span>
            </Link>
          </div>
        </div>

      </div>
    </RoleGuard>
  );
}

// ── New Case Creation Form ────────────────────────────────────────────────────

interface StagedDoc {
  uid: number;
  doc_type: string;
  file: File | null;
}

const DOC_TYPES_INDIVIDUAL = [
  { value: "ID_DOCUMENT", label: "ID Document (Ghana Card / Passport)" },
  { value: "PROOF_OF_ADDRESS", label: "Proof of Address" },
  { value: "SELFIE", label: "Selfie / Liveness Photo" },
  { value: "OTHER", label: "Other" },
];

const DOC_TYPES_BUSINESS = [
  { value: "BUSINESS_REGISTRATION", label: "Business Registration Certificate" },
  { value: "PROOF_OF_ADDRESS", label: "Proof of Business Address" },
  { value: "DIRECTOR_ID", label: "Director / Signatory ID" },
  { value: "TAX_CERTIFICATE", label: "Tax Certificate" },
  { value: "OTHER", label: "Other" },
];

function NewCaseForm({
  clientId,
  onComplete,
  onCancel,
}: {
  clientId: string;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [register, { isLoading }] = useRegisterCustomerMutation();
  const [uploadDocument] = useUploadDocumentMutation();
  const [step, setStep] = useState<"form" | "success">("form");
  const [registeredId, setRegisteredId] = useState("");
  const [uploadSummary, setUploadSummary] = useState<{ uploaded: number; failed: number } | null>(null);
  const [stagedDocs, setStagedDocs] = useState<StagedDoc[]>([]);
  const [form, setForm] = useState({
    external_id: "",
    entity_type: "INDIVIDUAL" as EntityType,
    name: "",
    email: "",
    phone: "",
    id_number: "",
    date_of_birth: "",
    address: "",
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const isIndividual = form.entity_type === "INDIVIDUAL";
  const docTypes = isIndividual ? DOC_TYPES_INDIVIDUAL : DOC_TYPES_BUSINESS;

  const addDocSlot = () =>
    setStagedDocs((prev) => [...prev, { uid: Date.now(), doc_type: docTypes[0].value, file: null }]);

  const removeDoc = (uid: number) =>
    setStagedDocs((prev) => prev.filter((d) => d.uid !== uid));

  const setDocFile = (uid: number, file: File | null) =>
    setStagedDocs((prev) => prev.map((d) => (d.uid === uid ? { ...d, file } : d)));

  const setDocType = (uid: number, doc_type: string) =>
    setStagedDocs((prev) => prev.map((d) => (d.uid === uid ? { ...d, doc_type } : d)));

  const handleSubmit = async () => {
    if (!form.external_id.trim()) {
      showToast({ type: "error", title: "Validation", message: "Case ID is required" });
      return;
    }
    try {
      await register({
        external_id: form.external_id,
        client_id: clientId,
        entity_type: form.entity_type,
        name: form.name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        metadata: {
          ...(form.id_number && { id_number: form.id_number }),
          ...(form.date_of_birth && { date_of_birth: form.date_of_birth }),
          ...(form.address && { address: form.address }),
        },
      }).unwrap();

      // Upload staged documents
      const filledDocs = stagedDocs.filter((d) => d.file);
      let uploaded = 0;
      let failed = 0;
      for (const doc of filledDocs) {
        try {
          await uploadDocument({
            customer_external_id: form.external_id,
            document_type: doc.doc_type,
            file: doc.file!,
          }).unwrap();
          uploaded++;
        } catch {
          failed++;
        }
      }

      setRegisteredId(form.external_id);
      setUploadSummary(filledDocs.length > 0 ? { uploaded, failed } : null);
      setStep("success");
    } catch {
      showToast({ type: "error", title: "Registration Failed", message: "Failed to register customer. Please check the case ID is unique." });
    }
  };

  const resetForm = () => {
    setStep("form");
    setStagedDocs([]);
    setUploadSummary(null);
    setForm({ external_id: "", entity_type: "INDIVIDUAL", name: "", email: "", phone: "", id_number: "", date_of_birth: "", address: "" });
  };

  if (step === "success") {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400 flex-shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-base font-semibold text-green-800 dark:text-green-300">Customer Onboarded Successfully</h3>
            <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">
              {registeredId} is registered at T0/B0 and pending verification.
            </p>
            {uploadSummary && (
              <p className="text-xs text-green-500 dark:text-green-500 mt-0.5">
                Documents: {uploadSummary.uploaded} uploaded
                {uploadSummary.failed > 0 && `, ${uploadSummary.failed} failed — retry via customer profile`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href={`/dashboard/customers/${registeredId}`}
            className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            View Customer Profile
          </Link>
          <button
            onClick={resetForm}
            className="px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            Register Another
          </button>
          <button
            onClick={onComplete}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-navy-600 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">New Onboarding Case</h3>

      {/* Row 1: Type + Case ID + Name */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Customer Type</label>
          <select
            value={form.entity_type}
            onChange={(e) => set("entity_type", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          >
            <option value="INDIVIDUAL">Individual (KYC)</option>
            <option value="BUSINESS">Business (KYB)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Case ID *</label>
          <input
            type="text"
            value={form.external_id}
            onChange={(e) => set("external_id", e.target.value)}
            placeholder="e.g., CUST-001"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {isIndividual ? "Full Name" : "Business Name"}
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={isIndividual ? "John Doe" : "Acme Corp Ltd"}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Row 2: ID number + DOB + Phone */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {isIndividual ? "ID Number (Ghana Card / Passport)" : "Registration Number"}
          </label>
          <input
            type="text"
            value={form.id_number}
            onChange={(e) => set("id_number", e.target.value)}
            placeholder={isIndividual ? "GHA-XXXXXXXXX-X" : "CS000XXXXX"}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {isIndividual ? "Date of Birth" : "Date of Incorporation"}
          </label>
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => set("date_of_birth", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone Number</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+233XXXXXXXXX"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Row 3: Email + Address */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email Address</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="customer@example.com"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address Details</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="House No, Street, City, Region"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Document Upload */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            Documents <span className="text-gray-400">(optional — attach before submission)</span>
          </label>
          <button
            type="button"
            onClick={addDocSlot}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-600 font-medium"
          >
            <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Add Document
          </button>
        </div>
        {stagedDocs.length === 0 ? (
          <button
            type="button"
            onClick={addDocSlot}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 dark:border-navy-600 rounded-lg text-sm text-gray-400 dark:text-gray-500 hover:border-primary hover:text-primary transition-colors"
          >
            <PaperClipIcon className="h-4 w-4" aria-hidden="true" />
            Click to attach ID documents, business registration, or proof of address
          </button>
        ) : (
          <div className="space-y-2">
            {stagedDocs.map((doc) => (
              <div key={doc.uid} className="flex items-center gap-2 p-2 border border-gray-200 dark:border-navy-600 rounded-lg bg-gray-50 dark:bg-navy-800">
                <select
                  value={doc.doc_type}
                  onChange={(e) => setDocType(doc.uid, e.target.value)}
                  className="text-xs border border-gray-200 dark:border-navy-600 rounded px-2 py-1.5 bg-white dark:bg-navy-700 text-gray-900 dark:text-white w-52 flex-shrink-0"
                >
                  {docTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <label className="flex-1 flex items-center gap-2 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="sr-only"
                    onChange={(e) => setDocFile(doc.uid, e.target.files?.[0] ?? null)}
                  />
                  {doc.file ? (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 truncate">
                      <CheckCircleIcon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                      {doc.file.name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <PaperClipIcon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                      Choose file (PDF or image)
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => removeDoc(doc.uid)}
                  className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 flex-shrink-0"
                  aria-label="Remove document"
                >
                  <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
          {isLoading ? "Registering..." : stagedDocs.some((d) => d.file) ? "Register & Upload Documents" : "Register & Onboard"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-navy-600 border border-gray-200 dark:border-navy-600 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-500 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
