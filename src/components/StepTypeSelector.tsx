"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";

export interface StepTypeInfo {
  value: string;
  label: string;
  description: string;
  category: string;
}

export const STEP_TYPE_CATEGORIES: { label: string; key: string }[] = [
  { label: "Verification", key: "verification" },
  { label: "Assessment", key: "assessment" },
  { label: "Business", key: "business" },
  { label: "Review", key: "review" },
];

export const ALL_STEP_TYPES: StepTypeInfo[] = [
  // Verification
  { value: "DOCUMENT_VERIFICATION", label: "Document Verification", description: "Verify identity documents (ID, passport, etc.)", category: "verification" },
  { value: "IDENTITY_CHECK", label: "Identity Check", description: "Cross-reference identity against databases", category: "verification" },
  { value: "LIVENESS_CHECK", label: "Liveness Check", description: "Verify the person is physically present", category: "verification" },
  { value: "FACE_MATCH", label: "Face Match", description: "Match selfie against document photo", category: "verification" },
  { value: "VIDEO_KYC", label: "Video KYC", description: "Live video call with a verification agent", category: "verification" },
  { value: "ADDRESS_VERIFICATION", label: "Address Verification", description: "Verify residential or business address", category: "verification" },
  // Assessment
  { value: "CREDIT_CHECK", label: "Credit Check", description: "Run credit bureau assessment", category: "assessment" },
  { value: "RISK_ASSESSMENT", label: "Risk Assessment", description: "Evaluate overall risk profile", category: "assessment" },
  // Business
  { value: "BUSINESS_REGISTRATION_CHECK", label: "Business Registration", description: "Verify business registration documents", category: "business" },
  { value: "UBO_VERIFICATION", label: "UBO Verification", description: "Identify and verify ultimate beneficial owners", category: "business" },
  { value: "FINANCIAL_STATEMENT_REVIEW", label: "Financial Statement Review", description: "Review financial statements and records", category: "business" },
  // Review
  { value: "MANUAL_REVIEW", label: "Manual Review", description: "Queue for manual compliance officer review", category: "review" },
  { value: "SUPERVISOR_REVIEW", label: "Supervisor Review", description: "Escalate to supervisor for approval", category: "review" },
  { value: "AUTO_APPROVE", label: "Auto Approve", description: "Automatically approve if all prior steps pass", category: "review" },
];

const CATEGORY_COLORS: Record<string, string> = {
  verification: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  assessment: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  business: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  review: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
};

export const STEP_TYPE_COLOR_MAP: Record<string, string> = {};
for (const st of ALL_STEP_TYPES) {
  STEP_TYPE_COLOR_MAP[st.value] = CATEGORY_COLORS[st.category] || "bg-gray-100 text-gray-700";
}

export function getStepTypeLabel(value: string): string {
  const found = ALL_STEP_TYPES.find((s) => s.value === value);
  return found ? found.label : value.replace(/_/g, " ");
}

export function getStepTypeCategory(value: string): string {
  const found = ALL_STEP_TYPES.find((s) => s.value === value);
  return found ? found.category : "review";
}

interface StepTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (stepType: string) => void;
  entityType?: string;
}

export default function StepTypeSelector({ open, onClose, onSelect, entityType }: StepTypeSelectorProps) {
  if (!open) return null;

  // Filter business steps for INDIVIDUAL entity type
  const filteredTypes = entityType === "INDIVIDUAL"
    ? ALL_STEP_TYPES.filter((s) => s.category !== "business")
    : ALL_STEP_TYPES;

  const filteredCategories = entityType === "INDIVIDUAL"
    ? STEP_TYPE_CATEGORIES.filter((c) => c.key !== "business")
    : STEP_TYPE_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-navy-600">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Step</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Select a verification step type to add to the workflow</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-600 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {filteredCategories.map((cat) => {
            const stepsInCategory = filteredTypes.filter((s) => s.category === cat.key);
            if (stepsInCategory.length === 0) return null;
            return (
              <div key={cat.key}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {cat.label}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stepsInCategory.map((step) => (
                    <button
                      key={step.value}
                      onClick={() => {
                        onSelect(step.value);
                        onClose();
                      }}
                      className="flex flex-col items-start text-left p-3 rounded-lg border dark:border-navy-600 hover:border-primary dark:hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${CATEGORY_COLORS[cat.key] || ""}`}>
                          {step.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                        {step.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
