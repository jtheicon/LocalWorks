/** Same rules as backend createApplication (keep in sync). */
export const isJobApplyExpired = (applyBefore?: string) =>
  Boolean(applyBefore && new Date(applyBefore) < new Date());

export const canWorkerApply = (job: {
  IsApplied?: boolean;
  Accepted?: boolean;
  info?: { applyBefore?: string; positions?: number };
}) =>
  !job.IsApplied &&
  !job.Accepted &&
  (job.info?.positions ?? 0) >= 1 &&
  !isJobApplyExpired(job.info?.applyBefore);
