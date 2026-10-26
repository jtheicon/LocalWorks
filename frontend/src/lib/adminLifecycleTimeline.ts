/** Admin copy tying calendar-month idle policy to warning stages and dates. */

const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : null;

const fmtDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

export type LifecycleTimelineInput = {
  lastActiveAt?: string | null;
  monthsSinceActivity?: number | null;
  inactivityWarningStage?: number;
  lastInactivityNotificationAt?: string | null;
  lastStageDueAt?: string | null;
  nextMilestoneMonths?: number | null;
  nextScheduledAt?: string | null;
  deletionDueAt?: string | null;
  eligibleForAutoDeletion?: boolean;
  /** @deprecated API alias — same threshold as deletion */
  eligibleForAutoDeactivation?: boolean;
};

export const DEFAULT_DELETION_IDLE_MONTHS = 6;

export const describeIdleBasis = (row: LifecycleTimelineInput): string | null => {
  const idle = fmtDate(row.lastActiveAt);
  if (!idle) return null;
  const mo = row.monthsSinceActivity;
  return mo != null ? `Idle since ${idle} (${mo} calendar mo.)` : `Idle since ${idle}`;
};

export const describeWarningProgress = (row: LifecycleTimelineInput): string | null => {
  const stage = row.inactivityWarningStage ?? 0;
  if (stage <= 0) return null;

  const due = fmtDate(row.lastStageDueAt);
  const sent = fmtDateTime(row.lastInactivityNotificationAt);
  const label =
    stage >= 6 ? "Account deletion (6 mo. idle)" : `${stage}-month inactivity warning`;

  const chunks = [label];
  if (due) chunks.push(`policy due ~${due}`);
  if (sent) chunks.push(`sent ${sent}`);
  return chunks.join(" · ");
};

const addCalendarMonthsIso = (iso: string, months: number): string => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
};

export const describeNextMilestone = (
  row: LifecycleTimelineInput,
  deactivationMonths = DEFAULT_DELETION_IDLE_MONTHS,
): string | null => {
  const stage = row.inactivityWarningStage ?? 0;
  const idleMo = row.monthsSinceActivity;
  const nextIsDeletion =
    row.nextMilestoneMonths != null && row.nextMilestoneMonths >= deactivationMonths;
  const overdueForDeletion =
    idleMo != null && idleMo >= deactivationMonths && stage >= deactivationMonths - 1;

  if (nextIsDeletion || overdueForDeletion) {
    const due = fmtDate(row.deletionDueAt ?? row.nextScheduledAt);
    if (due) {
      return `Account deletion due ~${due} (${deactivationMonths} calendar mo. idle — daily job permanently removes account & data)`;
    }
    return `Account deletion eligible (${deactivationMonths}+ calendar mo. idle — daily job)`;
  }

  if (row.nextMilestoneMonths != null && row.nextScheduledAt) {
    const due = fmtDate(row.nextScheduledAt);
    return due
      ? `Next: ${row.nextMilestoneMonths}-month inactivity warning due ~${due}`
      : `Next: ${row.nextMilestoneMonths}-month warning`;
  }
  if (stage >= 3 && stage < 5 && row.lastActiveAt) {
    const nextMo = stage + 1;
    const due = fmtDate(addCalendarMonthsIso(row.lastActiveAt, nextMo));
    return due ? `Next: ${nextMo}-month warning due ~${due}` : null;
  }
  if (stage >= 5 && row.deletionDueAt) {
    return `Account deletion due ~${fmtDate(row.deletionDueAt)} (${deactivationMonths} calendar mo. idle)`;
  }
  return null;
};

export const describeDeletionJobEligibility = (
  row: LifecycleTimelineInput,
  deactivationMonths = DEFAULT_DELETION_IDLE_MONTHS,
): string | null => {
  const idleMo = row.monthsSinceActivity;
  const eligible =
    row.eligibleForAutoDeletion ||
    row.eligibleForAutoDeactivation ||
    (idleMo != null && idleMo >= deactivationMonths && (row.inactivityWarningStage ?? 0) >= 5);
  if (!eligible) return null;
  const due = fmtDate(row.deletionDueAt);
  return due
    ? `Queued for automated account deletion on the next daily inactivity job (policy date ~${due}; not the same as admin “Deactivate”). Login does not reset this idle clock.`
    : `Queued for automated account deletion on the next daily inactivity job (${deactivationMonths}+ calendar mo. idle). Login does not reset this idle clock.`;
};
