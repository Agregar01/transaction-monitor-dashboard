import { baseApi } from "./baseApi";
import type {
  Paginated,
  Customer,
  CustomerBaseline,
  CustomerRiskProfile,
  CustomerTransactionsResponse,
  CustomerAlertsResponse,
} from "@/types/api";

export interface ListCustomersParams {
  page?: number;
  page_size?: number;
  risk_level?: string;
  customer_type?: string;
  country_code?: string;
  is_pep?: boolean;
}

export const customersApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listCustomers: b.query<Paginated<Customer>, ListCustomersParams>({
      query: (params) => ({ url: "/customers", params }),
      providesTags: (result) => [
        { type: "Customer", id: "LIST" },
        ...(result?.items ?? []).map((c) => ({ type: "Customer" as const, id: c.customer_id })),
      ],
    }),
    getCustomerBaseline: b.query<CustomerBaseline, string>({
      query: (customer_id) => `/customers/${customer_id}/baseline`,
      // Backend field names differ from the dashboard's CustomerBaseline shape
      // (avg_transaction_amount vs avg_amount, typical_channels vs channels, …)
      // and several fields are null when a customer has insufficient history.
      // Map + default here so the detail page never reads undefined.toLocaleString().
      transformResponse: (raw: Record<string, unknown> | null): CustomerBaseline => {
        const r = raw ?? {};
        const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
        const start = r.period_start ? new Date(String(r.period_start)) : null;
        const end = r.period_end ? new Date(String(r.period_end)) : null;
        const period_days =
          start && end ? Math.max(0, Math.round((+end - +start) / 86_400_000)) : 0;
        return {
          customer_id: String(r.customer_id ?? ""),
          period_days,
          avg_amount: num(r.avg_transaction_amount),
          median_amount: num(r.median_transaction_amount),
          std_amount: num(r.std_transaction_amount),
          daily_count: Math.round(num(r.avg_daily_transaction_count) * 100) / 100,
          channels: Array.isArray(r.typical_channels) ? (r.typical_channels as string[]) : [],
          countries: Array.isArray(r.typical_countries) ? (r.typical_countries as string[]) : [],
          counterparty_count: num(r.counterparty_count),
        };
      },
      providesTags: (_r, _e, id) => [{ type: "Baseline", id }],
    }),
    getCustomerTransactions: b.query<
      CustomerTransactionsResponse,
      {
        customer_id: string;
        start_date?: string;
        end_date?: string;
        limit?: number;
        flagged_only?: boolean;
      }
    >({
      query: ({ customer_id, ...params }) => ({
        url: `/customers/${customer_id}/transactions`,
        params,
      }),
    }),
    getCustomerAlerts: b.query<
      CustomerAlertsResponse,
      { customer_id: string; status_filter?: "Open" | "Investigating" | "Closed"; limit?: number }
    >({
      query: ({ customer_id, ...params }) => ({
        url: `/customers/${customer_id}/alerts`,
        params,
      }),
    }),
    getCustomerRiskProfile: b.query<CustomerRiskProfile, string>({
      query: (customer_id) => `/customers/${customer_id}/risk-profile`,
      providesTags: (_r, _e, id) => [{ type: "Customer", id }],
    }),
  }),
});

export const {
  useListCustomersQuery,
  useGetCustomerBaselineQuery,
  useGetCustomerTransactionsQuery,
  useGetCustomerAlertsQuery,
  useGetCustomerRiskProfileQuery,
} = customersApi;
