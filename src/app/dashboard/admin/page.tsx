"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/store";
import {
  useListTeamMembersQuery,
  useInviteTeamMemberMutation,
  useUpdateTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useGetClientProfileQuery,
} from "@/redux/slices/api/usersApi";
import { useGetComplianceSummaryQuery } from "@/redux/slices/api/complianceApi";
import StatCard from "@/components/StatCard";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import AdminGuard from "@/components/AdminGuard";
import {
  UsersIcon,
  UserPlusIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";

type Tab = "team" | "workflows" | "config";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("team");

  useEffect(() => {
    document.title = "Super Admin Console | Deferred KYC";
  }, []);

  const tabs: { key: Tab; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
    { key: "team", label: "Team Management", icon: UsersIcon },
    { key: "workflows", label: "Workflow Settings", icon: Cog6ToothIcon },
    { key: "config", label: "Platform Config", icon: ShieldCheckIcon },
  ];

  return (
    <AdminGuard>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin Console</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Agregar platform administration — manage team, workflows, and settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-navy-600">
        <nav className="flex gap-6" aria-label="Admin tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "team" && <TeamManagementTab />}
      {activeTab === "workflows" && <WorkflowSettingsTab />}
      {activeTab === "config" && <PlatformConfigTab />}
    </div>
    </AdminGuard>
  );
}

