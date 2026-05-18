"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import { useGetDecisionHistoryQuery } from "@/redux/slices/api/decisionsApi";
import { addNotification } from "@/redux/slices/notificationsSlice";

/**
 * Polls for new BLOCK/FREEZE/REVIEW decisions and adds them as notifications.
 * Only generates notifications for decisions newer than the last check.
 */
export function useDecisionNotifications(pollingInterval = 60000) {
  const dispatch = useAppDispatch();
  const clientId = useAppSelector((s) => s.auth.clientId) || "";
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const lastSeenRef = useRef<string | null>(null);

  const { data: decisions } = useGetDecisionHistoryQuery(
    { client_id: clientId, limit: 10, offset: 0 },
    { pollingInterval, skip: !isAuthenticated || !clientId },
  );

  useEffect(() => {
    // Handle both array and paginated {items: [...]} response formats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = decisions as any;
    const items = Array.isArray(raw) ? raw : raw?.items;
    if (!items || items.length === 0) return;

    const latest = items[0];
    if (!lastSeenRef.current) {
      // First load — set reference point without generating notifications
      lastSeenRef.current = latest.created_at;
      return;
    }

    // Find new decisions since last check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newDecisions = items.filter(
      (d: any) => d.created_at > (lastSeenRef.current || "") &&
        ["BLOCK", "FREEZE", "REVIEW"].includes(d.action)
    );

    for (const d of newDecisions) {
      dispatch(addNotification({
        type: "decision_alert",
        title: `${d.action} Decision`,
        message: `Customer ${d.customer_external_id}: ${d.action} (Risk: ${d.risk_level}, Score: ${d.risk_score})`,
        link: `/dashboard/decisions/${d.decision_id}`,
        metadata: { decision_id: d.decision_id, action: d.action },
      }));
    }

    if (items.length > 0) {
      lastSeenRef.current = latest.created_at;
    }
  }, [decisions, dispatch]);
}
