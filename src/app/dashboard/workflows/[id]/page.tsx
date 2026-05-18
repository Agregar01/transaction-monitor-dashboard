"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useGetWorkflowQuery,
  useUpdateWorkflowMutation,
  useAddWorkflowStepMutation,
  useUpdateWorkflowStepMutation,
  useDeleteWorkflowStepMutation,
  useReorderWorkflowStepsMutation,
  usePublishWorkflowMutation,
  useUnpublishWorkflowMutation,
  useArchiveWorkflowMutation,
} from "@/redux/slices/api/workflowsApi";
import ConfirmDialog from "@/components/ConfirmDialog";
import StepTypeSelector, {
  getStepTypeLabel,
  STEP_TYPE_COLOR_MAP,
} from "@/components/StepTypeSelector";
import { showToast } from "@/components/Toast";
import AdminGuard from "@/components/AdminGuard";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  PauseCircleIcon,
  PencilIcon,
  LockClosedIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data: unknown }).data;
    if (data && typeof data === "object" && "detail" in data) {
      return String((data as { detail: unknown }).detail);
    }
  }
  return "An unexpected error occurred";
}

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DRAFT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  INACTIVE: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  ARCHIVED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const KYC_TIER_OPTIONS = [
  { value: "", label: "None" },
  { value: "T1", label: "T1 — Minimum KYC" },
  { value: "T2", label: "T2 — Standard KYC" },
  { value: "T3", label: "T3 — Enhanced KYC" },
];
const KYB_TIER_OPTIONS = [
  { value: "", label: "None" },
  { value: "B1", label: "B1 — Basic KYB" },
  { value: "B2", label: "B2 — Standard KYB" },
  { value: "B3", label: "B3 — Enhanced KYB" },
];

