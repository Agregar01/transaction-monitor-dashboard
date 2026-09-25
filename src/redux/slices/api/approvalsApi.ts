import { baseApi } from "./baseApi";
import type {
  PendingApproval,
  ApprovalStatus,
  ApprovalAction,
  MutationResponse,
} from "@/types/api";

/**
 * Backend `GET /api/v1/approvals` returns a bare list (no pagination
 * envelope). Filter param is `approval_status`, not `status`.
 */
export interface ListApprovalsParams {
  approval_status?: ApprovalStatus;
  action_type?: ApprovalAction;
}

/**
 * Tags refreshed after any approve/reject. Travel Rule approvals (TR_OVERRIDE_RELEASE,
 * TR_SCREENING_CLEAR, TR_PROFILE_VERSION, VASP_DD_APPROVAL) change record dispositions,
 * counterparty DD status and profiles, so those pages must not show cached data.
 */
export const APPROVAL_DECISION_INVALIDATES = [
  { type: "TravelRule" as const, id: "RECORDS" },
  { type: "TravelRule" as const, id: "MI" },
  "TravelRule" as const,
];

export const approvalsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listApprovals: b.query<PendingApproval[], ListApprovalsParams>({
      query: (params) => ({ url: "/approvals", params }),
      providesTags: (result) => [
        { type: "Approval", id: "LIST" },
        ...(result ?? []).map((a) => ({ type: "Approval" as const, id: a.id })),
      ],
    }),
    approveAction: b.mutation<MutationResponse, { id: string; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `/approvals/${id}/approve`, method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Approval", id },
        { type: "Approval", id: "LIST" },
        // Approvals gate STR/CTR filing + case advancement → analytics shift.
        "Analytics",
        { type: "STRReport", id: "LIST" },
        { type: "CTRReport", id: "LIST" },
        { type: "Case", id: "LIST" },
        ...APPROVAL_DECISION_INVALIDATES,
      ],
    }),
    rejectAction: b.mutation<MutationResponse, { id: string; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `/approvals/${id}/reject`, method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Approval", id },
        { type: "Approval", id: "LIST" },
        ...APPROVAL_DECISION_INVALIDATES,
      ],
    }),
  }),
});

export const {
  useListApprovalsQuery,
  useApproveActionMutation,
  useRejectActionMutation,
} = approvalsApi;
