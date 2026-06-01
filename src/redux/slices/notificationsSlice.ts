import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Notification {
  id: string;
  type: "decision_alert" | "system" | "policy_change" | "tier_change" | "security";
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, "id" | "read" | "timestamp">>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        read: false,
        timestamp: new Date().toISOString(),
      };
      state.items.unshift(notification);
      state.unreadCount += 1;
      // Keep only last 100 notifications
      if (state.items.length > 100) {
        state.items = state.items.slice(0, 100);
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const item = state.items.find((n) => n.id === action.payload);
      if (item && !item.read) {
        item.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.items.forEach((n) => { n.read = true; });
      state.unreadCount = 0;
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const idx = state.items.findIndex((n) => n.id === action.payload);
      if (idx >= 0) {
        if (!state.items[idx].read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.items.splice(idx, 1);
      }
    },
    clearAll: (state) => {
      state.items = [];
      state.unreadCount = 0;
    },
  },
});

export const { addNotification, markAsRead, markAllAsRead, removeNotification, clearAll } = notificationsSlice.actions;
export default notificationsSlice.reducer;
