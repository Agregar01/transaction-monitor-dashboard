"use client";

import { useState } from "react";
import { useListUsersQuery, useGetUserRolesQuery } from "@/redux/slices/api/authApi";
import { SkeletonTable } from "@/components/Skeleton";

function RolesModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading, error } = useGetUserRolesQuery(userId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-navy-700 rounded-xl shadow-xl p-6 max-w-md w-full space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assigned roles</h2>
          {data && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {data.email}
            </p>
          )}
        </div>
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : error || !data ? (
          <p className="text-sm text-red-600">Failed to load roles.</p>
        ) : data.roles.length === 0 ? (
          <p className="text-sm text-gray-400">No roles assigned.</p>
        ) : (
          <ul className="space-y-1">
            {data.roles.map((r) => (
              <li
                key={r}
                className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium"
              >
                {r}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { data, isLoading, error } = useListUsersQuery();
  const [viewing, setViewing] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Users &amp; Roles</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Read-only directory. User creation and role assignment stay in the backend CLI for v1.
        </p>
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
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Full name</th>
                <th className="px-4 py-3 text-left">Active</th>
                <th className="px-4 py-3 text-left">Roles</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
              {data.map((u) => (
                <tr key={u.user_id} className="hover:bg-gray-50 dark:hover:bg-navy-600">
                  <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {u.active ? (
                      <span className="text-green-600">●</span>
                    ) : (
                      <span className="text-gray-400">○</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        u.roles.slice(0, 3).map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary"
                          >
                            {r}
                          </span>
                        ))
                      )}
                      {u.roles.length > 3 && (
                        <span className="text-[10px] text-gray-500">+{u.roles.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setViewing(u.user_id)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View roles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && <RolesModal userId={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
