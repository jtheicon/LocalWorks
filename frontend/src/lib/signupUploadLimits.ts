import axios from "axios";
import { API_ORIGIN } from "@/lib/apiOrigin";

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_LABEL = "5 MB";

let cached: { maxBytes: number; label: string } | null = null;

export const getSignupUploadLimits = async (): Promise<{ maxBytes: number; label: string }> => {
  if (cached) return cached;
  try {
    const { data } = await axios.get<{
      success?: boolean;
      maxBytes?: number;
      label?: string;
    }>(`${API_ORIGIN}/api/auth/signup/upload-limits`, { withCredentials: true });
    if (data.success && typeof data.maxBytes === "number" && data.label) {
      cached = { maxBytes: data.maxBytes, label: data.label };
      return cached;
    }
  } catch {
    // API not up yet — use defaults matching backend SIGNUP_DOCUMENT_MAX_MB default
  }
  return { maxBytes: DEFAULT_MAX_BYTES, label: DEFAULT_LABEL };
};
