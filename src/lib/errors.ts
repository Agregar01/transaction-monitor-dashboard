/**
 * Extract a human-readable message from an RTK Query / fetch error.
 *
 * RTK errors arrive shaped as `{ status, data: { detail?: string } | string }`
 * and `String(e)` on them yields the unhelpful `[object Object]`. Backend
 * FastAPI errors put the message under `data.detail`; fall back through
 * common shapes before giving up on a generic message.
 */
export function errorMessage(err: unknown, fallback = "Request failed"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    const data = e.data as Record<string, unknown> | string | undefined;
    if (typeof data === "string" && data) return data;
    if (data && typeof data === "object") {
      const detail = (data as Record<string, unknown>).detail;
      if (typeof detail === "string" && detail) return detail;
      if (Array.isArray(detail) && detail.length > 0) {
        // pydantic validation errors: [{msg, loc, ...}]
        const first = detail[0] as Record<string, unknown>;
        if (typeof first?.msg === "string") return first.msg;
      }
    }
    if (typeof e.error === "string" && e.error) return e.error;
    if (typeof e.message === "string" && e.message) return e.message;
  }
  return fallback;
}