/* ── Team Management Tab ── */
function TeamManagementTab() {
  const { data: members, isLoading } = useListTeamMembersQuery();
  const [invite] = useInviteTeamMemberMutation();
  const [update] = useUpdateTeamMemberMutation();
  const [remove] = useRemoveTeamMemberMutation();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "viewer" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);

  const activeCount = members?.filter((m) => m.is_active).length || 0;
  const adminCount = members?.filter((m) => m.role === "admin").length || 0;
  const mfaCount = members?.filter((m) => m.mfa_enabled).length || 0;

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.name) {
      showToast({ type: "error", title: "Validation", message: "Email and name are required" });
      return;
    }
    try {
      await invite(inviteForm).unwrap();
      showToast({ type: "success", title: "Invited", message: `${inviteForm.name} has been invited` });
      setInviteForm({ email: "", name: "", role: "viewer" });
      setShowInvite(false);
    } catch {
      showToast({ type: "error", title: "Error", message: "Failed to invite team member" });
    }
  };

  const handleUpdateRole = async (userId: string) => {
    try {
      await update({ user_id: userId, body: { role: editRole } }).unwrap();
      showToast({ type: "success", title: "Updated", message: "Role updated successfully" });
      setEditingId(null);
    } catch {
      showToast({ type: "error", title: "Error", message: "Failed to update role" });
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      await remove(confirmRemove.id).unwrap();
      showToast({ type: "success", title: "Removed", message: `${confirmRemove.name} has been removed` });
      setConfirmRemove(null);
    } catch {
      showToast({ type: "error", title: "Error", message: "Failed to remove team member" });
    }
  };

  const handleToggleActive = async (userId: string, currentlyActive: boolean) => {
    try {
      await update({ user_id: userId, body: { is_active: !currentlyActive } }).unwrap();
      showToast({ type: "success", title: "Updated", message: currentlyActive ? "User deactivated" : "User activated" });
    } catch {
      showToast({ type: "error", title: "Error", message: "Failed to update user status" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {isLoading ? (
        <SkeletonStats count={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Members"
            value={members?.length || 0}
            subtitle={`${activeCount} active`}
            icon={<UsersIcon className="h-8 w-8" aria-hidden="true" />}
            color="text-primary"
          />
          <StatCard
            title="Admins"
            value={adminCount}
            subtitle="With full access"
            icon={<ShieldCheckIcon className="h-8 w-8" aria-hidden="true" />}
            color="text-amber-500"
          />
          <StatCard
            title="MFA Enabled"
            value={mfaCount}
            subtitle={`${members?.length ? Math.round((mfaCount / members.length) * 100) : 0}% adoption`}
            icon={<KeyIcon className="h-8 w-8" aria-hidden="true" />}
            color="text-green-500"
          />
        </div>
      )}

      {/* Invite Button + Form */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h2>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
            Invite Member
          </button>
        </div>

        {/* Invite Form */}
        {showInvite && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-navy-800 border-b border-gray-200 dark:border-navy-600">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="email"
                placeholder="Email address"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Full name"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
              />
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
              >
                <option value="viewer">Viewer</option>
                <option value="analyst">Analyst</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={handleInvite}
                className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Send Invite
              </button>
            </div>
          </div>
        )}

        {/* Members Table */}
        {isLoading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : !members?.length ? (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No team members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">MFA</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{member.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{member.email}</td>
                    <td className="px-6 py-4">
                      {editingId === member.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-200 dark:border-navy-600 rounded bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="analyst">Analyst</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button onClick={() => handleUpdateRole(member.id)} className="text-green-600 hover:text-green-700">
                            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                            <XCircleIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                          member.role === "admin"
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                            : member.role === "supervisor"
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            : member.role === "analyst"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}>
                          {member.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(member.id, member.is_active)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded cursor-pointer ${
                          member.is_active
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {member.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {member.mfa_enabled ? (
                        <span className="text-green-600 dark:text-green-400 text-xs font-medium">Enabled</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingId(member.id); setEditRole(member.role); }}
                          className="text-gray-400 hover:text-primary transition-colors"
                          title="Edit role"
                        >
                          <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => setConfirmRemove({ id: member.id, name: member.name })}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove member"
                        >
                          <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${confirmRemove?.name}? They will lose access immediately.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}

/* ── Workflow Settings Tab ── */
function WorkflowSettingsTab() {
  const kycWorkflows = [
    { id: "W1", name: "Basic ID Verification", tiers: "T0 → T1", description: "Name, DOB, Phone verification" },
    { id: "W2", name: "Document Verification", tiers: "T1 → T2", description: "Government ID + selfie match" },
    { id: "W3", name: "Enhanced Due Diligence", tiers: "T2 → T3", description: "Address proof, income, source of funds" },
    { id: "W4", name: "Periodic Re-verification", tiers: "Any", description: "Scheduled re-check for existing customers" },
    { id: "W5", name: "Step-up Verification", tiers: "Any", description: "Triggered by risk score increase" },
  ];

  const kybWorkflows = [
    { id: "BW1", name: "Business Registration", tiers: "B0 → B1", description: "Company registration number verification" },
    { id: "BW2", name: "Director Verification", tiers: "B1 → B2", description: "UBO + director KYC checks" },
    { id: "BW3", name: "Financial Due Diligence", tiers: "B2 → B3", description: "Financial statements, bank references" },
    { id: "BW4", name: "Enhanced Business Review", tiers: "Any", description: "Periodic or triggered business review" },
  ];

  return (
    <div className="space-y-6">
      {/* KYC Workflows */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">KYC Workflows</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Individual customer verification workflows</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-navy-600">
          {kycWorkflows.map((wf) => (
            <div key={wf.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="inline-block w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary font-bold text-sm flex items-center justify-center">
                  {wf.id}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{wf.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{wf.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono bg-gray-100 dark:bg-navy-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                  {wf.tiers}
                </span>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Active" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KYB Workflows */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">KYB Workflows</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Business entity verification workflows</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-navy-600">
          {kybWorkflows.map((wf) => (
            <div key={wf.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="inline-block w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center">
                  {wf.id}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{wf.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{wf.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono bg-gray-100 dark:bg-navy-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                  {wf.tiers}
                </span>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Active" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Policy Categories */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Policy Rule Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { code: "TXN", name: "Transaction", count: 8, color: "bg-blue-500" },
            { code: "BEH", name: "Behavioral", count: 5, color: "bg-purple-500" },
            { code: "RSK", name: "Risk Score", count: 6, color: "bg-red-500" },
            { code: "VEL", name: "Velocity", count: 7, color: "bg-amber-500" },
            { code: "GEO", name: "Geographic", count: 5, color: "bg-green-500" },
            { code: "ID", name: "Identity", count: 6, color: "bg-cyan-500" },
            { code: "DOC", name: "Document", count: 5, color: "bg-indigo-500" },
            { code: "BIZ", name: "Business", count: 7, color: "bg-pink-500" },
          ].map((cat) => (
            <div key={cat.code} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-navy-800">
              <span className={`w-3 h-3 rounded-full ${cat.color}`} />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{cat.code} &middot; {cat.count} rules</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Platform Config Tab ── */
function PlatformConfigTab() {
  const { data: profile, isLoading } = useGetClientProfileQuery();
  const { clientId } = useAppSelector((s) => s.auth);
  const { data: summary } = useGetComplianceSummaryQuery(
    { client_id: clientId! },
    { skip: !clientId }
  );

  return (
    <div className="space-y-6">
      {/* Client Profile */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Client Configuration</h2>
        {isLoading ? (
          <SkeletonTable rows={4} cols={2} />
        ) : profile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(profile).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-navy-600">
                <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{key.replace(/_/g, " ")}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                  {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value || "—")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Unable to load profile.</p>
        )}
      </div>

      {/* System Limits */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tier Limits Overview</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Daily Limit</th>
                <th className="px-4 py-3 font-medium">Monthly Limit</th>
                <th className="px-4 py-3 font-medium">Per-Txn Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {[
                { tier: "T0", type: "KYC", daily: "500", monthly: "2,000", perTxn: "200" },
                { tier: "T1", type: "KYC", daily: "5,000", monthly: "20,000", perTxn: "2,000" },
                { tier: "T2", type: "KYC", daily: "50,000", monthly: "200,000", perTxn: "20,000" },
                { tier: "T3", type: "KYC", daily: "Unlimited", monthly: "Unlimited", perTxn: "Unlimited" },
                { tier: "B0", type: "KYB", daily: "5,000", monthly: "20,000", perTxn: "2,000" },
                { tier: "B1", type: "KYB", daily: "50,000", monthly: "200,000", perTxn: "20,000" },
                { tier: "B2", type: "KYB", daily: "500,000", monthly: "2,000,000", perTxn: "200,000" },
                { tier: "B3", type: "KYB", daily: "Unlimited", monthly: "Unlimited", perTxn: "Unlimited" },
              ].map((row) => (
                <tr key={row.tier} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">{row.tier}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      row.type === "KYC" ? "bg-primary/10 text-primary" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    }`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.daily}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.monthly}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.perTxn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Stats */}
      {summary && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Period Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-navy-800">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_decisions}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Decisions</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-navy-800">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.flagged_decisions}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Flagged</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-navy-800">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.high_risk_customers}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">High Risk</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-navy-800">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.average_risk_score?.toFixed(1)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Risk Score</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
