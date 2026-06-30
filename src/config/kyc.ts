/**
 * Central-KYC / Video-KYC integration.
 *
 * The Identity Verification page embeds the live central-KYC capture UI in an
 * iframe. These origins must also be allow-listed in next.config.mjs
 * (frame-src + Permissions-Policy camera/microphone) — keep them in sync.
 */
export const CENTRAL_KYC_ORIGIN =
  process.env.NEXT_PUBLIC_CENTRAL_KYC_ORIGIN || "https://central-kyc.vercel.app";

/** Customer-facing capture entry point. central-kyc reads verification_id + verification_type from the root query. */
export const CENTRAL_KYC_URL =
  process.env.NEXT_PUBLIC_CENTRAL_KYC_URL || `${CENTRAL_KYC_ORIGIN}/`;

/**
 * Standalone Video-KYC app (the agent-assisted live-video flow we used before
 * central-KYC). "VIDEO KYC" in the launcher routes here instead of central-KYC;
 * everything else stays on central-KYC. Its origin is allow-listed for framing
 * + camera/mic in next.config.mjs — keep in sync.
 */
export const VIDEO_KYC_ORIGIN =
  process.env.NEXT_PUBLIC_VIDEO_KYC_ORIGIN || "https://videokyc.vercel.app";

export const VIDEO_KYC_URL =
  process.env.NEXT_PUBLIC_VIDEO_KYC_URL || `${VIDEO_KYC_ORIGIN}/`;

/** Verification flows offered in the launcher. The label is passed through as verification_type. */
export const VERIFICATION_TYPES = [
  "REMOTE CUSTOMER ONBOARDING",
  "VIDEO KYC",
  "LIVENESS CHECK",
  "DOCUMENT VERIFICATION",
] as const;

export type VerificationTypeLabel = (typeof VERIFICATION_TYPES)[number];

/** The one launcher label that routes to the standalone Video-KYC app. */
export const VIDEO_KYC_TYPE: VerificationTypeLabel = "VIDEO KYC";
