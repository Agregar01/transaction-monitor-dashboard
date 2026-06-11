"use client";

import Link from "next/link";
import { useListInstitutionsQuery } from "@/redux/slices/api/institutionsApi";
import StatCard from "@/components/StatCard";
import HeroActionBand, { type ActionItem } from "@/components/HeroActionBand";
import { SkeletonStats } from "@/components/Skeleton";
import {
  BuildingOffice2Icon,
  CheckBadgeIcon,
  NoSymbolIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

/**
 * Agregar super-admin landing — tenant oversight across ALL institutions, with
 * NO single-jurisdiction casework (that lives inside each tenant). Counts come
 * from the institutions list (one cheap call per status). Cross-tenant
 * transaction/alert analytics is a net-new backend ask (flagged) — when the
 * aggregate endpoint lands it slots in as a second KPI row here.
 */
export default function PlatformOverview({ displayName }: { displayName: string }) {
  const pending = useListInstitutionsQuery({ status: "PENDING_APPROVAL", page_size: 1 });
  const active = useListInstitutionsQuery({ status: "ACTIVE", page_size: 1 });
  const suspended = useListInstitutionsQuery({ status: "SUSPENDED", page_size: 1 });
  const registered = useListInstitutionsQuery({ status: "REGISTERED", page_size: 1 });
  const recent = useListInstitutionsQuery({ page_size: 8 });

  const pendingCount = pending.data?.total ?? 0;
  const loading = pending.isLoading && active.isLoading;

  const hero: ActionItem[] = [
    {
      count: pendingCount,
      label: "institutions",
      sublabel: "awaiting approval",
      href: "/dashboard/institutions",
    },
    {
      count: registered.data?.total ?? 0,
      label: "awaiting email",
      sublabel: "unverified signups",
      href: "/dashboard/institutions",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Platform Control Tower</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {displayName} · Agregar Admin · Tenant oversight across all institutions
        </p>
      </div>

      <HeroActionBand
        items={hero}
        clearMessage={pendingCount === 0 ? "No institutions awaiting approval." : undefined}
      />

      {loading ? (
        <SkeletonStats count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active institutions"
            value={active.data?.total ?? 0}
            subtitle="live tenants"
            icon={<BuildingOffice2Icon className="h-8 w-8" />}
            color="text-emerald-600"
            href="/dashboard/institutions"
          />
          <StatCard
            title="Pending approval"
            value={pendingCount}
            subtitle="need your review"
            icon={<ClockIcon className="h-8 w-8" />}
            color="text-amber-600"
            href="/dashboard/institutions"
          />
          <StatCard
            title="Suspended"
            value={suspended.data?.total ?? 0}
            subtitle="access blocked"
            icon={<NoSymbolIcon className="h-8 w-8" />}
            color="text-red-600"
            href="/dashboard/institutions"
          />
          <StatCard
            title="Awaiting email"
            value={registered.data?.total ?? 0}
            subtitle="unverified signups"
            icon={<CheckBadgeIcon className="h-8 w-8" />}
            color="text-gray-500"
            href="/dashboard/institutions"
          />
        </div>
      )}

      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent institutions</h2>
          <Link href="/dashboard/institutions" className="text-sm text-primary hover:text-primary-600 font-medium">
            Manage all &rarr;
          </Link>
        </div>
        {recent.isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : (recent.data?.items?.length ?? 0) === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">No institutions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Institution</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Jurisdiction</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {(recent.data?.items ?? []).map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{i.name}</p>
                      <p className="text-xs text-gray-400">{i.contact_email}</p>
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                      {i.institution_type.replace(/_/g, " ").toLowerCase()}
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{i.jurisdiction_code}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-navy-600 text-gray-600 dark:text-gray-300">
                        {i.status.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Cross-tenant transaction &amp; alert analytics are coming once the aggregate endpoint lands —
        this view stays tenant-oversight only by design.
      </p>
    </div>
  );
}
