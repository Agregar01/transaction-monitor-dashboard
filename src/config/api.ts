// Browser API base. All client calls go through the Next.js BFF proxy under
// /api/proxy/* — the proxy reads BACKEND_URL server-side and forwards to the
// TMS FastAPI. No direct browser → backend call should ever exist (avoids
// DNS, CORS, and mixed-content issues, and keeps tokens off the wire).
export const API_V1 = "/api/proxy/api/v1";
