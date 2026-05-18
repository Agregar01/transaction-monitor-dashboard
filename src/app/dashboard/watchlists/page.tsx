"use client";

import { useState } from "react";
import {
  useListWatchlistsQuery,
  useListWatchlistEntriesQuery,
  useAddWatchlistEntryMutation,
  useRemoveWatchlistEntryMutation,
  useReloadWatchlistMutation,
} from "@/redux/slices/api/watchlistsApi";
import { SkeletonCard } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import { TrashIcon, ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";

export default function WatchlistsPage() {
  const { data: watchlists, isLoading } = useListWatchlistsQuery();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState("");

  const { data: entries } = useListWatchlistEntriesQuery(
    { name: selectedName ?? "", page_size: 50 },
    { skip: !selectedName },
  );

  const [addEntry, { isLoading: adding }] = useAddWatchlistEntryMutation();
  const [removeEntry] = useRemoveWatchlistEntryMutation();
  const [reload, { isLoading: reloading }] = useReloadWatchlistMutation();

  const onAdd = async () => {
    if (!selectedName || !newEntry.trim()) return;
    try {
      const res = (await addEntry({ name: selectedName, value: newEntry.trim() }).unwrap()) as {
        approval_id?: string;
      };
      showToast({
        type: "info",
        title: "Pending approval",
        message: res.approval_id
          ? `Approval ${res.approval_id.slice(0, 8)}… — another reviewer must confirm.`
          : "Entry added.",
      });
      setNewEntry("");
    } catch (e) {
      showToast({ type: "error", title: "Add failed", message: String(e) });
    }
  };

  const onRemove = async (value: string) => {
    if (!selectedName) return;
    if (!confirm(`Remove ${value} from ${selectedName}? This requires four-eyes approval.`)) return;
    try {
      await removeEntry({ name: selectedName, value }).unwrap();
      showToast({ type: "info", title: "Removal queued", message: "Awaiting approval." });
    } catch (e) {
      showToast({ type: "error", title: "Remove failed", message: String(e) });
    }
  };

  const onReload = async () => {
    if (!selectedName) return;
    try {
      await reload({ name: selectedName }).unwrap();
      showToast({ type: "success", title: "Reloaded", message: selectedName });
    } catch (e) {
      showToast({ type: "error", title: "Reload failed", message: String(e) });
    }
  };

  if (isLoading) return <SkeletonCard />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Watchlists</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          PEP, sanctions, and high-risk jurisdiction lists. Mutations require four-eyes approval.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <header className="px-4 py-3 border-b border-gray-100 dark:border-navy-600 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
            Lists
          </header>
          {!watchlists || watchlists.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">No watchlists configured.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-navy-600">
              {watchlists.map((w) => (
                <li key={w.name}>
                  <button
                    onClick={() => setSelectedName(w.name)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selectedName === w.name
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-gray-50 dark:hover:bg-navy-600 text-gray-900 dark:text-white"
                    }`}
                  >
                    <p className="text-sm font-medium">{w.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {w.list_type} · {w.entry_count} entries{" "}
                      {!w.is_active && <span className="text-amber-600">(inactive)</span>}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-2 bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          {!selectedName ? (
            <div className="p-12 text-center text-sm text-gray-400">Select a list to inspect entries.</div>
          ) : (
            <>
              <header className="px-4 py-3 border-b border-gray-100 dark:border-navy-600 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{selectedName}</h3>
                <button
                  onClick={onReload}
                  disabled={reloading}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  <ArrowPathIcon className={`h-3.5 w-3.5 ${reloading ? "animate-spin" : ""}`} />
                  {reloading ? "Reloading…" : "Reload from source"}
                </button>
              </header>

              <div className="p-4 border-b border-gray-100 dark:border-navy-600 flex gap-2">
                <input
                  type="text"
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                  placeholder="New entry value"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                />
                <button
                  onClick={onAdd}
                  disabled={adding || !newEntry.trim()}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  <PlusIcon className="h-4 w-4" /> Add
                </button>
              </div>

              {!entries || entries.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-400">No entries.</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-navy-600 max-h-[60vh] overflow-y-auto">
                  {entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="px-4 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-navy-600"
                    >
                      <span className="text-sm text-gray-900 dark:text-white">{entry.value}</span>
                      <button
                        onClick={() => onRemove(entry.value)}
                        aria-label="Remove entry"
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
