import { baseApi } from "./baseApi";
import type {
  Paginated,
  PendingApproval,
  ApprovalStatus,
  ApprovalAction,
  MutationResponse,
} from "@/types/api";

export interface ListApprovalsParams {
  page?: number;
  page_size?: number;
  status?: ApprovalStatus;
  action_type?: ApprovalAction;
}

export const approvalsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listApprovals: b.query<Paginated<PendingApproval>, ListApprovalsParams>({
      query: (params) => ({ url: "/approvals", params }),
      providesTags: (result) => [
        { type: "Approval", id: "LIST" },
        ...(result?.items ?? []).map((a) => ({ type: "Approval" as const, id: a.id })),
      ],
    }),
    approveAction: b.mutation<MutationResponse, { id: string; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `/approvals/${id}/approve`, method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Approval", id },
        { type: "Approval", id: "LIST" },
      ],
    }),
    rejectAction: b.mutation<MutationResponse, { id: string; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `/approvals/${id}/reject`, method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Approval", id },
        { type: "Approval", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListApprovalsQuery,
  useApproveActionMutation,
  useRejectActionMutation,
} = approvalsApi;
