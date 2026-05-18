"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/store";
import {
  useListClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useRegenerateKeyMutation,
  useDeleteClientMutation,
} from "@/redux/slices/api/clientsApi";
import type { ApiClient } from "@/redux/slices/api/clientsApi";
import AdminGuard from "@/components/AdminGuard";
import { PlusIcon, ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";
import ConfirmDialog from "@/components/ConfirmDialog";

function KeyPrefix({ prefix }: { prefix: string | null }) {
  return (
    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
      {prefix || "\u2014"}
    </span>
  );
}

function CreateClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [create, { isLoading }] = useCreateClientMutation();
  const [form, setForm] = useState({ name: "", description: "", contact_email: "", webhook_url: "", integration_mode: "api_only" as "api_only" | "full_platform" });
  const [error, setError] = useState("");
  const [created, setCreated] = useState<ApiClient | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await create({
        name: form.name,
        description: form.description || undefined,
        contact_email: form.contact_email || undefined,
        webhook_url: form.webhook_url || undefined,
        integration_mode: form.integration_mode,
      }).unwrap();
      setCreated(res);
      setForm({ name: "", description: "", contact_email: "", webhook_url: "", integration_mode: "api_only" });
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setError(e?.data?.detail || "Failed to create client");
    }
  };

  const inputCls = "w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="create-client-title">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-navy-600">
          <h2 id="create-client-title" className="text-lg font-semibold dark:text-white">{created ? "Client Created" : "Register New Client"}</h2>
          <button onClick={() => { onClose(); setCreated(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl" aria-label="Close">&times;</button>
        </div>

        {created ? (
          <div className="p-6 space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Save these credentials — the API key won&apos;t be shown again in full.</p>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Client ID</p>
                <p className="font-mono text-sm select-all dark:text-white">{created.client_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">API Key</p>
                <p className="font-mono text-sm select-all break-all dark:text-white">{created.api_key}</p>
              </div>
            </div>
            <button onClick={() => { onClose(); setCreated(null); }} className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name *</label>
              <input id="client-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Acme Corp" />
            </div>
            <div>
              <label htmlFor="client-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input id="client-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="Mobile money provider" />
            </div>
            <div>
              <label htmlFor="client-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Email</label>
              <input id="client-email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label htmlFor="client-webhook" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Webhook URL</label>
              <input id="client-webhook" value={form.webhook_url} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })} className={inputCls} placeholder="https://..." />
            </div>
            <div>
              <label htmlFor="client-mode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Integration Mode *</label>
              <select id="client-mode" value={form.integration_mode} onChange={(e) => setForm({ ...form, integration_mode: e.target.value as "api_only" | "full_platform" })} className={inputCls}>
                <option value="api_only">API Only — Decision Engine (client has own verification)</option>
                <option value="full_platform">Full Platform — VideoKYC + Decision Engine</option>
              </select>
            </div>
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
              {isLoading ? "Creating..." : "Create Client"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  useEffect(() => { document.title = "Clients | Deferred KYC"; }, []);
  const { isAdmin } = useAppSelector((s) => s.auth);
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useListClientsQuery({ page, page_size: 20 }, { skip: !isAdmin });
  const [updateClient] = useUpdateClientMutation();
  const [regenerateKey] = useRegenerateKeyMutation();
  const [deleteClient] = useDeleteClientMutation();
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);

  if (!isAdmin) {
    router.replace("/dashboard");
    return null;
  }

  const handleToggleActive = async (client: ApiClient) => {
    await updateClient({ client_id: client.client_id, body: { is_active: !client.is_active } });
  };

  const handleRegenerate = (clientId: string) => {
    setConfirmAction({
      title: "Regenerate API Key",
      message: "The old key will stop working immediately. Are you sure?",
      action: () => regenerateKey(clientId),
    });
  };

  const handleDelete = (clientId: string) => {
    setConfirmAction({
      title: "Delete Client",
      message: "This action cannot be undone. Are you sure?",
      action: () => deleteClient(clientId),
    });
  };

  return (
    <AdminGuard>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{data?.total ?? 0} registered API clients</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
          <PlusIcon className="h-4 w-4" />
          Register Client
        </button>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-navy-600">
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th scope="col" className="px-6 py-3 font-medium">Name</th>
              <th scope="col" className="px-6 py-3 font-medium">Client ID</th>
              <th scope="col" className="px-6 py-3 font-medium">API Key</th>
              <th scope="col" className="px-6 py-3 font-medium">Mode</th>
              <th scope="col" className="px-6 py-3 font-medium">Status</th>
              <th scope="col" className="px-6 py-3 font-medium">Rate Limit</th>
              <th scope="col" className="px-6 py-3 font-medium">Created</th>
              <th scope="col" className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : data?.items.length ? (
              data.items.map((c) => (
                <tr key={c.id} className="border-t dark:border-navy-600 hover:bg-gray-50 dark:hover:bg-navy-600">
                  <td className="px-6 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                      {c.contact_email && <p className="text-xs text-gray-400">{c.contact_email}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{c.client_id}</td>
                  <td className="px-6 py-3"><KeyPrefix prefix={c.api_key_prefix} /></td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.integration_mode === "full_platform"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {c.integration_mode === "full_platform" ? "Full Platform" : "API Only"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <button onClick={() => handleToggleActive(c)} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-gray-600 dark:text-gray-400 text-xs">{c.rate_limit_per_minute}/min</td>
                  <td className="px-6 py-3 text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRegenerate(c.client_id)} title="Regenerate API Key" aria-label="Regenerate API Key" className="p-1 text-gray-400 hover:text-primary rounded">
                        <ArrowPathIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(c.client_id)} title="Delete Client" aria-label="Delete Client" className="p-1 text-gray-400 hover:text-red-600 rounded">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">No clients registered yet</td></tr>
            )}
          </tbody>
        </table>

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t dark:border-navy-600 bg-gray-50 dark:bg-navy-600">
            <span className="text-sm text-gray-500 dark:text-gray-400">Page {data.page} of {data.pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border dark:border-navy-500 rounded text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-navy-700 dark:text-gray-300">Previous</button>
              <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="px-3 py-1 border dark:border-navy-500 rounded text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-navy-700 dark:text-gray-300">Next</button>
            </div>
          </div>
        )}
      </div>

      <CreateClientModal open={showCreate} onClose={() => setShowCreate(false)} />
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title || ""}
        message={confirmAction?.message || ""}
        confirmLabel={confirmAction?.title.startsWith("Delete") ? "Delete" : "Regenerate"}
        onConfirm={() => { confirmAction?.action(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
    </AdminGuard>
  );
}
