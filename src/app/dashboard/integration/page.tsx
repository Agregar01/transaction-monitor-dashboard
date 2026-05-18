"use client";

import { useEffect } from "react";
import { useGetIntegrationStatusQuery } from "@/redux/slices/api/clientsApi";
import ClientGuard from "@/components/ClientGuard";
import RoleGuard from "@/components/RoleGuard";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/solid";
import Link from "next/link";

const STEP_HINTS: Record<string, { hint: string; link?: string; linkLabel?: string }> = {
  api_key: {
    hint: "Your API key is active and ready to use.",
    link: "/dashboard/settings",
    linkLabel: "Manage API Key",
  },
  first_api_call: {
    hint: "Make your first API call using the code examples in the docs.",
    link: "/dashboard/docs",
    linkLabel: "View Docs",
  },
  first_customer: {
    hint: "Register your first customer via POST /customers.",
    link: "/dashboard/docs",
    linkLabel: "See Quick Start",
  },
  first_decision: {
    hint: "Evaluate your first event via POST /decisions/evaluate.",
    link: "/dashboard/docs",
    linkLabel: "See Quick Start",
  },
  webhook_configured: {
    hint: "Set up a webhook to receive real-time notifications.",
    link: "/dashboard/webhooks",
    linkLabel: "Configure Webhooks",
  },
};

export default function IntegrationStatusPage() {
  useEffect(() => {
    document.title = "Integration Status | Deferred KYC";
  }, []);

  const { data, isLoading, error } = useGetIntegrationStatusQuery();

  return (
    <ClientGuard>
      <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Integration Status
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Track your progress integrating the Deferred KYC Engine
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-8 text-center">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-8 text-center text-red-500">
            Failed to load integration status
          </div>
        ) : data ? (
          <>
            {/* Progress bar */}
            <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {data.completed} of {data.total} steps completed
                </span>
                <span className="text-sm font-bold text-primary">
                  {data.progress_percent}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-navy-600 rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-500"
                  style={{ width: `${data.progress_percent}%` }}
                />
              </div>
              {data.progress_percent === 100 && (
                <p className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium">
                  All integration steps complete! You&apos;re all set.
                </p>
              )}
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              {data.steps.map((step, index) => {
                const hint = STEP_HINTS[step.id];
                return (
                  <div
                    key={step.id}
                    className={`bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5 flex items-start gap-4 transition-colors ${
                      step.completed
                        ? "border-green-200 dark:border-green-900/50"
                        : ""
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {step.completed ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-6 w-6 text-gray-300 dark:text-navy-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                          Step {index + 1}
                        </span>
                      </div>
                      <p
                        className={`font-medium ${
                          step.completed
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {step.completed ? step.detail : hint?.hint}
                      </p>
                    </div>
                    {!step.completed && hint?.link && (
                      <Link
                        href={hint.link}
                        className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        {hint.linkLabel}
                        <ArrowRightIcon className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
      </RoleGuard>
    </ClientGuard>
  );
}
