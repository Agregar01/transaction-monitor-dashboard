/**
 * Central-KYC / Video-KYC integration.
 *
 * The Identity Verification page embeds the live central-KYC capture UI in an
 * iframe. These origins must also be allow-listed in next.config.mjs
 * (frame-src + Permissions-Policy camera/microphone) — keep them in sync.
 */
export const CENTRAL_KYC_ORIGIN =
  process.env.NEXT_PUBLIC_CENTRAL_KYC_ORIGIN || "https://videokyc-frontend2.vercel.app";

/** Customer-facing capture entry point. Reads verification_id + verification_type from the query. */
export const CENTRAL_KYC_URL =
  process.env.NEXT_PUBLIC_CENTRAL_KYC_URL ||
  `${CENTRAL_KYC_ORIGIN}/agent_vkyc_portal/customer`;

/** Verification flows offered in the launcher. The label is passed through as verification_type. */
export const VERIFICATION_TYPES = [
  "REMOTE CUSTOMER ONBOARDING",
  "VIDEO KYC",
  "LIVENESS CHECK",
  "DOCUMENT VERIFICATION",
] as const;

export type VerificationTypeLabel = (typeof VERIFICATION_TYPES)[number];
