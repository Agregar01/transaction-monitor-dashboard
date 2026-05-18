"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/redux/store";
import {
  useListWebhooksQuery,
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
  useListWebhookDeliveriesQuery,
  useRetryDeliveryMutation,
} from "@/redux/slices/api/webhooksApi";
import {
  PlusIcon,
  TrashIcon,
  PaperAirplaneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import ConfirmDialog from "@/components/ConfirmDialog";
import ClientGuard from "@/components/ClientGuard";
import RoleGuard from "@/components/RoleGuard";

const ALL_EVENTS = [
  "decision.created",
  "customer.registered",
  "customer.tier_changed",
  "customer.risk_changed",
  "verification.completed",
];

function CreateWebhookModal({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
  const [create, { isLoading }] = useCreateWebhookMutation();
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([...ALL_EVENTS]);
  const [error, setError] = useState("");

  if (!open) return null;

  const toggleEvent = (ev: string) => {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!url.trim()) { setError("Endpoint URL is required"); return; }
    try { new URL(url); } catch { setError("Please enter a valid URL (e.g., https://...)"); return; }
    if (!url.startsWith("https://")) { setError("Webhook URL must use HTTPS"); return; }
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname.startsWith("10.") || hostname.startsWith("192.168.") || hostname.startsWith("172.") || hostname === "::1") {
      setError("Webhook URL cannot point to a private/local address"); return;
    }
    if (selectedEvents.length === 0) { setError("Select at least one event"); return; }
    try {
      await create({ client_id: clientId, url, events: selectedEvents }).unwrap();
      setUrl("");
      setSelectedEvents([...ALL_EVENTS]);
      onClose();
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setError(e?.data?.detail || "Failed to create webhook");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-navy-600">
          <h2 className="text-lg font-semibold dark:text-white">Add Webhook</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endpoint URL *</label>
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm"
              placeholder="https://your-server.com/webhook"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Events</label>
            <div className="space-y-2">
              {ALL_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    className="rounded border-gray-300"
                  />
                  {ev}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Webhook"}
          </button>
        </form>
      </div>
    </div>
  );
}

function DeliveryLog({ webhookId, clientId }: { webhookId: string; clientId: string }) {
  const { data: deliveries, isLoading } = useListWebhookDeliveriesQuery({ webhook_id: webhookId, client_id: clientId });
  const [retryDelivery, { isLoading: retrying }] = useRetryDeliveryMutation();
  const [retryResult, setRetryResult] = useState<Record<string, boolean>>({});

  const handleRetry = async (deliveryId: string) => {
    try {
      const result = await retryDelivery({ webhook_id: webhookId, delivery_id: deliveryId, client_id: clientId }).unwrap();
      setRetryResult((prev) => ({ ...prev, [deliveryId]: result.success }));
    } catch {
      setRetryResult((prev) => ({ ...prev, [deliveryId]: false }));
    }
  };

  if (isLoading) {
    return <div className="px-5 py-3 text-sm text-gray-400">Loading deliveries...</div>;
  }

  if (!deliveries || deliveries.length === 0) {
    return <div className="px-5 py-3 text-sm text-gray-400">No deliveries yet</div>;
  }

  return (
    <div className="border-t dark:border-navy-600">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-navy-600">
            <th className="px-5 py-2 font-medium">Event</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Code</th>
            <th className="px-3 py-2 font-medium">Attempt</th>
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <tr key={d.id} className="border-b dark:border-navy-600/50 last:border-0">
              <td className="px-5 py-2 text-gray-700 dark:text-gray-300">{d.event_type}</td>
              <td className="px-3 py-2">
                {d.success ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CheckCircleIcon className="h-3.5 w-3.5" /> OK
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-500">
                    <XCircleIcon className="h-3.5 w-3.5" /> Failed
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{d.status_code || "—"}</td>
              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{d.attempt}</td>
              <td className="px-3 py-2 text-gray-500 dark:text-gray-500">
                {new Date(d.created_at).toLocaleString()}
              </td>
              <td className="px-3 py-2">
                {!d.success && (
                  <button
                    onClick={() => handleRetry(d.id)}
                    disabled={retrying}
                    title="Retry delivery"
                    className="p-1 text-gray-400 hover:text-primary rounded"
                  >
                    <ArrowPathIcon className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />
                  </button>
                )}
                {retryResult[d.id] !== undefined && (
                  <span className={`ml-1 ${retryResult[d.id] ? "text-green-600" : "text-red-500"}`}>
                    {retryResult[d.id] ? "OK" : "Fail"}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WebhooksPage() {
  useEffect(() => { document.title = "Webhooks | Deferred KYC"; }, []);
  const clientId = useAppSelector((s) => s.auth.clientId) || "";
  const [showCreate, setShowCreate] = useState(false);
  const { data: webhooks, isLoading } = useListWebhooksQuery(clientId);
  const [deleteWebhook] = useDeleteWebhookMutation();
  const [testWebhook, { isLoading: testing }] = useTestWebhookMutation();
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; status_code: number }>>({});
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);

  const handleTest = async (id: string) => {
    try {
      const result = await testWebhook({ id, client_id: clientId }).unwrap();
      setTestResult((prev) => ({ ...prev, [id]: result }));
    } catch {
      setTestResult((prev) => ({ ...prev, [id]: { success: false, status_code: 0 } }));
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    await deleteWebhook({ id: confirmDeleteId, client_id: clientId });
    setConfirmDeleteId(null);
  };

  return (
    <ClientGuard>
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Webhooks</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Receive real-time notifications for events</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Endpoint
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-8 text-center text-gray-400">Loading...</div>
      ) : webhooks && webhooks.length > 0 ? (
        <div className="space-y-4">
          {webhooks.map((wh) => (
            <div key={wh.id} className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${wh.is_active ? "bg-green-400" : "bg-gray-300"}`} />
                      <p className="font-medium text-gray-900 dark:text-white text-sm break-all">{wh.url}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {wh.events.map((ev) => (
                        <span key={ev} className="px-2 py-0.5 bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300 rounded text-xs">
                          {ev}
                        </span>
                      ))}
                    </div>
                    {wh.secret && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">Signing secret:</span>
                        <code className="text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-navy-800 px-2 py-0.5 rounded">
                          {wh.secret.slice(0, 8)}••••••••
                        </code>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">Created {new Date(wh.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {testResult[wh.id] && (
                      <span className={`text-xs px-2 py-0.5 rounded ${testResult[wh.id].success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {testResult[wh.id].success ? `OK (${testResult[wh.id].status_code})` : "Failed"}
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedWebhook(expandedWebhook === wh.id ? null : wh.id)}
                      title="View delivery logs"
                      className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600"
                    >
                      {expandedWebhook === wh.id ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleTest(wh.id)}
                      disabled={testing}
                      title="Send test event"
                      className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(wh.id)}
                      title="Delete"
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              {expandedWebhook === wh.id && (
                <DeliveryLog webhookId={wh.id} clientId={clientId} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-12 text-center">
          <p className="text-gray-400 mb-4">No webhook endpoints configured</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-primary hover:underline text-sm font-medium"
          >
            Add your first endpoint
          </button>
        </div>
      )}

      <CreateWebhookModal open={showCreate} onClose={() => setShowCreate(false)} clientId={clientId} />
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Webhook"
        message="This will permanently remove this webhook endpoint. Are you sure?"
        confirmLabel="Delete"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
    </RoleGuard>
    </ClientGuard>
  );
}
