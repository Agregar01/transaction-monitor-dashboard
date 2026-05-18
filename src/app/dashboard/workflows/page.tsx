"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  useListWorkflowsQuery,
  useCreateWorkflowMutation,
  useDeleteWorkflowMutation,
  usePublishWorkflowMutation,
  useUnpublishWorkflowMutation,
  useArchiveWorkflowMutation,
  useCloneWorkflowMutation,
} from "@/redux/slices/api/workflowsApi";
import { SkeletonTable } from "@/components/Skeleton";
import ConfirmDialog from "@/components/ConfirmDialog";
import { showToast } from "@/components/Toast";
import RoleGuard from "@/components/RoleGuard";
import {
  PlusIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  CheckCircleIcon,
  PauseCircleIcon,
  ArrowPathIcon,
  LockClosedIcon,
  PencilSquareIcon,
  CubeTransparentIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const ENTITY_COLORS: Record<string, string> = {
  INDIVIDUAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  BUSINESS: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DRAFT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  INACTIVE: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  ARCHIVED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data: unknown }).data;
    if (data && typeof data === "object" && "detail" in data) {
      return String((data as { detail: unknown }).detail);
    }
  }
  return "An unexpected error occurred";
}

const PAGE_SIZE = 20;

export default function WorkflowsPage() {
  useEffect(() => {
    document.title = "Workflow Builder | Deferred KYC";
  }, []);

  const [entityFilter, setEntityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Clone modal state
  const [cloneTarget, setCloneTarget] = useState<{ id: string; code: string } | null>(null);
  const [cloneCode, setCloneCode] = useState("");

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Archive confirmation state
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [entityFilter, statusFilter]);

  const { data, isLoading, isFetching, isError } = useListWorkflowsQuery({
    entity_type: entityFilter || undefined,
    status: statusFilter || undefined,
    search: searchQuery || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const [createWorkflow, { isLoading: isCreating }] = useCreateWorkflowMutation();
  const [deleteWorkflow] = useDeleteWorkflowMutation();
  const [publishWorkflow] = usePublishWorkflowMutation();
  const [unpublishWorkflow] = useUnpublishWorkflowMutation();
  const [archiveWorkflow] = useArchiveWorkflowMutation();
  const [cloneWorkflow, { isLoading: isCloning }] = useCloneWorkflowMutation();

  const workflows = data?.items || [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  // Create form state
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newEntity, setNewEntity] = useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL");
  const [newTarget, setNewTarget] = useState("");
  const [newTime, setNewTime] = useState("");

  const resetCreateForm = useCallback(() => {
    setNewCode("");
    setNewName("");
    setNewDesc("");
    setNewEntity("INDIVIDUAL");
    setNewTarget("");
    setNewTime("");
  }, []);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    resetCreateForm();
  }, [resetCreateForm]);

  const handleCreate = async () => {
    if (!newCode || !newName) return;
    try {
      await createWorkflow({
        code: newCode.toUpperCase().replace(/\s+/g, "_"),
        name: newName,
        description: newDesc || undefined,
        entity_type: newEntity,
        target_tier: newTarget || undefined,
        estimated_time: newTime || undefined,
      }).unwrap();
      closeCreateModal();
      showToast({ type: "success", title: "Created", message: "Workflow created successfully" });
    } catch (err) {
      showToast({ type: "error", title: "Create failed", message: getErrorMessage(err) });
    }
  };

  const handleClone = async () => {
    if (!cloneTarget || !cloneCode) return;
    try {
      await cloneWorkflow({
        workflowId: cloneTarget.id,
        new_code: cloneCode.toUpperCase().replace(/\s+/g, "_"),
      }).unwrap();
      setCloneTarget(null);
      setCloneCode("");
      showToast({ type: "success", title: "Cloned", message: "Workflow cloned successfully" });
    } catch (err) {
      showToast({ type: "error", title: "Clone failed", message: getErrorMessage(err) });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWorkflow(deleteTarget.id).unwrap();
      setDeleteTarget(null);
      showToast({ type: "success", title: "Deleted", message: "Workflow deleted" });
    } catch (err) {
      showToast({ type: "error", title: "Delete failed", message: getErrorMessage(err) });
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishWorkflow(id).unwrap();
      showToast({ type: "success", title: "Published", message: "Workflow is now active" });
    } catch (err) {
      showToast({ type: "error", title: "Publish failed", message: getErrorMessage(err) });
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await unpublishWorkflow(id).unwrap();
      showToast({ type: "success", title: "Unpublished", message: "Workflow is now inactive" });
    } catch (err) {
      showToast({ type: "error", title: "Unpublish failed", message: getErrorMessage(err) });
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveWorkflow(archiveTarget.id).unwrap();
      setArchiveTarget(null);
      showToast({ type: "success", title: "Archived", message: "Workflow archived" });
    } catch (err) {
      showToast({ type: "error", title: "Archive failed", message: getErrorMessage(err) });
    }
  };

  // Modal escape key + focus trap for create modal
  const createModalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showCreateModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCreateModal();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showCreateModal, closeCreateModal]);

  // Modal escape key for clone modal
  useEffect(() => {
    if (!cloneTarget) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setCloneTarget(null); setCloneCode(""); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [cloneTarget]);

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflow Builder</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Create and manage verification workflows for KYC and KYB processes
          </p>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-12 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-red-400 mb-3" />
          <p className="text-gray-900 dark:text-white font-medium">Failed to load workflows</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Please check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflow Builder</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Create and manage verification workflows for KYC and KYB processes
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Create Workflow
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3 flex-wrap items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search workflows..."
            className="w-full pl-9 pr-3 py-2 border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg text-sm bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Published</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <div className="flex rounded-lg border dark:border-navy-600 overflow-hidden">
          <button
            onClick={() => setEntityFilter("")}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              entityFilter === ""
                ? "bg-primary text-white"
                : "bg-white dark:bg-navy-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setEntityFilter("INDIVIDUAL")}
            className={`px-3 py-2 text-sm font-medium border-l dark:border-navy-600 transition-colors ${
              entityFilter === "INDIVIDUAL"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-navy-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
            }`}
          >
            KYC
          </button>
          <button
            onClick={() => setEntityFilter("BUSINESS")}
            className={`px-3 py-2 text-sm font-medium border-l dark:border-navy-600 transition-colors ${
              entityFilter === "BUSINESS"
                ? "bg-purple-600 text-white"
                : "bg-white dark:bg-navy-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600"
            }`}
          >
            KYB
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
        {isFetching && !isLoading && (
          <div className="px-6 py-1 bg-primary/10 flex items-center gap-2 text-xs text-primary">
            <ArrowPathIcon className="h-3 w-3 animate-spin" /> Updating...
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-800">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="px-6 py-3 font-medium">Workflow</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Tier Trigger</th>
                <th className="px-6 py-3 font-medium">Steps</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <SkeletonTable rows={5} cols={7} />
                  </td>
                </tr>
              ) : workflows.length > 0 ? (
                workflows.map((wf) => (
                  <tr
                    key={wf.id}
                    className={`border-t dark:border-navy-600 hover:bg-gray-50 dark:hover:bg-navy-600 ${
                      wf.is_system ? "bg-gray-50/50 dark:bg-navy-800/30" : ""
                    }`}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {wf.is_system && (
                          <LockClosedIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" title="System workflow" />
                        )}
                        <div>
                          <Link
                            href={`/dashboard/workflows/${wf.id}`}
                            className="font-medium text-gray-900 dark:text-white hover:text-primary dark:hover:text-primary transition-colors"
                          >
                            {wf.name}
                          </Link>
                          <p className="font-mono text-[10px] text-gray-400">{wf.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ENTITY_COLORS[wf.entity_type] || ""}`}>
                        {wf.entity_type === "INDIVIDUAL" ? "KYC" : "KYB"}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {wf.target_tier || "\u2014"}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
                        <CubeTransparentIcon className="h-3.5 w-3.5" />
                        {wf.step_count}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[wf.status] || ""}`}>
                        {wf.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-400">
                      {new Date(wf.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!wf.is_system && (
                          <Link
                            href={`/dashboard/workflows/${wf.id}`}
                            title="Edit"
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-navy-500 text-gray-400 hover:text-primary"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            setCloneTarget({ id: wf.id, code: wf.code });
                            setCloneCode(`${wf.code}_COPY`);
                          }}
                          title="Clone"
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-navy-500 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                        {!wf.is_system && (wf.status === "DRAFT" || wf.status === "INACTIVE") && (
                          <button
                            onClick={() => handlePublish(wf.id)}
                            title="Publish"
                            className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-600"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        {!wf.is_system && wf.status === "ACTIVE" && (
                          <button
                            onClick={() => handleUnpublish(wf.id)}
                            title="Unpublish"
                            className="p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-400 hover:text-amber-600"
                          >
                            <PauseCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        {!wf.is_system && wf.status === "INACTIVE" && (
                          <button
                            onClick={() => setArchiveTarget({ id: wf.id, name: wf.name })}
                            title="Archive"
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
                          >
                            <ArchiveBoxIcon className="h-4 w-4" />
                          </button>
                        )}
                        {!wf.is_system && wf.status === "DRAFT" && (
                          <button
                            onClick={() => setDeleteTarget({ id: wf.id, name: wf.name })}
                            title="Delete"
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <CubeTransparentIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-navy-500 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No workflows found</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                      {searchQuery
                        ? `No results for "${searchQuery}". Try adjusting your search.`
                        : "Create a workflow to define your verification process"}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Create Workflow
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-3 border-t dark:border-navy-600 bg-gray-50 dark:bg-navy-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-navy-600 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-navy-600 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-wf-title"
          onClick={(e) => { if (e.target === e.currentTarget) closeCreateModal(); }}
        >
          <div ref={createModalRef} className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6 w-full max-w-md shadow-xl">
            <h2 id="create-wf-title" className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Workflow</h2>
            <div className="space-y-3">
              <div>
                <label htmlFor="wf-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                <input
                  id="wf-code"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                  placeholder="CW_001"
                  className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Unique identifier. Letters, numbers, and underscores only.</p>
              </div>
              <div>
                <label htmlFor="wf-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  id="wf-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Custom Verification Flow"
                  className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="wf-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  id="wf-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe what this workflow does..."
                  rows={2}
                  className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="wf-entity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity Type</label>
                <select
                  id="wf-entity"
                  value={newEntity}
                  onChange={(e) => { setNewEntity(e.target.value as "INDIVIDUAL" | "BUSINESS"); setNewTarget(""); }}
                  className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm bg-white dark:bg-navy-800"
                >
                  <option value="INDIVIDUAL">Individual (KYC)</option>
                  <option value="BUSINESS">Business (KYB)</option>
                </select>
              </div>
              <div>
                <label htmlFor="wf-tier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Tier</label>
                <select
                  id="wf-tier"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm bg-white dark:bg-navy-800"
                >
                  <option value="">None</option>
                  {newEntity === "INDIVIDUAL" ? (
                    <>
                      <option value="T1">T1 -- Minimum KYC</option>
                      <option value="T2">T2 -- Standard KYC</option>
                      <option value="T3">T3 -- Enhanced KYC</option>
                    </>
                  ) : (
                    <>
                      <option value="B1">B1 -- Basic KYB</option>
                      <option value="B2">B2 -- Standard KYB</option>
                      <option value="B3">B3 -- Enhanced KYB</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label htmlFor="wf-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Time</label>
                <input
                  id="wf-time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="2-5 minutes"
                  className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeCreateModal}
                className="px-4 py-2 border dark:border-navy-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-navy-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newCode || !newName || isCreating}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {cloneTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clone-wf-title"
          onClick={(e) => { if (e.target === e.currentTarget) { setCloneTarget(null); setCloneCode(""); } }}
        >
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6 w-full max-w-sm shadow-xl">
            <h2 id="clone-wf-title" className="text-lg font-bold text-gray-900 dark:text-white mb-2">Clone Workflow</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Cloning <span className="font-mono font-semibold">{cloneTarget.code}</span>. Enter a code for the new workflow.
            </p>
            <label htmlFor="clone-code" className="sr-only">New workflow code</label>
            <input
              id="clone-code"
              value={cloneCode}
              onChange={(e) => setCloneCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
              placeholder="CW_001"
              className="w-full border dark:border-navy-600 dark:bg-navy-800 dark:text-white rounded-lg px-3 py-2 text-sm font-mono mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setCloneTarget(null); setCloneCode(""); }}
                className="px-4 py-2 border dark:border-navy-600 rounded-lg text-sm dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleClone}
                disabled={!cloneCode || isCloning}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isCloning ? "Cloning..." : "Clone"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Workflow"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone. Only draft workflows can be deleted.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Archive Confirmation */}
      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive Workflow"
        message={`Are you sure you want to archive "${archiveTarget?.name}"? Archived workflows cannot be published again.`}
        confirmLabel="Archive"
        variant="warning"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
    </RoleGuard>
  );
}
