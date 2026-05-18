"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppSelector } from "@/redux/store";
import {
  useListTeamMembersQuery,
  useInviteTeamMemberMutation,
  useUpdateTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useResendInviteMutation,
  useGetClientProfileQuery,
} from "@/redux/slices/api/usersApi";
import { useGetComplianceSummaryQuery } from "@/redux/slices/api/complianceApi";
import {
  useListVendorConfigsQuery,
  useUpsertVendorConfigMutation,
  useDeleteVendorConfigMutation,
  type VerificationType,
  type VendorName,
} from "@/redux/slices/api/vendorConfigApi";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import ClientGuard from "@/components/ClientGuard";
import RoleGuard from "@/components/RoleGuard";
import {
  UsersIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  ServerStackIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  ClockIcon,
  CpuChipIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

export default function ClientAdminPage() {
  const { clientId } = useAppSelector((s) => s.auth);

  useEffect(() => {
    document.title = "Admin Dashboard | Deferred KYC";
  }, []);

  const { data: members, isLoading: membersLoading } = useListTeamMembersQuery();
  const { data: profile, isLoading: profileLoading } = useGetClientProfileQuery();
  const { data: summary } = useGetComplianceSummaryQuery(
    { client_id: clientId! },
    { skip: !clientId }
  );
  const [invite] = useInviteTeamMemberMutation();
  const [update] = useUpdateTeamMemberMutation();
  const [remove] = useRemoveTeamMemberMutation();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "OPERATIONS" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);
  const [resend] = useResendInviteMutation();

  // Vendor config state
  const { data: vendorConfigs, isLoading: vendorLoading } = useListVendorConfigsQuery();
  const [upsertVendor] = useUpsertVendorConfigMutation();
  const [deleteVendor] = useDeleteVendorConfigMutation();
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState<{
    verification_type: VerificationType;
    vendor_name: VendorName;
    api_key: string;
    api_url: string;
    priority: number;
  }>({
    verification_type: "IDENTITY",
    vendor_name: "agregar",
    api_key: "",
    api_url: "",
    priority: 1,
  });
  const [vendorSaving, setVendorSaving] = useState(false);
  const [confirmDeleteVendor, setConfirmDeleteVendor] = useState<{ id: string; label: string } | null>(null);

  const VERIFICATION_TYPE_LABELS: Record<VerificationType, string> = {
    IDENTITY: "Identity",
    AML_SCREENING: "AML Screening",
    BUSINESS_REGISTRY: "Business Registry",
    ADDRESS_VERIFICATION: "Address Verification",
  };

  const VENDOR_LABELS: Record<VendorName, string> = {
    agregar: "Agregar (Managed)",
    nia: "NIA (Ghana)",
    smile_identity: "Smile Identity",
    qoreid: "QoreID",
    youverify: "YouVerify",
    jumio: "Jumio",
    world_check: "World-Check",
    comply_advantage: "ComplyAdvantage",
    seon: "SEON",
    custom: "Custom",
  };

  const handleSaveVendor = async () => {
    setVendorSaving(true);
    try {
      await upsertVendor({
        verification_type: vendorForm.verification_type,
        vendor_name: vendorForm.vendor_name,
        api_key: vendorForm.api_key || undefined,
        api_url: vendorForm.api_url || undefined,
        priority: vendorForm.priority,
        is_active: true,
      }).unwrap();
      showToast({ type: "success", title: "Saved", message: "Vendor config saved" });
      setShowVendorForm(false);
      setVendorForm({ verification_type: "IDENTITY", vendor_name: "agregar", api_key: "", api_url: "", priority: 1 });
    } catch {
      showToast({ type: "error", title: "Error", message: "Failed to save vendor config" });
    } finally {
      setVendorSaving(false);
    }
  };

  const handleDeleteVendor = async () => {
    if (!confirmDeleteVendor) return;
    try {
      await deleteVendor(confirmDeleteVendor.id).unwrap();
      showToast({ type: "success", title: "Removed", message: "Vendor config removed" });
      setConfirmDeleteVendor(null);
    } catch {
      showToast({ type: "error", title: "Error", message: "Failed to remove vendor config" });
    }
  };

  const activeCount = members?.filter((m) => m.is_active).length || 0;
  const adminCount = members?.filter((m) => m.role === "ADMIN" || m.role === "OWNER").length || 0;
  const mfaCount = members?.filter((m) => m.mfa_enabled).length || 0;

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.name) {
      showToast({ type: "error", title: "Validation", message: "Email and name are required" });
      return;
    }
    setInviteLoading(true);
    try {
      await invite(inviteForm).unwrap();
      showToast({ type: "success", title: "Invited", message: `${inviteForm.name} has been invited` });
      setInviteForm({ email: "", name: "", role: "OPERATIONS" });
      setShowInvite(false);
    } catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      const message = detail === "User with this email already exists"
        ? "This email is already registered on your team."
        : detail || "Failed to invite team member";
      showToast({ type: "error", title: "Error", message });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (userId: string, name: string) => {
    try {
      await resend(userId).unwrap();
      showToast({ type: "success", title: "Resent", message: `Invitation resent to ${name}` });
    } catch {
      showToast({ type: "error", title: "Error", message: "Failed to resend invitation" });
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

  const kycWorkflows = [
    { id: "W1", name: "Basic ID Verification", tiers: "T0→T1" },
    { id: "W2", name: "Document Verification", tiers: "T1→T2" },
    { id: "W3", name: "Enhanced Due Diligence", tiers: "T2→T3" },
    { id: "W4", name: "Periodic Re-verification", tiers: "Any" },
    { id: "W5", name: "Step-up Verification", tiers: "Any" },
  ];

  const kybWorkflows = [
    { id: "BW1", name: "Business Registration", tiers: "B0→B1" },
    { id: "BW2", name: "Director Verification", tiers: "B1→B2" },
    { id: "BW3", name: "Financial Due Diligence", tiers: "B2→B3" },
    { id: "BW4", name: "Enhanced Business Review", tiers: "Any" },
  ];

  return (
    <ClientGuard>
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your team, configure workflows, and view platform settings
        </p>
      </div>

      {/* Stat Cards — 5 across */}
      {membersLoading ? (
        <SkeletonStats count={5} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Team Members</p>
              <UsersIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{members?.length || 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{activeCount} active</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Admins</p>
              <ShieldCheckIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-amber-500 mt-1">{adminCount}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Full access</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">MFA Enabled</p>
              <KeyIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-green-500 mt-1">{mfaCount}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{members?.length ? Math.round((mfaCount / members.length) * 100) : 0}% adoption</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Decisions (30d)</p>
              <ServerStackIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-blue-500 mt-1">{summary?.total_decisions || 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{summary?.flagged_decisions || 0} flagged</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Risk Score</p>
              <ArrowPathIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-red-500 mt-1">{summary?.average_risk_score?.toFixed(1) || "—"}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{summary?.high_risk_customers || 0} high risk</p>
          </div>
        </div>
      )}

      {/* Two-column: Team Table (2/3) + Config Sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Team Management Table */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Team Members ({members?.length || 0})</h2>
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <UserPlusIcon className="h-3.5 w-3.5" aria-hidden="true" /> Invite
            </button>
          </div>

          {showInvite && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-navy-800 border-b border-gray-200 dark:border-navy-600">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  type="email"
                  placeholder="Email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Full name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
                />
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
                >
                  <option value="OPERATIONS">Operations</option>
                  <option value="COMPLIANCE">Compliance</option>
                  <option value="RISK">Risk Analyst</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="EXECUTIVE">Executive</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={inviteLoading}
                  className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {inviteLoading ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </div>
          )}

          {membersLoading ? (
            <SkeletonTable rows={5} cols={7} />
          ) : !Array.isArray(members) || !members.length ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">No team members found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Email</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">MFA</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                      <td className="px-4 py-2.5 text-gray-900 dark:text-white font-medium">{member.name}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{member.email}</td>
                      <td className="px-4 py-2.5">
                        {editingId === member.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="px-1.5 py-0.5 text-[10px] border border-gray-200 dark:border-navy-600 rounded bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
                            >
                              <option value="OPERATIONS">Operations</option>
                              <option value="COMPLIANCE">Compliance</option>
                              <option value="RISK">Risk Analyst</option>
                              <option value="SUPERVISOR">Supervisor</option>
                              <option value="EXECUTIVE">Executive</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                            <button onClick={() => handleUpdateRole(member.id)} className="text-green-600 hover:text-green-700">
                              <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                              <XCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            member.role === "OWNER"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : member.role === "ADMIN"
                              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                              : member.role === "SUPERVISOR"
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                              : member.role === "COMPLIANCE"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              : member.role === "RISK"
                              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                              : member.role === "EXECUTIVE"
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          }`}>
                            {member.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {!member.invite_accepted ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            <ClockIcon className="h-3 w-3" aria-hidden="true" /> Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(member.id, member.is_active)}
                            className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded cursor-pointer ${
                              member.is_active
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {member.is_active ? "Active" : "Inactive"}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {member.mfa_enabled ? (
                          <span className="text-green-600 dark:text-green-400 text-[10px] font-medium">On</span>
                        ) : (
                          <span className="text-gray-400 text-[10px]">Off</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {!member.invite_accepted ? (
                            <button
                              onClick={() => handleResendInvite(member.id, member.name)}
                              className="text-gray-400 hover:text-primary transition-colors"
                              title="Resend invite"
                            >
                              <EnvelopeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              onClick={() => { setEditingId(member.id); setEditRole(member.role); }}
                              className="text-gray-400 hover:text-primary transition-colors"
                              title="Edit role"
                            >
                              <PencilSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmRemove({ id: member.id, name: member.name })}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove"
                          >
                            <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
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

        {/* Config Sidebar */}
        <div className="space-y-5">
          {/* Platform Config */}
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-navy-600">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Platform Config</h2>
            </div>
            {profileLoading ? (
              <SkeletonTable rows={4} cols={2} />
            ) : profile ? (
              <div className="p-4 space-y-2">
                {Object.entries(profile).slice(0, 8).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-navy-600 last:border-0">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{key.replace(/_/g, " ")}</span>
                    <span className="text-[10px] font-medium text-gray-900 dark:text-white font-mono">
                      {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value || "—").slice(0, 20)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-gray-400 text-xs">Unable to load.</div>
            )}
          </div>

          {/* Verification Vendor Configuration */}
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CpuChipIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Verification Vendors</h2>
              </div>
              <button
                onClick={() => setShowVendorForm(!showVendorForm)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <PlusIcon className="h-3 w-3" aria-hidden="true" /> Add
              </button>
            </div>

            {showVendorForm && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-navy-800 border-b border-gray-200 dark:border-navy-600 space-y-2">
                <select
                  value={vendorForm.verification_type}
                  onChange={(e) => setVendorForm({ ...vendorForm, verification_type: e.target.value as VerificationType })}
                  className="w-full px-2 py-1.5 text-[10px] border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
                >
                  <option value="IDENTITY">Identity</option>
                  <option value="AML_SCREENING">AML Screening</option>
                  <option value="BUSINESS_REGISTRY">Business Registry</option>
                  <option value="ADDRESS_VERIFICATION">Address Verification</option>
                </select>
                <select
                  value={vendorForm.vendor_name}
                  onChange={(e) => setVendorForm({ ...vendorForm, vendor_name: e.target.value as VendorName })}
                  className="w-full px-2 py-1.5 text-[10px] border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
                >
                  <option value="agregar">Agregar (Managed)</option>
                  <option value="smile_identity">Smile Identity</option>
                  <option value="qoreid">QoreID</option>
                  <option value="youverify">YouVerify</option>
                  <option value="jumio">Jumio</option>
                  <option value="world_check">World-Check</option>
                  <option value="comply_advantage">ComplyAdvantage</option>
                  <option value="seon">SEON</option>
                  <option value="custom">Custom</option>
                </select>
                {vendorForm.vendor_name !== "agregar" && (
                  <input
                    type="password"
                    placeholder="API Key (encrypted at rest)"
                    value={vendorForm.api_key}
                    onChange={(e) => setVendorForm({ ...vendorForm, api_key: e.target.value })}
                    className="w-full px-2 py-1.5 text-[10px] border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
                  />
                )}
                <input
                  type="url"
                  placeholder="API URL (optional)"
                  value={vendorForm.api_url}
                  onChange={(e) => setVendorForm({ ...vendorForm, api_url: e.target.value })}
                  className="w-full px-2 py-1.5 text-[10px] border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
                />
                <select
                  value={vendorForm.priority}
                  onChange={(e) => setVendorForm({ ...vendorForm, priority: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 text-[10px] border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white"
                >
                  <option value={1}>Priority 1 — Primary (used first)</option>
                  <option value={2}>Priority 2 — Fallback (used if primary fails)</option>
                  <option value={3}>Priority 3 — Secondary fallback</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveVendor}
                    disabled={vendorSaving}
                    className="flex-1 py-1 text-[10px] font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {vendorSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setShowVendorForm(false)}
                    className="flex-1 py-1 text-[10px] font-medium bg-gray-200 dark:bg-navy-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-navy-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {vendorLoading ? (
              <div className="p-4 text-center text-gray-400 text-xs">Loading…</div>
            ) : !Array.isArray(vendorConfigs) || !vendorConfigs.length ? (
              <div className="p-4 text-center text-gray-400 text-xs">
                No vendor overrides — all verifications handled by Agregar.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-navy-600">
                {vendorConfigs.map((vc) => (
                  <div key={vc.id} className="px-4 py-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-gray-900 dark:text-white truncate">
                        {VERIFICATION_TYPE_LABELS[vc.verification_type]}
                      </p>
                      <p className="text-[9px] text-gray-400 truncate">
                        {VENDOR_LABELS[vc.vendor_name]}
                        {vc.api_key_masked && <span className="ml-1 font-mono">{vc.api_key_masked}</span>}
                      </p>
                    </div>
                    <span
                      className={`text-[8px] font-medium px-1 py-0.5 rounded flex-shrink-0 ${
                        vc.priority === 1
                          ? "bg-primary/10 text-primary dark:text-orange-300"
                          : "bg-gray-100 dark:bg-navy-600 text-gray-500 dark:text-gray-400"
                      }`}
                      title={vc.priority === 1 ? "Primary provider" : `Fallback (priority ${vc.priority})`}
                    >
                      {vc.priority === 1 ? "Primary" : `P${vc.priority}`}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${vc.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                    <button
                      onClick={() => setConfirmDeleteVendor({ id: vc.id, label: VERIFICATION_TYPE_LABELS[vc.verification_type] })}
                      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Remove"
                    >
                      <TrashIcon className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-column: KYC Workflows + KYB Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">KYC Workflows</h2>
            <Link href="/dashboard/workflows" className="text-[10px] text-primary hover:text-primary-600">Manage &rarr;</Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-navy-600">
            {kycWorkflows.map((wf) => (
              <div key={wf.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 dark:bg-primary/20 text-primary font-bold text-[10px]">
                    {wf.id}
                  </span>
                  <span className="text-xs text-gray-900 dark:text-white font-medium">{wf.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-gray-100 dark:bg-navy-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                    {wf.tiers}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">KYB Workflows</h2>
            <Link href="/dashboard/workflows" className="text-[10px] text-primary hover:text-primary-600">Manage &rarr;</Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-navy-600">
            {kybWorkflows.map((wf) => (
              <div key={wf.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                    {wf.id}
                  </span>
                  <span className="text-xs text-gray-900 dark:text-white font-medium">{wf.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-gray-100 dark:bg-navy-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                    {wf.tiers}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
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

      <ConfirmDialog
        open={!!confirmDeleteVendor}
        title="Remove Vendor Config"
        message={`Remove the ${confirmDeleteVendor?.label} vendor configuration? Verifications for this type will fall back to Agregar.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleDeleteVendor}
        onCancel={() => setConfirmDeleteVendor(null)}
      />
    </div>
    </RoleGuard>
    </ClientGuard>
  );
}
