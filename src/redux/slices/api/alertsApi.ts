import { baseApi } from "./baseApi";
import type {
  Paginated,
  Alert,
  AlertListItem,
  AlertNoteType,
  AlertPriority,
  AlertStatus,
  AlertResolution,
  MutationResponse,
  EscalateAlertResponse,
} from "@/types/api";

export interface ListAlertsParams {
  page?: number;
  page_size?: number;
  status?: AlertStatus | AlertStatus[];
  priority?: AlertPriority | AlertPriority[];
  assigned_to?: string;
  customer_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: "alert_timestamp" | "risk_score" | "priority";
  sort_order?: "asc" | "desc";
}

/** Backend `/alerts` adds a `total_pages` field on top of the standard envelope. */
export type AlertListResponse = Paginated<AlertListItem> & { total_pages?: number };

export const alertsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listAlerts: b.query<AlertListResponse, ListAlertsParams>({
      query: (params) => ({ url: "/alerts", params }),
      providesTags: (result) => [
        { type: "Alert", id: "LIST" },
        ...(result?.items ?? []).map((a) => ({ type: "Alert" as const, id: a.alert_id })),
      ],
    }),
    getAlert: b.query<Alert, string>({
      query: (alert_id) => `/alerts/${alert_id}`,
      providesTags: (_r, _e, id) => [{ type: "Alert", id }],
    }),
    updateAlert: b.mutation<
      MutationResponse,
      { alert_id: string; status?: AlertStatus; assigned_to?: string; notes?: string }
    >({
      query: ({ alert_id, ...body }) => ({
        url: `/alerts/${alert_id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { alert_id }) => [
        { type: "Alert", id: alert_id },
        { type: "Alert", id: "LIST" },
        "Analytics",
      ],
    }),
    assignAlert: b.mutation<MutationResponse, { alert_id: string; analyst_id: string; notes?: string }>({
      query: ({ alert_id, ...body }) => ({
        url: `/alerts/${alert_id}/assign`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { alert_id }) => [{ type: "Alert", id: alert_id }],
    }),
    addAlertNote: b.mutation<
      MutationResponse,
      { alert_id: string; note: string; note_type?: AlertNoteType }
    >({
      query: ({ alert_id, ...body }) => ({
        url: `/alerts/${alert_id}/notes`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { alert_id }) => [{ type: "Alert", id: alert_id }],
    }),
    resolveAlert: b.mutation<
      MutationResponse,
      { alert_id: string; resolution: AlertResolution; resolution_notes: string; sar_filed?: boolean }
    >({
      query: ({ alert_id, ...body }) => ({
        url: `/alerts/${alert_id}/resolve`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { alert_id }) => [
        { type: "Alert", id: alert_id },
        { type: "Alert", id: "LIST" },
        "Analytics",
      ],
    }),
    // Agent action: send a KYC document-verification link for the alert's customer.
    // status ∈ created | skipped_existing | no_destination.
    requestAlertVerification: b.mutation<
      { status: string; verification_id?: string; destination?: string; delivered: boolean; message: string },
      { alert_id: string; destination?: string }
    >({
      query: ({ alert_id, ...body }) => ({
        url: `/alerts/${alert_id}/request-verification`,
        method: "POST",
        body,
      }),
    }),
    // Self-assign: idempotent if already owned, 409 if owned by someone else.
    claimAlert: b.mutation<MutationResponse, string>({
      query: (alert_id) => ({ url: `/alerts/${alert_id}/claim`, method: "POST" }),
      invalidatesTags: (_r, _e, alert_id) => [{ type: "Alert", id: alert_id }],
    }),
    // Atomic: creates a case, links the alert, OPEN→INVESTIGATING→ESCALATED in
    // one commit. Idempotent on the backend. Returns the (created/existing) case.
    escalateAlert: b.mutation<
      EscalateAlertResponse,
      { alert_id: string; reason: string; assignee_id?: string }
    >({
      query: ({ alert_id, ...body }) => ({
        url: `/alerts/${alert_id}/escalate`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { alert_id }) => [
        { type: "Alert", id: alert_id },
        { type: "Alert", id: "LIST" },
        { type: "Case", id: "LIST" },
        "Analytics",
      ],
    }),
  }),
});

export const {
  useListAlertsQuery,
  useGetAlertQuery,
  useUpdateAlertMutation,
  useAssignAlertMutation,
  useClaimAlertMutation,
  useRequestAlertVerificationMutation,
  useAddAlertNoteMutation,
  useResolveAlertMutation,
  useEscalateAlertMutation,
} = alertsApi;
