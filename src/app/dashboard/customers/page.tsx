"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppSelector } from "@/redux/store";
import { useListCustomersQuery, useBulkImportCustomersMutation } from "@/redux/slices/api/customersApi";
import { useListClientsQuery } from "@/redux/slices/api/clientsApi";
import TierBadge from "@/components/TierBadge";
import RiskBadge from "@/components/RiskBadge";
import RegisterCustomerModal from "@/components/RegisterCustomerModal";
import { PlusIcon, MagnifyingGlassIcon, ArrowUpTrayIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { SkeletonTable } from "@/components/Skeleton";
import ClientGuard from "@/components/ClientGuard";
import type { EntityType } from "@/types/api";

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function CustomersPage() {
  useEffect(() => { document.title = "Customers | Deferred KYC"; }, []);
  const clientId = useAppSelector((s) => s.auth.clientId) || "";
  const isAdmin = useAppSelector((s) => s.auth.isAdmin);
  const userRole = useAppSelector((s) => s.auth.userRole);
  const canRegister = isAdmin || userRole === "OWNER" || userRole === "OPERATIONS";
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState<EntityType | "">("");
  const [tierFilter, setTierFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImport, { isLoading: importing }] = useBulkImportCustomersMutation();
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: Array<{ row: number; error: string }> } | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  // Admins can list all clients for the filter dropdown
  const { data: clients } = useListClientsQuery({}, { skip: !isAdmin });

  // Build a client name lookup map
  const clientMap: Record<string, string> = {};
  if (clients?.items) {
    for (const c of clients.items) {
      clientMap[c.client_id] = c.name;
    }
  }

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, entityFilter, tierFilter, clientFilter]);

  // Admin: omit client_id to see all customers (or filter by selected client)
  // Client: always use own client_id
  const queryClientId = isAdmin ? (clientFilter || undefined) : clientId;

  const { data, isLoading } = useListCustomersQuery({
    client_id: queryClientId,
    page,
    page_size: 20,
    entity_type: entityFilter || undefined,
    tier: tierFilter || undefined,
    search: debouncedSearch || undefined,
  });

  return (
    <ClientGuard>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAdmin ? "All Customers" : "Customers"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {data?.total ?? 0} customers {isAdmin && !clientFilter ? "across all clients" : "registered"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.items && data.items.length > 0 && (
            <button
              onClick={() => {
                const rows = data.items.map((c) =>
                  [c.external_id, c.entity_type, c.current_tier, c.risk_level, c.risk_score, new Date(c.created_at).toISOString()].join(",")
                );
                const csv = ["external_id,entity_type,tier,risk_level,risk_score,created_at", ...rows].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "customers.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 border dark:border-navy-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export CSV
            </button>
          )}
          {canRegister && (
            <>
              <button
                onClick={() => setShowBulkImport(!showBulkImport)}
                className="flex items-center gap-2 border dark:border-navy-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                Bulk Import
              </button>
              <button
                onClick={() => setShowRegister(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Register Customer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk Import Panel */}
      {showBulkImport && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300">Bulk Import Customers</h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Upload a CSV file with columns: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">external_id, entity_type, name, email, phone</code>
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const file = (e.currentTarget.elements.namedItem("csvfile") as HTMLInputElement).files?.[0];
              if (!file) return;
              if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
                setImportResult({ created: 0, skipped: 0, errors: [{ row: 0, error: "Only CSV files are allowed" }] });
                return;
              }
              try {
                const result = await bulkImport({ client_id: clientId, file }).unwrap();
                setImportResult(result);
              } catch {
                setImportResult({ created: 0, skipped: 0, errors: [{ row: 0, error: "Import failed" }] });
              }
            }}
            className="flex items-center gap-3"
          >
            <input type="file" name="csvfile" accept=".csv" required className="text-sm" />
            <button
              type="submit"
              disabled={importing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? "Importing..." : "Upload & Import"}
            </button>
            <button type="button" onClick={() => { setShowBulkImport(false); setImportResult(null); }}
              className="text-sm text-blue-500 hover:text-blue-700">Cancel</button>
          </form>
          {importResult && (
            <div className="text-sm space-y-1">
              <p className="text-green-700 dark:text-green-400">Created: {importResult.created} | Skipped: {importResult.skipped}</p>
              {importResult.errors.length > 0 && (
                <div className="text-red-600 dark:text-red-400">
                  <p className="font-medium">Errors:</p>
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <p key={i}>Row {err.row}: {err.error}</p>
                  ))}
                  {importResult.errors.length > 10 && <p>...and {importResult.errors.length - 10} more</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by external ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
        {isAdmin && clients?.items && (
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Clients</option>
            {clients.items.map((c) => (
              <option key={c.client_id} value={c.client_id}>{c.name}</option>
            ))}
          </select>
        )}
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value as EntityType | "")}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Types</option>
          <option value="INDIVIDUAL">Individual (KYC)</option>
          <option value="BUSINESS">Business (KYB)</option>
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Tiers</option>
          <option value="T0">T0</option>
          <option value="T1">T1</option>
          <option value="T2">T2</option>
          <option value="T3">T3</option>
          <option value="B0">B0</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
          <option value="B3">B3</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-navy-800">
            <tr className="text-left text-gray-500">
              <th className="px-6 py-3 font-medium">External ID</th>
              {isAdmin && <th className="px-6 py-3 font-medium">Client</th>}
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Tier</th>
              <th className="px-6 py-3 font-medium">Risk</th>
              <th className="px-6 py-3 font-medium">Score</th>
              <th className="px-6 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={isAdmin ? 7 : 6} className="p-0"><SkeletonTable rows={5} cols={isAdmin ? 7 : 6} /></td></tr>
            ) : data?.items.length ? (
              data.items.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/customers/${c.external_id}`} className="font-medium text-primary hover:underline">
                      {c.external_id}
                    </Link>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {c.client_id ? (clientMap[c.client_id] || c.client_id.slice(0, 8) + "...") : "—"}
                    </td>
                  )}
                  <td className="px-6 py-4 text-gray-600">{c.entity_type}</td>
                  <td className="px-6 py-4"><TierBadge tier={c.current_tier} /></td>
                  <td className="px-6 py-4"><RiskBadge level={c.risk_level} /></td>
                  <td className="px-6 py-4 text-gray-600">{c.risk_score}</td>
                  <td className="px-6 py-4 text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-gray-400">
                {debouncedSearch ? `No customers matching "${debouncedSearch}"` : "No customers found"}
              </td></tr>
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
            <span className="text-sm text-gray-500">
              Page {data.page} of {data.pages} ({data.total} total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-white"
              >
                Previous
              </button>
              <button
                disabled={page >= data.pages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {canRegister && <RegisterCustomerModal open={showRegister} onClose={() => setShowRegister(false)} />}
    </div>
    </ClientGuard>
  );
}
