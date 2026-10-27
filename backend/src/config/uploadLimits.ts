/** Sign-up document uploads (worker CV/resume, employer permit). Default 5 MB — common ATS/job-board limit. */
const DEFAULT_SIGNUP_DOCUMENT_MAX_MB = 5;
const MAX_ALLOWED_MB = 50;

export const parseSignupDocumentMaxMb = (raw: string | undefined): number => {
  const n = Number(raw?.trim());
  if (!Number.isFinite(n) || n <= 0 || n > MAX_ALLOWED_MB) return DEFAULT_SIGNUP_DOCUMENT_MAX_MB;
  return n;
};

export const SIGNUP_DOCUMENT_MAX_MB = parseSignupDocumentMaxMb(process.env.SIGNUP_DOCUMENT_MAX_MB);

export const signupDocumentMaxBytes = (): number => SIGNUP_DOCUMENT_MAX_MB * 1024 * 1024;

export const signupDocumentMaxSizeLabel = (): string => `${SIGNUP_DOCUMENT_MAX_MB} MB`;
