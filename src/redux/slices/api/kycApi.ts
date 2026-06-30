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
  }),
});

export const {
  useRequestDocumentVerificationMutation,
  useGetDocumentVerificationStatusQuery,
  useLazyGetDocumentVerificationStatusQuery,
} = kycApi;
