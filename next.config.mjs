import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HSTS only in production — applying on localhost causes browser to force HTTPS and break dev
          ...(process.env.NODE_ENV === "production" ? [{
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          }] : []),
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // unsafe-inline needed for Next.js inline scripts; unsafe-eval needed for dev HMR only
              process.env.NODE_ENV === "production"
                ? "script-src 'self' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              // Browser only ever calls /api/proxy/* (same-origin); backend connect happens server-side via BACKEND_URL.
              // Keeping 'self' is sufficient. Add explicit backend host here if direct calls are ever added.
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
              // upgrade-insecure-requests only in production — breaks localhost dev
              ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
