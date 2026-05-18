import { baseApi } from "./baseApi";
import type {
  Paginated,
  Alert,
  AlertPriority,
  AlertStatus,
  AlertResolution,
  MutationResponse,
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
  sort?: string;
}

export const alertsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listAlerts: b.query<Paginated<Alert>, ListAlertsParams>({
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
      { alert_id: string; note: string; note_type?: "investigation" | "follow_up" | "documentation" | "escalation" }
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
      ],
    }),
  }),
});

export const {
  useListAlertsQuery,
  useGetAlertQuery,
  useUpdateAlertMutation,
  useAssignAlertMutation,
  useAddAlertNoteMutation,
  useResolveAlertMutation,
} = alertsApi;
