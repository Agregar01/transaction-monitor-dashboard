"use client";

import { useAppSelector } from "@/redux/store";
import DarkModeToggle from "@/components/DarkModeToggle";

export default function SettingsPage() {
  const { email, fullName, roles, jurisdictionCode, jurisdictionDisplayName } = useAppSelector(
    (s) => s.auth,
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your account, preferences, and active jurisdiction.
        </p>
      </div>

      <section className="bg-white dark:bg-navy-700 rounded-xl shadow-sm border border-gray-100 dark:border-navy-600 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Profile
        </h2>
        <dl className="grid grid-cols-3 gap-y-3 text-sm">
          <dt className="col-span-1 text-gray-500 dark:text-gray-400">Full name</dt>
          <dd className="col-span-2 text-gray-900 dark:text-white">{fullName || "—"}</dd>
          <dt className="col-span-1 text-gray-500 dark:text-gray-400">Email</dt>
          <dd className="col-span-2 text-gray-900 dark:text-white">{email || "—"}</dd>
          <dt className="col-span-1 text-gray-500 dark:text-gray-400">Roles</dt>
          <dd className="col-span-2 flex flex-wrap gap-1">
            {roles.length === 0 ? (
              <span className="text-gray-400">none</span>
            ) : (
              roles.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary"
                >
                  {r}
                </span>
              ))
            )}
          </dd>
          <dt className="col-span-1 text-gray-500 dark:text-gray-400">Jurisdiction</dt>
          <dd className="col-span-2 text-gray-900 dark:text-white">
            {jurisdictionCode ?? "—"}
            {jurisdictionDisplayName && (
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                ({jurisdictionDisplayName})
              </span>
            )}
          </dd>
        </dl>
      </section>

      <section className="bg-white dark:bg-navy-700 rounded-xl shadow-sm border border-gray-100 dark:border-navy-600 p-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Appearance
        </h2>
        <DarkModeToggle />
      </section>
    </div>
  );
}
