/**
 * Shared seed clocks: idle basis = today minus N calendar months (same rule as production policy).
 */
import {
  DEACTIVATION_MONTHS,
  scheduledActionDate,
  subtractCalendarMonths,
  wholeMonthsSince,
} from "../services/inactivityPolicy";

export type InactivitySeedTimeline = {
  /** Target idle length (3, 4, 5, or DEACTIVATION_MONTHS). */
  idleMonths: number;
  lastActiveAt: Date;
  inactivityWarningStage: number;
  lastInactivityNotificationAt: Date | null;
  /** When the next monitor email for this step is due (idle + milestone). */
  emailDueAt: Date;
  /** wholeMonthsSince(lastActiveAt, ref) — should match idleMonths. */
  calendarMonthsIdle: number;
  /** Join date backdated so admin “account age” is not “joined this month” during tour. */
  createdAtBackdate: Date;
};

const priorStageBeforeEmail = (idleMonths: number): number => {
  if (idleMonths >= DEACTIVATION_MONTHS) return 5;
  if (idleMonths >= 5) return 4;
  if (idleMonths >= 4) return 3;
  return 0;
};

/** Build DB fields for “N months idle today” before the monitor sends the N-month email. */
export const buildInactivitySeedTimeline = (
  ref: Date,
  idleMonths: number,
): InactivitySeedTimeline => {
  if (!Number.isInteger(idleMonths) || idleMonths < 3 || idleMonths > DEACTIVATION_MONTHS) {
    throw new Error(`idleMonths must be 3–${DEACTIVATION_MONTHS}, got ${idleMonths}`);
  }

  const lastActiveAt = subtractCalendarMonths(ref, idleMonths);
  const stage = priorStageBeforeEmail(idleMonths);
  const lastInactivityNotificationAt =
    stage > 0 ? scheduledActionDate(lastActiveAt, stage as 3 | 4 | 5) : null;
  const emailMilestone =
    idleMonths >= DEACTIVATION_MONTHS ? DEACTIVATION_MONTHS : idleMonths;

  return {
    idleMonths,
    lastActiveAt,
    inactivityWarningStage: stage,
    lastInactivityNotificationAt,
    emailDueAt: scheduledActionDate(lastActiveAt, emailMilestone),
    calendarMonthsIdle: wholeMonthsSince(lastActiveAt, ref),
    createdAtBackdate: subtractCalendarMonths(ref, idleMonths + 3),
  };
};

export type EmailTourRunMode =
  | "fixtures-only"
  | "warning-3"
  | "warning-4"
  | "warning-5"
  | "warnings"
  | "deletion"
  | "full";

/** Calendar months to backdate INACTIVITY_LIFECYCLE_INBOX for each npm seed command. */
export const inboxIdleMonthsForMode = (mode: EmailTourRunMode): number => {
  if (mode === "warning-4") return 4;
  if (mode === "warning-5") return 5;
  if (mode === "deletion") return DEACTIVATION_MONTHS;
  return 3;
};

export const expectedWarningStageAfterJob = (mode: EmailTourRunMode): number | null => {
  if (mode === "warning-3") return 3;
  if (mode === "warning-4") return 4;
  if (mode === "warning-5") return 5;
  if (mode === "deletion" || mode === "full") return DEACTIVATION_MONTHS;
  return null;
};
