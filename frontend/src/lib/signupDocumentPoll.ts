import axios from "axios";
import { API_ORIGIN } from "@/lib/apiOrigin";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_MS = 3 * 60 * 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type SignupScanComplete<F> = {
  documentToken: string;
  documentType: string;
  fields: F;
};

/** Poll until AI scan completes, is rejected, or times out. */
export const pollSignupDocumentScan = async <F>(
  scanId: string,
  signal: AbortSignal,
): Promise<SignupScanComplete<F>> => {
  const started = Date.now();
  while (Date.now() - started < POLL_MAX_MS) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const { data } = await axios.get(`${API_ORIGIN}/api/auth/signup/scan/${encodeURIComponent(scanId)}`, {
      withCredentials: true,
      signal,
      validateStatus: (s) => s === 200 || s === 422,
    });
    if (data.status === "processing") {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    if (data.status === "complete" && data.success) {
      return {
        documentToken: data.documentToken,
        documentType: data.documentType,
        fields: data.fields as F,
      };
    }
    const message = data.message || "We couldn't verify this document.";
    const reasons = Array.isArray(data.reasons) ? data.reasons : [];
    const err = new Error(message) as Error & { reasons?: string[]; isSignupRejection?: boolean };
    err.reasons = reasons;
    err.isSignupRejection = true;
    throw err;
  }
  throw new Error(
    "AI review is taking longer than expected. Try a DOCX resume or a smaller PDF, then upload again.",
  );
};
