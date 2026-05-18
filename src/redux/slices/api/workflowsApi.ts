import { baseApi } from "./baseApi";
import type {
  WorkflowListResponse,
  WorkflowDetail,
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  ListWorkflowsParams,
} from "@/types/api";

export const workflowsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listWorkflows: builder.query<WorkflowListResponse, ListWorkflowsParams>({
      query: (params) => {
        const qs = new URLSearchParams();
        if (params.entity_type) qs.set("entity_type", params.entity_type);
        if (params.status) qs.set("status", params.status);
        if (params.search) qs.set("search", params.search);
        if (params.page) qs.set("page", String(params.page));
        if (params.page_size) qs.set("page_size", String(params.page_size));
        return `/workflows/?${qs.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Workflow" as const,
                id,
              })),
              { type: "Workflow", id: "LIST" },
            ]
          : [{ type: "Workflow", id: "LIST" }],
    }),

    getWorkflow: builder.query<WorkflowDetail, string>({
      query: (id) => `/workflows/${id}/`,
      providesTags: (_result, _error, id) => [{ type: "Workflow", id }],
    }),

    createWorkflow: builder.mutation<WorkflowDetail, WorkflowCreateRequest>({
      query: (body) => ({
        url: "/workflows/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Workflow", id: "LIST" }],
    }),

    updateWorkflow: builder.mutation<
      WorkflowDetail,
      { id: string } & WorkflowUpdateRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/workflows/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Workflow", id },
        { type: "Workflow", id: "LIST" },
      ],
    }),

    publishWorkflow: builder.mutation<{ status: string; version: number }, string>({
      query: (id) => ({
        url: `/workflows/${id}/publish/`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Workflow", id },
        { type: "Workflow", id: "LIST" },
      ],
    }),

    unpublishWorkflow: builder.mutation<{ status: string }, string>({
      query: (id) => ({
        url: `/workflows/${id}/unpublish/`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Workflow", id },
        { type: "Workflow", id: "LIST" },
      ],
    }),

    archiveWorkflow: builder.mutation<{ status: string }, string>({
      query: (id) => ({
        url: `/workflows/${id}/archive/`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Workflow", id },
        { type: "Workflow", id: "LIST" },
      ],
    }),

    deleteWorkflow: builder.mutation<{ status: string }, string>({
      query: (id) => ({
        url: `/workflows/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Workflow", id: "LIST" }],
    }),

    addWorkflowStep: builder.mutation<
      unknown,
      {
        workflowId: string;
        name: string;
        step_type: string;
        description?: string;
        is_required?: boolean;
        timeout_hours?: number;
        config?: Record<string, unknown>;
      }
    >({
      query: ({ workflowId, ...body }) => ({
        url: `/workflows/${workflowId}/steps/`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { workflowId }) => [
        { type: "Workflow", id: workflowId },
      ],
    }),

    updateWorkflowStep: builder.mutation<
      unknown,
      {
        workflowId: string;
        stepId: string;
        name?: string;
        step_type?: string;
        description?: string;
        is_required?: boolean;
        timeout_hours?: number;
        config?: Record<string, unknown>;
      }
    >({
      query: ({ workflowId, stepId, ...body }) => ({
        url: `/workflows/${workflowId}/steps/${stepId}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { workflowId }) => [
        { type: "Workflow", id: workflowId },
      ],
    }),

    deleteWorkflowStep: builder.mutation<
      unknown,
      { workflowId: string; stepId: string }
    >({
      query: ({ workflowId, stepId }) => ({
        url: `/workflows/${workflowId}/steps/${stepId}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { workflowId }) => [
        { type: "Workflow", id: workflowId },
      ],
    }),

    reorderWorkflowSteps: builder.mutation<
      unknown,
      { workflowId: string; step_ids: string[] }
    >({
      query: ({ workflowId, ...body }) => ({
        url: `/workflows/${workflowId}/steps/reorder/`,
        method: "POST",
        body,
      }),
      // Optimistic update — reorder steps instantly in cache
      async onQueryStarted({ workflowId, step_ids }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          workflowsApi.util.updateQueryData("getWorkflow", workflowId, (draft) => {
            const stepMap = new Map(draft.steps.map((s) => [s.id, s]));
            draft.steps = step_ids
              .map((id, idx) => {
                const step = stepMap.get(id);
                if (step) return { ...step, step_order: idx + 1 };
                return null;
              })
              .filter(Boolean) as typeof draft.steps;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (_result, _error, { workflowId }) => [
        { type: "Workflow", id: workflowId },
      ],
    }),

    cloneWorkflow: builder.mutation<
      WorkflowDetail,
      { workflowId: string; new_code: string }
    >({
      query: ({ workflowId, new_code }) => ({
        url: `/workflows/${workflowId}/clone/?new_code=${encodeURIComponent(new_code)}`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "Workflow", id: "LIST" }],
    }),
  }),
});

export const {
  useListWorkflowsQuery,
  useGetWorkflowQuery,
  useCreateWorkflowMutation,
  useUpdateWorkflowMutation,
  usePublishWorkflowMutation,
  useUnpublishWorkflowMutation,
  useArchiveWorkflowMutation,
  useDeleteWorkflowMutation,
  useAddWorkflowStepMutation,
  useUpdateWorkflowStepMutation,
  useDeleteWorkflowStepMutation,
  useReorderWorkflowStepsMutation,
  useCloneWorkflowMutation,
} = workflowsApi;
