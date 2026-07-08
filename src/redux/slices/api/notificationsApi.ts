import { baseApi } from "./baseApi";

/** In-app notification (one row per recipient). Deep-link refs are set as applicable. */
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  customer_id: string | null;
  alert_id: string | null;
  case_id: string | null;
  verification_id: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  total: number;
  page: number;
  page_size: number;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listNotifications: b.query<
      NotificationListResponse,
      { unread_only?: boolean; page?: number; page_size?: number }
    >({
      query: (params) => ({ url: "/notifications", params }),
      providesTags: [{ type: "Notification", id: "LIST" }],
    }),
    unreadCount: b.query<{ unread: number }, void>({
      query: () => "/notifications/unread-count",
      providesTags: [{ type: "Notification", id: "COUNT" }],
    }),
    markNotificationRead: b.mutation<unknown, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      invalidatesTags: [
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "COUNT" },
      ],
    }),
    markAllNotificationsRead: b.mutation<unknown, void>({
      query: () => ({ url: "/notifications/read-all", method: "POST" }),
      invalidatesTags: [
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "COUNT" },
      ],
    }),
  }),
});

export const {
  useListNotificationsQuery,
  useUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
