import { baseApi } from "./baseApi";
import type { Watchlist, WatchlistEntry, MutationResponse } from "@/types/api";

export const watchlistsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listWatchlists: b.query<Watchlist[], void>({
      query: () => "/watchlists",
      providesTags: (result) => [
        { type: "Watchlist", id: "LIST" },
        ...(result ?? []).map((w) => ({ type: "Watchlist" as const, id: w.name })),
      ],
    }),
    listWatchlistEntries: b.query<WatchlistEntry[], { name: string; page?: number; page_size?: number }>({
      query: ({ name, ...params }) => ({
        url: `/watchlists/${encodeURIComponent(name)}/entries`,
        params,
      }),
      providesTags: (_r, _e, { name }) => [{ type: "WatchlistEntry", id: name }],
    }),
    addWatchlistEntry: b.mutation<
      MutationResponse | { approval_id: string },
      { name: string; value: string; metadata?: Record<string, unknown> }
    >({
      query: ({ name, ...body }) => ({
        url: `/watchlists/${encodeURIComponent(name)}/entries`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { name }) => [
        { type: "WatchlistEntry", id: name },
        { type: "Watchlist", id: name },
        { type: "Approval", id: "LIST" },
      ],
    }),
    removeWatchlistEntry: b.mutation<
      MutationResponse | { approval_id: string },
      { name: string; value: string }
    >({
      query: ({ name, value }) => ({
        url: `/watchlists/${encodeURIComponent(name)}/entries/${encodeURIComponent(value)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { name }) => [
        { type: "WatchlistEntry", id: name },
        { type: "Watchlist", id: name },
        { type: "Approval", id: "LIST" },
      ],
    }),
    reloadWatchlist: b.mutation<MutationResponse, { name: string }>({
      query: ({ name }) => ({
        url: `/watchlists/${encodeURIComponent(name)}/reload`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, { name }) => [
        { type: "WatchlistEntry", id: name },
        { type: "Watchlist", id: name },
      ],
    }),
  }),
});

export const {
  useListWatchlistsQuery,
  useListWatchlistEntriesQuery,
  useAddWatchlistEntryMutation,
  useRemoveWatchlistEntryMutation,
  useReloadWatchlistMutation,
} = watchlistsApi;
