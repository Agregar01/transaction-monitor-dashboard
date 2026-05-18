// Server-side only (BFF proxy reads BACKEND_URL). NEXT_PUBLIC_API_URL is kept for
// optional client diagnostics but no browser call should go directly to the backend.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088";

// Browser calls go through the Next.js proxy to avoid DNS / CORS / mixed-content issues
export const API_V1 = "/api/proxy/api/v1";
