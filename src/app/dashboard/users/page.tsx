"use client";

import { useState } from "react";
import {
  useListUsersQuery,
  useListRolesQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserRolesMutation,
} from "@/redux/slices/api/authApi";
import { SkeletonTable } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import type { User } from "@/types/api";

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const { data: allRoles } = useListRolesQuery();
  const [createUser, { isLoading }] = useCreateUserMutation();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const toggleRole = (name: string) =>
    setSelectedRoles((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name],
    );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser({
        email,
        password,
        full_name: fullName || undefined,
        roles: selectedRoles.length > 0 ? selectedRoles : undefined,
      }).unwrap();
      showToast({ type: "success", title: "User created", message: email });
      onClose();
    } catch (err) {
      showToast({ type: "error", title: "Create failed", message: errorMessage(err) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white dark:bg-navy-700 rounded-xl shadow-xl p-6 max-w-md w-full space-y-4"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create user</h2>
        <input
          required
          type="email"
          aria-label="Email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        />
        <input
          aria-label="Full name (optional)"
          placeholder="Full name (optional)"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        />
        <input
          required
          type="password"
          aria-label="Password (min 12 chars)"
          placeholder="Password (min 12 chars)"
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        />
        {allRoles && allRoles.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Roles
            </p>
            <div className="flex flex-wrap gap-2">
              {allRoles.map((r) => (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => toggleRole(r.name)}
                  className={`px-2.5 py-1 text-xs rounded-lg ${
                    selectedRoles.includes(r.name)
                      ? "bg-primary text-white"
                      : "border border-gray-200 dark:border-navy-500 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {isLoading ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { data: allRoles } = useListRolesQuery();
  const [updateUser, { isLoading: saving }] = useUpdateUserMutation();
  const [updateRoles, { isLoading: savingRoles }] = useUpdateUserRolesMutation();

  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [active, setActive] = useState(user.active ?? true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles);

  const toggleRole = (name: string) =>
    setSelectedRoles((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name],
    );

  const onSave = async () => {
    try {
      const nameChanged = fullName !== (user.full_name ?? "");
      const activeChanged = active !== (user.active ?? true);
      if (nameChanged || activeChanged) {
        await updateUser({
          user_id: user.user_id,
          full_name: nameChanged ? fullName : undefined,
          active: activeChanged ? active : undefined,
        }).unwrap();
      }

      const rolesChanged =
        selectedRoles.length !== user.roles.length ||
        selectedRoles.some((r) => !user.roles.includes(r));
      if (rolesChanged) {
        await updateRoles({ user_id: user.user_id, roles: selectedRoles }).unwrap();
      }

      showToast({ type: "success", title: "Updated", message: user.email });
      onClose();
    } catch (err) {
      showToast({ type: "error", title: "Update failed", message: errorMessage(err) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl p-6 max-w-md w-full space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit user</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
        </div>
        <input
          aria-label="Full name"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
        {allRoles && allRoles.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Roles
            </p>
            <div className="flex flex-wrap gap-2">
              {allRoles.map((r) => (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => toggleRole(r.name)}
                  className={`px-2.5 py-1 text-xs rounded-lg ${
                    selectedRoles.includes(r.name)
                      ? "bg-primary text-white"
                      : "border border-gray-200 dark:border-navy-500 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || savingRoles}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {saving || savingRoles ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { data, isLoading, error } = useListUsersQuery();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Users &amp; Roles
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage analyst accounts and role assignments.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600"
        >
          + New user
        </button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={4} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
          Failed to load users.
        </div>
      ) : !data || data.length === 0 ? (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No users configured.
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Full name</th>
                <th className="px-4 py-2 text-left">Active</th>
                <th className="px-4 py-2 text-left">Roles</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.map((u) => (
                <tr key={u.user_id} className="hover:bg-gray-50 dark:hover:bg-navy-600">
                  <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-2">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">
                    {u.active ? (
                      <span className="text-green-600">● active</span>
                    ) : (
                      <span className="text-gray-400">○ inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        u.roles.map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary"
                          >
                            {r}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setEditing(u)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <CreateUserModal onClose={() => setCreating(false)} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