export default function WorkflowDetailPage() {
  const params = useParams();
  const workflowId = params.id as string;

  const { data: wf, isLoading, isError, error } = useGetWorkflowQuery(workflowId);
  const [updateWorkflow] = useUpdateWorkflowMutation();
  const [addStep, { isLoading: isAdding }] = useAddWorkflowStepMutation();
  const [updateStep] = useUpdateWorkflowStepMutation();
  const [deleteStep] = useDeleteWorkflowStepMutation();
  const [reorderSteps] = useReorderWorkflowStepsMutation();
  const [publishWorkflow, { isLoading: isPublishing }] = usePublishWorkflowMutation();
  const [unpublishWorkflow, { isLoading: isUnpublishing }] = useUnpublishWorkflowMutation();
  const [archiveWorkflow, { isLoading: isArchiving }] = useArchiveWorkflowMutation();

  // Confirmations
  const [stepToDelete, setStepToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Step type selector
  const [showStepTypeSelector, setShowStepTypeSelector] = useState(false);

  // Inline step editing
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStepName, setEditStepName] = useState("");
  const [editStepDesc, setEditStepDesc] = useState("");
  const [editStepTimeout, setEditStepTimeout] = useState("");

  useEffect(() => {
    if (wf) document.title = `${wf.code} - ${wf.name} | Deferred KYC`;
  }, [wf]);

  // Edit metadata state
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaName, setMetaName] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [metaTier, setMetaTier] = useState("");
  const [metaTime, setMetaTime] = useState("");

  useEffect(() => {
    if (wf) {
      setMetaName(wf.name);
      setMetaDesc(wf.description || "");
      setMetaTier(wf.target_tier || "");
      setMetaTime(wf.estimated_time || "");
    }
  }, [wf]);

  const saveMeta = async () => {
    if (!wf) return;
    try {
      await updateWorkflow({
        id: workflowId,
        name: metaName,
        description: metaDesc || undefined,
        target_tier: metaTier || undefined,
        estimated_time: metaTime || undefined,
      }).unwrap();
      setEditingMeta(false);
      showToast({ type: "success", title: "Saved", message: "Workflow details updated" });
    } catch (err) {
      showToast({ type: "error", title: "Save failed", message: getErrorMessage(err) });
    }
  };

  // Add step via StepTypeSelector
  const [selectedStepType, setSelectedStepType] = useState("");
  const [newStepName, setNewStepName] = useState("");
  const [newStepDesc, setNewStepDesc] = useState("");
  const [newStepRequired, setNewStepRequired] = useState(true);
  const [newStepTimeout, setNewStepTimeout] = useState("");

  const handleStepTypeSelected = (stepType: string) => {
    setSelectedStepType(stepType);
    setNewStepName(getStepTypeLabel(stepType));
    setNewStepDesc("");
    setNewStepRequired(true);
    setNewStepTimeout("");
  };

  const handleAddStep = async () => {
    if (!newStepName || !selectedStepType) return;
    try {
      await addStep({
        workflowId,
        name: newStepName,
        step_type: selectedStepType,
        description: newStepDesc || undefined,
        is_required: newStepRequired,
        timeout_hours: newStepTimeout ? parseInt(newStepTimeout, 10) || undefined : undefined,
      }).unwrap();
      setSelectedStepType("");
      setNewStepName("");
      setNewStepDesc("");
      setNewStepRequired(true);
      setNewStepTimeout("");
      showToast({ type: "success", title: "Step added", message: "New step added to workflow" });
    } catch (err) {
      showToast({ type: "error", title: "Add step failed", message: getErrorMessage(err) });
    }
  };

  // Inline step editing
  const startEditStep = (step: { id: string; name: string; description: string | null; timeout_hours: number | null }) => {
    setEditingStepId(step.id);
    setEditStepName(step.name);
    setEditStepDesc(step.description || "");
    setEditStepTimeout(step.timeout_hours ? String(step.timeout_hours) : "");
  };

  const saveStepEdit = async () => {
    if (!editingStepId || !editStepName) return;
    try {
      await updateStep({
        workflowId,
        stepId: editingStepId,
        name: editStepName,
        description: editStepDesc || undefined,
        timeout_hours: editStepTimeout ? parseInt(editStepTimeout, 10) || undefined : undefined,
      }).unwrap();
      setEditingStepId(null);
      showToast({ type: "success", title: "Step updated", message: "Step details saved" });
    } catch (err) {
      showToast({ type: "error", title: "Update failed", message: getErrorMessage(err) });
    }
  };

  // Move step up/down
  const moveStep = useCallback(
    async (stepId: string, direction: "up" | "down") => {
      if (!wf) return;
      const ids = wf.steps.map((s) => s.id);
      const idx = ids.indexOf(stepId);
      if (direction === "up" && idx > 0) {
        [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
      } else if (direction === "down" && idx < ids.length - 1) {
        [ids[idx + 1], ids[idx]] = [ids[idx], ids[idx + 1]];
      } else return;
      try {
        await reorderSteps({ workflowId, step_ids: ids }).unwrap();
      } catch (err) {
        showToast({ type: "error", title: "Reorder failed", message: getErrorMessage(err) });
      }
    },
    [wf, workflowId, reorderSteps]
  );

  // Toggle step required
  const toggleRequired = async (stepId: string, current: boolean) => {
    try {
      await updateStep({ workflowId, stepId, is_required: !current }).unwrap();
    } catch (err) {
      showToast({ type: "error", title: "Update failed", message: getErrorMessage(err) });
    }
  };

  // Delete step handler
  const handleDeleteStep = async () => {
    if (!stepToDelete) return;
    try {
      await deleteStep({ workflowId, stepId: stepToDelete.id }).unwrap();
      setStepToDelete(null);
      showToast({ type: "success", title: "Step removed", message: "Step deleted from workflow" });
    } catch (err) {
      showToast({ type: "error", title: "Delete failed", message: getErrorMessage(err) });
    }
  };

  // Publish / Unpublish / Archive
  const handlePublish = async () => {
    try {
      const res = await publishWorkflow(workflowId).unwrap();
      setShowPublishConfirm(false);
      showToast({ type: "success", title: "Published", message: `Workflow is now active (v${res.version})` });
    } catch (err) {
      setShowPublishConfirm(false);
      showToast({ type: "error", title: "Publish failed", message: getErrorMessage(err) });
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishWorkflow(workflowId).unwrap();
      setShowUnpublishConfirm(false);
      showToast({ type: "success", title: "Unpublished", message: "Workflow is now inactive" });
    } catch (err) {
      setShowUnpublishConfirm(false);
      showToast({ type: "error", title: "Unpublish failed", message: getErrorMessage(err) });
    }
  };

  const handleArchive = async () => {
    try {
      await archiveWorkflow(workflowId).unwrap();
      setShowArchiveConfirm(false);
      showToast({ type: "success", title: "Archived", message: "Workflow has been archived" });
    } catch (err) {
      setShowArchiveConfirm(false);
      showToast({ type: "error", title: "Archive failed", message: getErrorMessage(err) });
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-navy-600 rounded w-48" />
        <div className="h-64 bg-gray-200 dark:bg-navy-600 rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 space-y-3">
        <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-red-400" />
        <p className="text-red-600 dark:text-red-400 font-medium">Failed to load workflow</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{getErrorMessage(error)}</p>
        <Link href="/dashboard/workflows" className="inline-block mt-4 text-sm text-primary hover:underline">
          Back to workflows
        </Link>
      </div>
    );
  }

  if (!wf) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-gray-400">Workflow not found</p>
        <Link href="/dashboard/workflows" className="inline-block text-sm text-primary hover:underline">
          Back to workflows
        </Link>
      </div>
    );
  }

  const isReadOnly = wf.is_system;
  const tierOptions = wf.entity_type === "BUSINESS" ? KYB_TIER_OPTIONS : KYC_TIER_OPTIONS;

  return (
    <AdminGuard>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/workflows"
            aria-label="Back to workflows"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-600 text-gray-400"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{wf.code}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGES[wf.status] || STATUS_BADGES.DRAFT}`}>
                {wf.status === "ACTIVE" ? "Published" : wf.status}
              </span>
              {isReadOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-navy-600 dark:text-gray-400">
                  <LockClosedIcon className="h-3 w-3" /> System
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{wf.name}</p>
          </div>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            {(wf.status === "DRAFT" || wf.status === "INACTIVE") && wf.steps.length > 0 && (
              <button
                onClick={() => setShowPublishConfirm(true)}
                disabled={isPublishing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
              >
                <CheckCircleIcon className="h-4 w-4" />
                {isPublishing ? "Publishing..." : "Publish"}
              </button>
            )}
            {wf.status === "ACTIVE" && (
              <button
                onClick={() => setShowUnpublishConfirm(true)}
                disabled={isUnpublishing}
                className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm font-medium disabled:opacity-50"
              >
                <PauseCircleIcon className="h-4 w-4" />
                {isUnpublishing ? "..." : "Unpublish"}
              </button>
            )}
            {wf.status === "INACTIVE" && (
              <button
                onClick={() => setShowArchiveConfirm(true)}
                disabled={isArchiving}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium disabled:opacity-50"
              >
                <ArchiveBoxIcon className="h-4 w-4" />
                {isArchiving ? "..." : "Archive"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Metadata card */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Details</h2>
          {!isReadOnly && !editingMeta && (
            <button
              onClick={() => setEditingMeta(true)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <PencilIcon className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
        {editingMeta ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                <input
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Target Tier</label>
                <select
                  value={metaTier}
                  onChange={(e) => setMetaTier(e.target.value)}
                  className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm bg-white dark:bg-navy-800"
                >
                  {tierOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
              <textarea
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value)}
                rows={2}
                className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Estimated Time</label>
              <input
                value={metaTime}
                onChange={(e) => setMetaTime(e.target.value)}
                className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={saveMeta} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
                Save
              </button>
              <button onClick={() => setEditingMeta(false)} className="px-4 py-2 border dark:border-navy-600 rounded-lg text-sm dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400 text-xs">Entity Type</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {wf.entity_type === "INDIVIDUAL" ? "KYC (Individual)" : "KYB (Business)"}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Target Tier</span>
              <p className="font-mono font-medium text-gray-900 dark:text-white">{wf.target_tier || "\u2014"}</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Estimated Time</span>
              <p className="font-medium text-gray-900 dark:text-white">{wf.estimated_time || "\u2014"}</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Version</span>
              <p className="font-medium text-gray-900 dark:text-white">v{wf.version}</p>
            </div>
            {wf.description && (
              <div className="col-span-2 lg:col-span-4">
                <span className="text-gray-400 text-xs">Description</span>
                <p className="text-gray-700 dark:text-gray-300">{wf.description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            Steps ({wf.steps.length})
          </h2>
          {!isReadOnly && (
            <button onClick={() => setShowStepTypeSelector(true)} className="flex items-center gap-1 text-sm text-primary hover:underline">
              <PlusIcon className="h-4 w-4" /> Add Step
            </button>
          )}
        </div>

        {wf.steps.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No steps yet. Add steps to define the verification flow.</div>
        ) : (
          <div className="space-y-2">
            {wf.steps.map((step, idx) => (
              <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg border dark:border-navy-600 bg-gray-50 dark:bg-navy-800">
                {/* Order number */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold mt-0.5">
                  {idx + 1}
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  {editingStepId === step.id ? (
                    /* Inline edit form */
                    <div className="space-y-2">
                      <input
                        value={editStepName}
                        onChange={(e) => setEditStepName(e.target.value)}
                        className="w-full border dark:border-navy-600 dark:bg-navy-900 dark:text-white rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                      <input
                        value={editStepDesc}
                        onChange={(e) => setEditStepDesc(e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full border dark:border-navy-600 dark:bg-navy-900 dark:text-white rounded px-2 py-1 text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Timeout (hrs):</label>
                        <input
                          type="number"
                          value={editStepTimeout}
                          onChange={(e) => setEditStepTimeout(e.target.value)}
                          className="w-16 border dark:border-navy-600 dark:bg-navy-900 dark:text-white rounded px-2 py-1 text-xs"
                          min={1}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveStepEdit} className="px-3 py-1 bg-primary text-white rounded text-xs font-medium">Save</button>
                        <button onClick={() => setEditingStepId(null)} className="px-3 py-1 border dark:border-navy-600 rounded text-xs dark:text-gray-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{step.name}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${STEP_TYPE_COLOR_MAP[step.step_type] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
                        >
                          {getStepTypeLabel(step.step_type)}
                        </span>
                        {!step.is_required && <span className="text-[10px] text-gray-400 italic">optional</span>}
                        {step.timeout_hours && <span className="text-[10px] text-gray-400">{step.timeout_hours}h timeout</span>}
                      </div>
                      {step.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.description}</p>}
                    </>
                  )}
                </div>

                {/* Actions */}
                {!isReadOnly && editingStepId !== step.id && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => startEditStep(step)}
                      title="Edit step"
                      className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-navy-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleRequired(step.id, step.is_required)}
                      title={step.is_required ? "Mark optional" : "Mark required"}
                      className={`p-1.5 rounded text-xs ${
                        step.is_required
                          ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                          : "text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-600"
                      }`}
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveStep(step.id, "up")}
                      disabled={idx === 0}
                      className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-600 disabled:opacity-30"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveStep(step.id, "down")}
                      disabled={idx === wf.steps.length - 1}
                      className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-600 disabled:opacity-30"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setStepToDelete({ id: step.id, name: step.name })}
                      className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add step config form (shows after selecting a type from StepTypeSelector) */}
        {selectedStepType && (
          <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 dark:bg-primary/10">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Configure Step: <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ml-1 ${STEP_TYPE_COLOR_MAP[selectedStepType] || "bg-gray-100 text-gray-600"}`}>{getStepTypeLabel(selectedStepType)}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Step Name</label>
                <input
                  value={newStepName}
                  onChange={(e) => setNewStepName(e.target.value)}
                  className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={newStepRequired} onChange={(e) => setNewStepRequired(e.target.checked)} className="rounded" />
                  Required
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Timeout (hrs)</label>
                  <input
                    type="number"
                    value={newStepTimeout}
                    onChange={(e) => setNewStepTimeout(e.target.value)}
                    className="w-20 border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-2 py-1 text-sm"
                    min={1}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description (optional)</label>
                <input
                  value={newStepDesc}
                  onChange={(e) => setNewStepDesc(e.target.value)}
                  className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAddStep}
                disabled={!newStepName || isAdding}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isAdding ? "Adding..." : "Add Step"}
              </button>
              <button onClick={() => setSelectedStepType("")} className="px-4 py-2 border dark:border-navy-600 rounded-lg text-sm dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step Type Selector Modal */}
      <StepTypeSelector
        open={showStepTypeSelector}
        onClose={() => setShowStepTypeSelector(false)}
        onSelect={handleStepTypeSelected}
        entityType={wf.entity_type}
      />

      {/* Delete Step Confirmation */}
      <ConfirmDialog
        open={!!stepToDelete}
        title="Remove Step"
        message={`Are you sure you want to remove "${stepToDelete?.name}" from this workflow?`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleDeleteStep}
        onCancel={() => setStepToDelete(null)}
      />

      {/* Publish Confirmation */}
      <ConfirmDialog
        open={showPublishConfirm}
        title="Publish Workflow"
        message={`Publishing "${wf.name}" will make it available for use in the decision engine. This will increment the version number.`}
        confirmLabel="Publish"
        variant="warning"
        onConfirm={handlePublish}
        onCancel={() => setShowPublishConfirm(false)}
      />

      {/* Unpublish Confirmation */}
      <ConfirmDialog
        open={showUnpublishConfirm}
        title="Unpublish Workflow"
        message={`Unpublishing "${wf.name}" will deactivate it. It will no longer be used for new decisions.`}
        confirmLabel="Unpublish"
        variant="danger"
        onConfirm={handleUnpublish}
        onCancel={() => setShowUnpublishConfirm(false)}
      />

      {/* Archive Confirmation */}
      <ConfirmDialog
        open={showArchiveConfirm}
        title="Archive Workflow"
        message={`Archiving "${wf.name}" is permanent. Archived workflows cannot be re-activated.`}
        confirmLabel="Archive"
        variant="danger"
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </div>
    </AdminGuard>
  );
}
