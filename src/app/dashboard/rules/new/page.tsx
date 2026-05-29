"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import RuleBuilderForm from "@/components/RuleBuilderForm";
import type { Rule } from "@/types/api";

export default function NewRulePage() {
  const router = useRouter();

  const onSuccess = (rule: Rule) => {
    router.push(`/dashboard/rules/${rule.rule_id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/rules"
          className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
        >
          ← Rules
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          Create rule
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          New rules start in DRAFT and must be promoted to SHADOW → PRODUCTION before they affect
          live decisions.
        </p>
      </div>

      <RuleBuilderForm
        onSuccess={onSuccess}
        onCancel={() => router.push("/dashboard/rules")}
      />
    </div>
  );
}
