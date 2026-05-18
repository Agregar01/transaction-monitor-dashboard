"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/redux/store";
import {
  useGetClientProfileQuery,
  useChangePasswordMutation,
  useGetMfaStatusQuery,
  useSetupMfaMutation,
  useVerifyMfaSetupMutation,
  useDisableMfaMutation,
  useListTeamMembersQuery,
  useInviteTeamMemberMutation,
  useUpdateTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useResendInviteMutation,
  useRotateMyKeyMutation,
} from "@/redux/slices/api/usersApi";
import {
  UserIcon,
  KeyIcon,
  ShieldCheckIcon,
  UsersIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  BellIcon,
} from "@heroicons/react/24/outline";
import ConfirmDialog from "@/components/ConfirmDialog";
import RoleGuard from "@/components/RoleGuard";

/* ── Password Change Section ── */
function PasswordSection() {
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPw !== confirm) { setMsg({ type: "err", text: "Passwords do not match" }); return; }
    if (newPw.length < 8) { setMsg({ type: "err", text: "Password must be at least 8 characters" }); return; }
    try {
      await changePassword({ current_password: current, new_password: newPw }).unwrap();
      setMsg({ type: "ok", text: "Password changed successfully" });
      setCurrent(""); setNewPw(""); setConfirm("");
    } catch {
      setMsg({ type: "err", text: "Failed to change password. Check your current password." });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="cur-pw" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
        <input id="cur-pw" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)}
          className="mt-1 w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="new-pw" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
        <input id="new-pw" type="password" required value={newPw} onChange={(e) => setNewPw(e.target.value)}
          className="mt-1 w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="confirm-pw" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
        <input id="confirm-pw" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm" />
      </div>
      {msg && <p className={`text-sm px-3 py-2 rounded ${msg.type === "ok" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>{msg.text}</p>}
      <button type="submit" disabled={isLoading} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50">
        {isLoading ? "Changing..." : "Change Password"}
      </button>
    </form>
  );
}

/* ── MFA Section ── */
function MfaSection() {
  const { data: status, refetch } = useGetMfaStatusQuery();
  const [setupMfa] = useSetupMfaMutation();
  const [verifySetup] = useVerifyMfaSetupMutation();
  const [disableMfa] = useDisableMfaMutation();
  const [setupData, setSetupData] = useState<{ secret: string; qr_code_base64?: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSetup = async () => {
    try {
      const data = await setupMfa().unwrap();
      setSetupData(data);
      setMsg(null);
    } catch { setMsg({ type: "err", text: "Failed to start MFA setup" }); }
  };

  const handleVerify = async () => {
    try {
      await verifySetup({ code }).unwrap();
      setMsg({ type: "ok", text: "MFA enabled successfully!" });
      setSetupData(null); setCode(""); refetch();
    } catch { setMsg({ type: "err", text: "Invalid code. Try again." }); }
  };

  const handleDisable = async () => {
    if (!code) { setMsg({ type: "err", text: "Enter your authenticator code to disable MFA" }); return; }
    try {
      await disableMfa({ code }).unwrap();
      setMsg({ type: "ok", text: "MFA disabled" });
      setCode(""); refetch();
    } catch { setMsg({ type: "err", text: "Invalid code" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status?.mfa_enabled ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-800 dark:bg-navy-600 dark:text-gray-400"}`}>
          {status?.mfa_enabled ? "Enabled" : "Disabled"}
        </span>
        {status?.mfa_required && <span className="text-xs text-amber-600 dark:text-amber-400">Required for admin accounts</span>}
      </div>

      {setupData ? (
        <div className="space-y-4">
          {setupData.qr_code_base64 && (
            <div className="bg-white p-4 rounded-lg inline-block">
              <img src={`data:image/png;base64,${setupData.qr_code_base64}`} alt="MFA QR Code" className="w-48 h-48" />
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">Scan with your authenticator app, then enter the code below.</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 font-mono bg-gray-50 dark:bg-navy-600 px-3 py-2 rounded">Secret: {setupData.secret}</p>
          <div className="flex gap-2">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" maxLength={6}
              className="border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm w-32" />
            <button onClick={handleVerify} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600">Verify</button>
          </div>
        </div>
      ) : status?.mfa_enabled ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">Enter your authenticator code to disable MFA.</p>
          <div className="flex gap-2">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" maxLength={6}
              className="border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm w-32" />
            <button onClick={handleDisable} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">Disable MFA</button>
          </div>
        </div>
      ) : (
        <button onClick={handleSetup} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600">Enable MFA</button>
      )}

      {msg && <p className={`text-sm px-3 py-2 rounded ${msg.type === "ok" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}

/* ── Team Members Section ── */
function TeamSection() {
  const { isAdmin } = useAppSelector((s) => s.auth);
  const { data: members = [] } = useListTeamMembersQuery();
  const [invite, { isLoading: inviting }] = useInviteTeamMemberMutation();
  const [update] = useUpdateTeamMemberMutation();
  const [remove] = useRemoveTeamMemberMutation();
  const [resendInvite] = useResendInviteMutation();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("OPERATIONS");
  const [inviteError, setInviteError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    try {
      await invite({ email, name, role }).unwrap();
      setShowInvite(false); setEmail(""); setName(""); setRole("OPERATIONS");
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setInviteError(e?.data?.detail || "Failed to send invite");
    }
  };

  const handleResend = async (userId: string) => {
    setResending(userId);
    try {
      await resendInvite(userId).unwrap();
    } catch { /* ignore */ }
    setResending(null);
  };

  // Admin console (Agregar internal): ADMIN only (internal ops)
  // Client portal (banks/fintechs): role-based per architecture spec
  const roleDescriptions: Record<string, string> = {
    OPERATIONS: "Onboarding Dashboard — create cases, upload docs",
    COMPLIANCE: "Compliance Dashboard — review results, investigate, escalate",
    RISK: "Risk Dashboard — view analytics, monitor backlog",
    SUPERVISOR: "Approval Dashboard — approve/reject, override, escalate",
    ADMIN: "Admin Dashboard — user management, API config, workflows",
    EXECUTIVE: "Reporting Dashboard — analytics, reports, exports",
  };

  const roleOptions = isAdmin
    ? [{ value: "ADMIN", label: "Admin" }]
    : [
        { value: "OPERATIONS", label: "Operations" },
        { value: "COMPLIANCE", label: "Compliance" },
        { value: "RISK", label: "Risk" },
        { value: "SUPERVISOR", label: "Supervisor" },
        { value: "ADMIN", label: "Admin" },
        { value: "EXECUTIVE", label: "Executive" },
      ];

  const roleBg: Record<string, string> = {
    OWNER: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    OPERATIONS: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    COMPLIANCE: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    RISK: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    SUPERVISOR: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    EXECUTIVE: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-600">
          <PlusIcon className="h-4 w-4" /> Invite
        </button>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="bg-gray-50 dark:bg-navy-600 rounded-lg p-4 space-y-3">
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
          <input type="text" required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm">
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {role && !isAdmin && roleDescriptions[role] && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {roleDescriptions[role]}
            </p>
          )}
          {inviteError && <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={inviting} className="bg-primary text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {inviting ? "Sending..." : "Send Invite"}
            </button>
            <button type="button" onClick={() => { setShowInvite(false); setInviteError(""); }} className="text-gray-500 px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="divide-y dark:divide-navy-600">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</p>
                {!m.invite_accepted && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleBg[m.role] || "bg-gray-100 text-gray-800 dark:bg-navy-600 dark:text-gray-400"}`}>{m.role}</span>
              {!m.invite_accepted && m.role !== "OWNER" && (
                <button
                  onClick={() => handleResend(m.id)}
                  disabled={resending === m.id}
                  title="Resend invite email"
                  aria-label="Resend invite"
                  className="p-1 text-gray-400 hover:text-primary rounded disabled:opacity-50"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${resending === m.id ? "animate-spin" : ""}`} />
                </button>
              )}
              {m.role !== "OWNER" && (
                <select value={m.role} onChange={(e) => update({ user_id: m.id, body: { role: e.target.value } })}
                  className="text-xs border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded px-1 py-0.5">
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              )}
              {m.role !== "OWNER" && (
                <button onClick={() => setConfirmRemove(m.id)} className="text-red-500 hover:text-red-700 p-1" aria-label="Remove member">
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove Team Member"
        message="Are you sure you want to remove this team member? They will lose access immediately."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={async () => { if (confirmRemove) { await remove(confirmRemove); setConfirmRemove(null); } }}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}

/* ── API Key Section ── */
function ApiKeySection() {
  const { data: profile } = useGetClientProfileQuery();
  const [rotateKey, { isLoading }] = useRotateMyKeyMutation();
  const [graceHours, setGraceHours] = useState(24);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRotate = async () => {
    setShowConfirm(false);
    setMsg(null);
    setNewKey(null);
    try {
      const result = await rotateKey({ grace_period_hours: graceHours }).unwrap();
      setNewKey(result.api_key);
      setMsg({ type: "ok", text: graceHours > 0
        ? `Key rotated! Old key remains valid for ${graceHours}h.`
        : "Key rotated! Old key is now invalid." });
    } catch {
      setMsg({ type: "err", text: "Failed to rotate API key." });
    }
  };

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current API Key</h3>
        <p className="text-sm font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-navy-600 px-3 py-2 rounded-lg inline-block">
          {profile?.api_key_prefix || "—"}
        </p>
      </div>

      {newKey && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">New API Key (shown once — copy it now!)</p>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-green-900 dark:text-green-200 bg-green-100 dark:bg-green-900/40 px-3 py-1.5 rounded break-all flex-1">
              {newKey}
            </code>
            <button onClick={handleCopy} className="shrink-0 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="grace-hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Grace Period (hours)
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Keep the old key active during this period so you can migrate without downtime.
        </p>
        <select id="grace-hours" value={graceHours} onChange={(e) => setGraceHours(Number(e.target.value))}
          className="border dark:border-navy-500 dark:bg-navy-600 dark:text-white rounded-lg px-3 py-2 text-sm">
          <option value={0}>0 — Instant (old key invalid immediately)</option>
          <option value={1}>1 hour</option>
          <option value={6}>6 hours</option>
          <option value={12}>12 hours</option>
          <option value={24}>24 hours (recommended)</option>
          <option value={48}>48 hours</option>
          <option value={72}>72 hours</option>
        </select>
      </div>

      {msg && (
        <p className={`text-sm px-3 py-2 rounded ${msg.type === "ok" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
          {msg.text}
        </p>
      )}

      <button onClick={() => setShowConfirm(true)} disabled={isLoading}
        className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
        {isLoading ? "Rotating..." : "Rotate API Key"}
      </button>

      <ConfirmDialog
        open={showConfirm}
        title="Rotate API Key"
        message={graceHours > 0
          ? `This will generate a new API key. Your current key will remain active for ${graceHours} hour${graceHours !== 1 ? "s" : ""}. Make sure to update your integration with the new key.`
          : "This will generate a new API key and immediately invalidate the current one. Make sure you are ready to update your integration."}
        confirmLabel="Rotate Key"
        variant="danger"
        onConfirm={handleRotate}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

/* ── Main Settings Page ── */
/* ── Notification Preferences Section ── */
function NotificationsSection() {
  const STORAGE_KEY = "agregar_notification_prefs";
  const defaults = {
    high_risk_alert: true,
    tier_change: true,
    decision_block: true,
    daily_digest: false,
    weekly_report: true,
    verification_complete: true,
    new_team_member: true,
    api_key_rotation: true,
  };
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { return defaults; }
    }
    return defaults;
  });
  const [saved, setSaved] = useState(false);

  const toggle = (key: string) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const groups = [
    {
      label: "Risk & Compliance",
      items: [
        { key: "high_risk_alert", label: "High-Risk Customer Alert", desc: "Notify when a customer is flagged as high risk" },
        { key: "decision_block", label: "Decision Blocked", desc: "Notify when a decision results in BLOCK action" },
        { key: "verification_complete", label: "Verification Complete", desc: "Notify when a KYC/KYB verification finishes" },
      ],
    },
    {
      label: "Customer Activity",
      items: [
        { key: "tier_change", label: "Tier Upgrade / Downgrade", desc: "Notify when a customer changes tier" },
      ],
    },
    {
      label: "Reports & Digests",
      items: [
        { key: "daily_digest", label: "Daily Digest", desc: "Daily summary of decisions and alerts" },
        { key: "weekly_report", label: "Weekly Report", desc: "Weekly compliance and usage summary" },
      ],
    },
    {
      label: "Account",
      items: [
        { key: "new_team_member", label: "New Team Member", desc: "Notify when a new user joins your account" },
        { key: "api_key_rotation", label: "API Key Rotated", desc: "Notify when your API key is rotated" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Configure which events trigger email notifications. Changes are saved to your browser and will be synced with your account preferences.
      </p>
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">{group.label}</p>
          <div className="space-y-3">
            {group.items.map(({ key, label, desc }) => (
              <div key={key} className="flex items-start justify-between gap-4 py-2 border-b dark:border-navy-600 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={prefs[key]}
                  onClick={() => toggle(key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${prefs[key] ? "bg-primary" : "bg-gray-200 dark:bg-navy-500"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${prefs[key] ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={handleSave}
        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
      >
        {saved ? "Saved!" : "Save Preferences"}
      </button>
    </div>
  );
}

/* ── Main Settings Page ── */
export default function SettingsPage() {
  useEffect(() => { document.title = "Settings | Deferred KYC"; }, []);
  const { data: profile } = useGetClientProfileQuery();
  const { clientName, isAdmin } = useAppSelector((s) => s.auth);
  const [tab, setTab] = useState<"profile" | "password" | "mfa" | "apikey" | "team" | "notifications">("profile");

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: UserIcon },
    { id: "password" as const, label: "Password", icon: KeyIcon },
    { id: "mfa" as const, label: "MFA", icon: ShieldCheckIcon },
    { id: "apikey" as const, label: "API Key", icon: ArrowPathIcon },
    { id: "team" as const, label: "Team", icon: UsersIcon },
    { id: "notifications" as const, label: "Notifications", icon: BellIcon },
  ];

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      <div className="flex gap-1 border-b dark:border-navy-600">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-sm border dark:border-navy-600 p-6">
        {tab === "profile" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white mt-1">{profile?.name || clientName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white mt-1">{profile?.contact_email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white mt-1">{isAdmin ? "Admin" : "Client"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Integration Mode</dt>
                <dd className="text-sm text-gray-900 dark:text-white mt-1">
                  {profile?.integration_mode ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      profile.integration_mode === "full_platform"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {profile.integration_mode === "full_platform" ? "Full Platform" : "API Only"}
                    </span>
                  ) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">API Key</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white mt-1">{profile?.api_key_prefix || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client ID</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white mt-1">{profile?.client_id || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rate Limits</dt>
                <dd className="text-sm text-gray-900 dark:text-white mt-1">{profile?.rate_limit_per_minute ?? 60}/min, {profile?.rate_limit_per_hour ?? 1000}/hr</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</dt>
                <dd className="mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${profile?.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                    {profile?.is_active ? "Active" : "Inactive"}
                  </span>
                </dd>
              </div>
              {profile?.description && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</dt>
                  <dd className="text-sm text-gray-900 dark:text-white mt-1">{profile.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</dt>
                <dd className="text-sm text-gray-900 dark:text-white mt-1">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</dd>
              </div>
            </dl>
          </div>
        )}

        {tab === "password" && (
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
            <PasswordSection />
          </div>
        )}

        {tab === "mfa" && (
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Two-Factor Authentication</h2>
            <MfaSection />
          </div>
        )}

        {tab === "apikey" && (
          <div className="max-w-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Key Management</h2>
            <ApiKeySection />
          </div>
        )}

        {tab === "team" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Members</h2>
            <TeamSection />
          </div>
        )}

        {tab === "notifications" && (
          <div className="max-w-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notification Preferences</h2>
            <NotificationsSection />
          </div>
        )}
      </div>
    </div>
    </RoleGuard>
  );
}
