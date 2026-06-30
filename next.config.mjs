// Central-KYC / Video-KYC origins that the Identity Verification page embeds.
// Override via NEXT_PUBLIC_CENTRAL_KYC_ORIGIN to point at a different deployment.
const KYC_ORIGINS = [
  process.env.NEXT_PUBLIC_CENTRAL_KYC_ORIGIN || "https://central-kyc.vercel.app",
  process.env.NEXT_PUBLIC_VIDEO_KYC_ORIGIN || "https://videokyc.vercel.app",
  "https://app.agregartech.com",
];
// Permissions-Policy allowlist syntax: self + quoted origins.
const KYC_ALLOWLIST = ["self", ...KYC_ORIGINS.map((o) => `"${o}"`)].join(" ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Trim barrel imports: @heroicons/react is imported by ~16 files via the
  // /24/outline barrel. optimizePackageImports rewrites these to per-icon
  // paths so only the icons actually used land in the bundle.
  experimental: {
    optimizePackageImports: ["@heroicons/react"],
  },
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
            // Camera/mic enabled for the embedded KYC origins so video KYC,
            // liveness and document capture work inside the iframe.
            value: `camera=(${KYC_ALLOWLIST}), microphone=(${KYC_ALLOWLIST}), geolocation=()`,
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
              // Leaflet basemap raster tiles are fetched client-side from CARTO's CDN.
              "img-src 'self' data: blob: https://*.basemaps.cartocdn.com",
              "font-src 'self' data:",
              // Browser only ever calls /api/proxy/* (same-origin); backend connect happens server-side via BACKEND_URL.
              // Keeping 'self' is sufficient. Add explicit backend host here if direct calls are ever added.
              "connect-src 'self'",
              // The Identity Verification page embeds the live central-KYC / video-KYC UI.
              `frame-src 'self' ${KYC_ORIGINS.join(" ")}`,
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

export default nextConfig;
