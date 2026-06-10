"use client";

import { useEffect, useState } from "react";
import {
  useListApiKeysQuery,
  useCreateApiKeyMutation,
  useRevokeApiKeyMutation,
  useRotateApiKeyMutation,
  useGetApiKeyUsageQuery,
  type ApiKey,
} from "@/redux/slices/api/apiKeysApi";
import QueryState from "@/components/QueryState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { KeyIcon, ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

export default function ApiKeysPage() {
  useEffect(() => {
    document.title = "API Keys | Transaction Monitor";
  }, []);

  const { data, isLoading, isError, error } = useListApiKeysQuery();
  const [createKey, createState] = useCreateApiKeyMutation();
  const [rotateKey] = useRotateApiKeyMutation();
  const [revokeKey] = useRevokeApiKeyMutation();

  const [showCreate, setShowCreate] = useState(false);
  const [secret, setSecret] = useState<{ key: string; note: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [rotateTarget, setRotateTarget] = useState<ApiKey | null>(null);
  const [usageTarget, setUsageTarget] = useState<ApiKey | null>(null);

  const keys = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Keys authenticate as your institution for service-to-service access. Secrets are shown once.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          <KeyIcon className="h-4 w-4" />
          Create key
        </button>
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={keys.length === 0}
          emptyMessage="No API keys yet. Create one to start integrating."
          cols={5}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Label</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium">Last used</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {keys.map((k) => {
                  const expiring = k.expires_at && new Date(k.expires_at) > new Date();
                  return (
                    <tr key={k.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <KeyIcon className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">{k.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(k.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                      </td>
                      <td className="px-6 py-4">
                        {k.is_active ? (
                          expiring ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              expiring
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              active
                            </span>
                          )
                        ) : (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            revoked
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setUsageTarget(k)}
                            className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 dark:border-navy-500 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
                          >
                            Usage
                          </button>
                          {k.is_active && (
                            <>
                              <button
                                onClick={() => setRotateTarget(k)}
                                className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 dark:border-navy-500 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
                              >
                                Rotate
                              </button>
                              <button
                                onClick={() => setRevokeTarget(k)}
                                className="px-3 py-1 rounded-lg text-xs font-medium border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                Revoke
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </QueryState>
      </div>

      {showCreate && (
        <CreateKeyModal
          busy={createState.isLoading}
          onClose={() => setShowCreate(false)}
          onConfirm={async (label) => {
            try {
              const res = await createKey({ label }).unwrap();
              setShowCreate(false);
              setSecret({ key: res.key, note: "Store this key now — it will not be shown again." });
            } catch (e) {
              showToast({ type: "error", title: "Create failed", message: errorMessage(e) });
            }
          }}
        />
      )}

      {secret && <SecretModal secret={secret.key} note={secret.note} onClose={() => setSecret(null)} />}

      {usageTarget && <UsageModal apiKey={usageTarget} onClose={() => setUsageTarget(null)} />}

      <ConfirmDialog
        open={!!rotateTarget}
        title="Rotate this key?"
        message={`A new key is issued immediately. The old key keeps working for a short grace period so you can update your services.`}
        confirmLabel="Rotate"
        variant="warning"
        onConfirm={async () => {
          if (!rotateTarget) return;
          try {
            const res = await rotateKey(rotateTarget.id).unwrap();
            setRotateTarget(null);
            setSecret({
              key: res.new_key,
              note: `Old key expires ${new Date(res.old_key_expires_at).toLocaleString()}. Update your services before then.`,
            });
          } catch (e) {
            showToast({ type: "error", title: "Rotate failed", message: errorMessage(e) });
            setRotateTarget(null);
          }
        }}
        onCancel={() => setRotateTarget(null)}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke this key?"
        message={`"${revokeTarget?.label ?? ""}" stops working immediately and cannot be restored. Any service using it will get 401.`}
        confirmLabel="Revoke"
        variant="danger"
        onConfirm={async () => {
          if (!revokeTarget) return;
          try {
            await revokeKey(revokeTarget.id).unwrap();
            showToast({ type: "success", title: "Key revoked", message: `"${revokeTarget.label}" is now disabled.` });
          } catch (e) {
            showToast({ type: "error", title: "Revoke failed", message: errorMessage(e) });
          } finally {
            setRevokeTarget(null);
          }
        }}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}

function CreateKeyModal({
  busy,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: (label: string) => void;
}) {
  const [label, setLabel] = useState("");
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create API key</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Production integration"
          />
          <p className="text-xs text-gray-400 mt-1">A human-readable name to recognise this key later.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-navy-500 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(label.trim())}
            disabled={busy || !label.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecretModal({ secret, note, onClose }: { secret: string; note: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ type: "warning", title: "Copy failed", message: "Select and copy the key manually." });
    }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your new API key</h2>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          {note}
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-navy-800 text-gray-900 dark:text-gray-100 text-xs font-mono break-all">
            {secret}
          </code>
          <button
            onClick={copy}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-600"
          >
            {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-navy-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-navy-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function UsageModal({ apiKey, onClose }: { apiKey: ApiKey; onClose: () => void }) {
  const { data, isLoading, isError, error } = useGetApiKeyUsageQuery(apiKey.id);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Usage — {apiKey.label}</h2>
        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : isError ? (
          <p className="text-sm text-red-500">{errorMessage(error)}</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Today", value: data?.requests_today ?? 0 },
              { label: "7 days", value: data?.requests_7d ?? 0 },
              { label: "30 days", value: data?.requests_30d ?? 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-gray-50 dark:bg-navy-800 p-4">
                <p className="text-2xl font-bold text-primary">{s.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400">
          Last used: {apiKey.last_used_at ? new Date(apiKey.last_used_at).toLocaleString() : "never"}. Counts reset at midnight UTC.
        </p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-navy-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-navy-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
