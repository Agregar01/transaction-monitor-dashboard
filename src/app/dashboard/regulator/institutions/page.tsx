"use client";

import { useEffect } from "react";
import { useListClientsQuery } from "@/redux/slices/api/clientsApi";
import { SkeletonTable } from "@/components/Skeleton";
import RegulatorGuard from "@/components/RegulatorGuard";
import { BuildingOffice2Icon } from "@heroicons/react/24/outline";

export default function InstitutionMonitoringPage() {
  useEffect(() => {
    document.title = "Institution Monitoring | Deferred KYC";
  }, []);

  const { data: clientsData, isLoading } = useListClientsQuery({ page_size: 50 });

  const clients = clientsData?.items || [];

  return (
    <RegulatorGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Institution Monitoring</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Detailed view of all regulated institutions and their compliance status
          </p>
        </div>

        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Regulated Institutions ({clients.length})
            </h2>
          </div>
          {isLoading ? (
            <SkeletonTable rows={6} cols={6} />
          ) : !clients.length ? (
            <div className="px-6 py-12 text-center text-gray-400 text-sm">No institutions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Institution</th>
                    <th className="px-6 py-3 font-medium">Contact Email</th>
                    <th className="px-6 py-3 font-medium">Integration</th>
                    <th className="px-6 py-3 font-medium">Plan</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {clients.map((client) => (
                    <tr key={client.client_id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <BuildingOffice2Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                            {client.description && (
                              <p className="text-xs text-gray-400 truncate max-w-[200px]">{client.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{client.contact_email || "—"}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-navy-600 text-gray-600 dark:text-gray-300">
                          {client.integration_mode === "full_platform" ? "Full Platform" : "API Only"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">
                        free
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                            client.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {client.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(client.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RegulatorGuard>
  );
}
