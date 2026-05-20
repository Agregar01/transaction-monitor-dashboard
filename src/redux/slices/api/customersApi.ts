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
