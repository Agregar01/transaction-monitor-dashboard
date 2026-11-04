/**
 * Extract a human-readable message from an RTK Query / fetch error.
 *
 * RTK errors arrive shaped as `{ status, data: { detail?: string } | string }`
 * and `String(e)` on them yields the unhelpful `[object Object]`. Backend
 * FastAPI errors put the message under `data.detail`; the backend's global
 * unhandled-exception handler instead wraps 5xx responses as
 * `{ error: { message, category, request_id } }`. Fall back through common
 * shapes before giving up on a generic message.
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
      if (detail && typeof detail === "object") {
        // custom exception shape: { message, errors: [...] } (e.g. SimulationError)
        const d = detail as Record<string, unknown>;
        if (typeof d.message === "string" && d.message) return d.message;
      }
      const errorField = (data as Record<string, unknown>).error;
      if (typeof errorField === "string" && errorField) return errorField;
      if (errorField && typeof errorField === "object") {
        // global exception-handler shape: { error: { message, category, request_id } }
        const ef = errorField as Record<string, unknown>;
        if (typeof ef.message === "string" && ef.message) {
          return typeof ef.request_id === "string"
            ? `${ef.message} (ref ${ef.request_id.slice(0, 8)})`
            : ef.message;
        }
      }
    }
    if (typeof e.error === "string" && e.error) return e.error;
    if (typeof e.message === "string" && e.message) return e.message;
  }
  return fallback;
}
