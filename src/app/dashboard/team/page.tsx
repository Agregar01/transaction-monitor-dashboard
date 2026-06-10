"use client";

import { useEffect, useState } from "react";
import {
  useListTeamQuery,
  useInviteTeamMemberMutation,
  useReinviteTeamMemberMutation,
  useDeactivateTeamMemberMutation,
  useReactivateTeamMemberMutation,
  INVITABLE_ROLES,
} from "@/redux/slices/api/teamApi";
import QueryState from "@/components/QueryState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { UserPlusIcon } from "@heroicons/react/24/outline";

const ROLE_LABEL = (r: string) => r.replace(/_/g, " ").toLowerCase();

export default function TeamPage() {
  useEffect(() => {
    document.title = "Team | Transaction Monitor";
  }, []);

  const [includeInactive, setIncludeInactive] = useState(false);
  const { data, isLoading, isError, error } = useListTeamQuery(
    includeInactive ? { include_inactive: true } : undefined,
  );

  const [invite, inviteState] = useInviteTeamMemberMutation();
  const [reinvite] = useReinviteTeamMemberMutation();
  const [deactivate] = useDeactivateTeamMemberMutation();
  const [reactivate] = useReactivateTeamMemberMutation();

  const [showInvite, setShowInvite] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; email: string } | null>(null);

  const members = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Invite and manage users within your institution.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          <UserPlusIcon className="h-4 w-4" />
          Invite member
        </button>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.target.checked)}
          className="rounded border-gray-300 dark:border-navy-500 text-primary focus:ring-primary"
        />
        Show deactivated users
      </label>

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={members.length === 0}
          emptyMessage="No team members yet. Invite your first user."
          cols={5}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Roles</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{m.full_name || "—"}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">
                      {m.roles.map(ROLE_LABEL).join(", ") || "—"}
                    </td>
                    <td className="px-6 py-4">
                      {m.invite_pending ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          invite pending
                        </span>
                      ) : m.active ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          active
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          deactivated
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {m.invite_pending && (
                          <button
                            onClick={async () => {
                              try {
                                await reinvite(m.id).unwrap();
                                showToast({ type: "success", title: "Invite resent", message: `New link sent to ${m.email}.` });
                              } catch (e) {
                                showToast({ type: "error", title: "Resend failed", message: errorMessage(e) });
                              }
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 dark:border-navy-500 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
                          >
                            Resend invite
                          </button>
                        )}
                        {!m.invite_pending && m.active && (
                          <button
                            onClick={() => setDeactivateTarget({ id: m.id, email: m.email })}
                            className="px-3 py-1 rounded-lg text-xs font-medium border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Deactivate
                          </button>
                        )}
                        {!m.invite_pending && !m.active && (
                          <button
                            onClick={async () => {
                              try {
                                await reactivate(m.id).unwrap();
                                showToast({ type: "success", title: "Reactivated", message: `${m.email} can sign in again.` });
                              } catch (e) {
                                showToast({ type: "error", title: "Reactivate failed", message: errorMessage(e) });
                              }
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-600"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </div>

      {showInvite && (
        <InviteModal
          busy={inviteState.isLoading}
          onClose={() => setShowInvite(false)}
          onConfirm={async (email, role, full_name) => {
            try {
              await invite({ email, role, full_name: full_name || undefined }).unwrap();
              showToast({ type: "success", title: "Invite sent", message: `${email} invited as ${ROLE_LABEL(role)}.` });
              setShowInvite(false);
            } catch (e) {
              showToast({ type: "error", title: "Invite failed", message: errorMessage(e) });
            }
          }}
        />
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Deactivate user?"
        message={`${deactivateTarget?.email ?? ""} will be blocked from signing in. Their history is preserved.`}
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={async () => {
          if (!deactivateTarget) return;
          try {
            await deactivate(deactivateTarget.id).unwrap();
            showToast({ type: "success", title: "Deactivated", message: `${deactivateTarget.email} can no longer sign in.` });
          } catch (e) {
            showToast({ type: "error", title: "Deactivate failed", message: errorMessage(e) });
          } finally {
            setDeactivateTarget(null);
          }
        }}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}

function InviteModal({
  busy,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: (email: string, role: string, fullName: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("ANALYST");
  const [fullName, setFullName] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Enter a valid email address.");
      return;
    }
    onConfirm(email.trim(), role, fullName.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invite team member</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErr(""); }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="analyst@firstbank.com"
          />
          {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white text-sm capitalize focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL(r)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ama Owusu"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-navy-500 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !email.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}
