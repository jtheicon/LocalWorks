/** Upload + AI scan progress (AI portion is time-based until the server responds). */

export const UPLOAD_PROGRESS_MAX = 35;
export const AI_PROGRESS_START = UPLOAD_PROGRESS_MAX;
export const AI_PROGRESS_CAP = 92;

export const uploadProgressPercent = (loaded: number, total: number): number => {
  if (!total) return 0;
  return Math.min(UPLOAD_PROGRESS_MAX, Math.round((loaded / total) * UPLOAD_PROGRESS_MAX));
};

/** Smoothly approaches AI_PROGRESS_CAP (never hits 100 until the request finishes). */
export const aiSimulatedProgress = (elapsedMs: number): number => {
  const span = AI_PROGRESS_CAP - AI_PROGRESS_START;
  const t = 1 - Math.exp(-elapsedMs / 14_000);
  return Math.round(AI_PROGRESS_START + span * t);
};

export const scanStageLabel = (
  progress: number,
  field: "resume" | "permit",
): string => {
  const doc = field === "resume" ? "resume" : "permit";
  if (progress < AI_PROGRESS_START) return `Uploading your ${doc}…`;
  if (progress < 48) return "Preparing document for AI…";
  if (progress < 62) return `AI is reading your ${doc}…`;
  if (progress < 78) return "Extracting details (name, contact, experience)…";
  if (progress < AI_PROGRESS_CAP) return "Verifying document against signup rules…";
  if (progress >= 100) return "Verification complete";
  return "Finishing AI review…";
};
