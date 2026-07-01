import { baseApi } from "./baseApi";

/**
 * Customer-facing KYC. These flows are performed by the CUSTOMER on their own
 * device — the dashboard user only initiates them and reads the result. The
 * backend mints + persists the verification_id, builds the central-KYC link,
 * and delivers it to the destination the agent supplies (email/phone). The
 * dashboard never embeds the customer capture UI.
 *
 * Backend contract (to be implemented in TMS — see
 * docs/kyc-document-verification-contract.md):
 *   POST /kyc/document-verification          → create + send link
 *   GET  /kyc/document-verification/{id}     → poll status
 */

export type KycDestinationType = "email" | "phone";

export interface RequestDocumentVerificationBody {
  customer_id: string;
  /** Passed through to central-KYC as verification_type (e.g. "DOCUMENT VERIFICATION"). */
  verification_type: string;
  /** Email address or phone number the agent entered; where the link is sent. */
  destination: string;
  destination_type: KycDestinationType;
  /** Customer-facing completion URL for central-KYC mode=redirect. Blank for now. */
  return_url?: string | null;
}

export type DocumentVerificationStatus =
  | "PENDING"
  | "SENT"
  | "IN_PROGRESS"
  | "VERIFIED"
  | "FAILED"
  | "EXPIRED";

export interface DocumentVerificationResult {
  /** Minted and persisted by the backend. */
  verification_id: string;
  status: DocumentVerificationStatus;
  /** The central-KYC link the backend sent — surfaced so the agent can copy/resend. */
  link?: string;
  message?: string;
}

// ── Video KYC ────────────────────────────────────────────────────────────────
// Agent-initiated, agent-supervised live video verification. The agent fills the
// candidate's details; the backend invites the candidate (email) and returns the
// agent-portal URL the agent opens to run the session.

export const VIDEO_ID_TYPES = ["Ghana Card", "Passport", "Driver's License"] as const;
export type VideoIdType = (typeof VIDEO_ID_TYPES)[number];

export interface RequestVideoVerificationBody {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  id_type: string;
  id_number: string;
}

/** The full Video-KYC payload, fetched by TMS from videokyc by reference. Null until
 *  the candidate completes their session. Field set is open — known fields are typed. */
export interface VideoKycResultPayload {
  first_name?: string;
  last_name?: string;
  email_status?: string;
  verification_status?: string;
  /** Image URL or base64. */
  card_front?: string;
  /** Image URL or base64. */
  selfie_with_card?: string;
  [key: string]: unknown;
}

export interface VideoVerificationResult {
  verification_id: string;
  /** ID assigned by the external Video-KYC platform. */
  external_verification_id?: string;
  /** Present on create (POST); the status GET currently returns null — the UI keeps the last known value. */
  reference: string | null;
  status: DocumentVerificationStatus;
  /** Where the agent runs the live session, e.g. .../agent-vkyc/verification?id=…&reference=… */
  agent_portal_url: string;
  /** The link emailed to the candidate — surfaced so the agent can re-send it manually. */
  candidate_link?: string | null;
  message?: string;
  /** Null until the candidate completes; then the full video-KYC payload. */
  result?: VideoKycResultPayload | null;
}

export const kycApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    requestDocumentVerification: b.mutation<
      DocumentVerificationResult,
      RequestDocumentVerificationBody
    >({
      query: (body) => ({ url: "/kyc/document-verification", method: "POST", body }),
      invalidatesTags: [{ type: "Verification", id: "LIST" }],
    }),
    getDocumentVerificationStatus: b.query<DocumentVerificationResult, string>({
      query: (verification_id) => `/kyc/document-verification/${verification_id}`,
      providesTags: (_r, _e, id) => [{ type: "Verification", id }],
    }),
    requestVideoVerification: b.mutation<
      VideoVerificationResult,
      RequestVideoVerificationBody
    >({
      query: (body) => ({ url: "/kyc/video-verification", method: "POST", body }),
      invalidatesTags: [{ type: "Verification", id: "VIDEO_LIST" }],
    }),
    getVideoVerificationStatus: b.query<VideoVerificationResult, string>({
      query: (verification_id) => `/kyc/video-verification/${verification_id}`,
      providesTags: (_r, _e, id) => [{ type: "Verification", id }],
    }),
  }),
});

export const {
  useRequestDocumentVerificationMutation,
  useGetDocumentVerificationStatusQuery,
  useLazyGetDocumentVerificationStatusQuery,
  useRequestVideoVerificationMutation,
  useGetVideoVerificationStatusQuery,
  useLazyGetVideoVerificationStatusQuery,
} = kycApi;
