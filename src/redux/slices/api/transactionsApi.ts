import { baseApi } from "./baseApi";
import type {
  Paginated,
  Transaction,
  TransactionTimelineEvent,
  RelatedTransaction,
  TransactionFeedResponse,
} from "@/types/api";

export interface ListTransactionsParams {
  page?: number;
  page_size?: number;
  customer_id?: string;
  flagged?: boolean;
  transaction_type?: string;
  channel?: string;
  start_date?: string;
  end_date?: string;
}

export const transactionsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listTransactions: b.query<Paginated<Transaction>, ListTransactionsParams>({
      query: (params) => ({ url: "/transactions", params }),
      providesTags: (result) => [
        { type: "Transaction", id: "LIST" },
        ...(result?.items ?? []).map((t) => ({ type: "Transaction" as const, id: t.transaction_id })),
      ],
    }),
    getTransaction: b.query<Transaction, string>({
      query: (id) => `/transactions/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Transaction", id }],
    }),
    // Polling-based live feed. Caller advances `since` with the previous
    // response's next_cursor each tick. Deliberately untagged — the live
    // component owns accumulation, so cache invalidation must not reset it.
    getTransactionFeed: b.query<
      TransactionFeedResponse,
      { since?: string; limit?: number; flagged_only?: boolean }
    >({
      query: (params) => ({ url: "/transactions/feed", params }),
    }),
    getTransactionTimeline: b.query<{ events: TransactionTimelineEvent[] }, string>({
      query: (id) => `/transactions/${id}/timeline`,
    }),
    getRelatedTransactions: b.query<
      { related: RelatedTransaction[] },
      { transaction_id: string; min_similarity?: number; limit?: number }
    >({
      query: ({ transaction_id, ...params }) => ({
        url: `/transactions/${transaction_id}/related`,
        params,
      }),
    }),
  }),
});

export const {
  useListTransactionsQuery,
  useGetTransactionQuery,
  useGetTransactionTimelineQuery,
  useGetRelatedTransactionsQuery,
  useLazyGetTransactionFeedQuery,
} = transactionsApi;
