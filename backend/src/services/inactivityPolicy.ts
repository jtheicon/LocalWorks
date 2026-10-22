/**
 * Account inactivity policy (calendar months, platform timezone = server local time).
 *
 * Qualifying activity is recorded via recordQualifyingActivity() — see activityTracking.ts.
 * Legacy accounts without lastActiveAt are not auto-emailed or auto-deactivated until they sign in once.
 */

export const DEACTIVATION_MONTHS = Number(process.env.INACTIVITY_MONTHS) || 6;
export const WARNING_MONTHS = [3, 4, 5] as const;
export type WarningMonth = (typeof WARNING_MONTHS)[number];

export type LifecycleFilter = "active" | "inactive" | "deactivated" | "pending" | "all";

export type AccountLifecycle =
  | "active"
  | "inactive"
  | "deactivated"
  | "pending"
  | "other";

/** Accounts that can use the platform and participate in inactivity tracking. */
export const OPERATIONAL_ACCOUNT_STATUSES = ["active", "verified"] as const;
export type OperationalAccountStatus = (typeof OPERATIONAL_ACCOUNT_STATUSES)[number];

export const isOperationalAccountStatus = (status: string): status is OperationalAccountStatus =>
  (OPERATIONAL_ACCOUNT_STATUSES as readonly string[]).includes(status);

/** Injectable clock for tests */
let clock: () => Date = () => new Date();
export const setInactivityClock = (fn: () => Date) => {
  clock = fn;
};
export const resetInactivityClock = () => {
  clock = () => new Date();
};
export const now = () => clock();

export const subtractCalendarMonths = (from: Date, months: number): Date => {
  const d = new Date(from.getTime());
  d.setMonth(d.getMonth() - months);
  return d;
};

/** Full calendar months elapsed since activityAt (exclusive of partial current month). */
export const wholeMonthsSince = (activityAt: Date, reference = now()): number => {
  let months =
    (reference.getFullYear() - activityAt.getFullYear()) * 12 +
    (reference.getMonth() - activityAt.getMonth());
  if (reference.getDate() < activityAt.getDate()) months -= 1;
  return Math.max(0, months);
};

export const activityReferenceDate = (user: {
  lastActiveAt?: Date | null;
  updatedAt?: Date;
  createdAt?: Date;
}): Date | null => {
  if (user.lastActiveAt) return new Date(user.lastActiveAt);
  return null;
};

export type AdminActivityBasis = "lastActiveAt" | "updatedAt" | "createdAtFallback" | "none";

/** Admin dashboard idle basis (automation warnings/deactivation use the same effective date). */
export const adminActivityReference = (user: {
  lastActiveAt?: Date | null;
  updatedAt?: Date;
  createdAt?: Date;
}): {
  at: Date | null;
  basis: AdminActivityBasis;
  lastQualifyingActivityAt: Date | null;
  profileUpdatedAt: Date | null;
} => {
  const last = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
  const updated = user.updatedAt ? new Date(user.updatedAt) : null;
  const created = user.createdAt ? new Date(user.createdAt) : null;

  // Activity pings update lastActiveAt without bumping updatedAt (timestamps: false).
  if (last && updated) {
    const useUpdated = updated.getTime() < last.getTime();
    return {
      at: useUpdated ? updated : last,
      basis: useUpdated ? "updatedAt" : "lastActiveAt",
      lastQualifyingActivityAt: last,
      profileUpdatedAt: updated,
    };
  }
  if (last) {
    return {
      at: last,
      basis: "lastActiveAt",
      lastQualifyingActivityAt: last,
      profileUpdatedAt: updated,
    };
  }
  if (updated) {
    return {
      at: updated,
      basis: "updatedAt",
      lastQualifyingActivityAt: null,
      profileUpdatedAt: updated,
    };
  }
  if (created) {
    return {
      at: created,
      basis: "createdAtFallback",
      lastQualifyingActivityAt: null,
      profileUpdatedAt: updated,
    };
  }
  return { at: null, basis: "none", lastQualifyingActivityAt: null, profileUpdatedAt: updated };
};

/** Warning / deactivation clock (same idle date as admin UI, not login ping alone). */
export const inactivityPolicyEffectiveAt = (user: {
  lastActiveAt?: Date | null;
  updatedAt?: Date;
  createdAt?: Date;
}): Date | null => {
  if (!user.lastActiveAt) return null;
  return adminActivityReference(user).at;
};

export const computeAdminLifecycle = (user: {
  status: string;
  lastActiveAt?: Date | null;
  updatedAt?: Date;
  createdAt?: Date;
}): AccountLifecycle => {
  if (user.status === "pending") return "pending";
  if (user.status === "not_active") return "deactivated";
  if (!isOperationalAccountStatus(user.status)) return "other";
  const ref = adminActivityReference(user);
  if (!ref.at) return "active";
  const months = wholeMonthsSince(ref.at);
  if (months >= 3) return "inactive";
  return "active";
};

export const isEligibleForInactivityAutomation = (user: {
  status: string;
  lastActiveAt?: Date | null;
}): boolean => isOperationalAccountStatus(user.status) && Boolean(user.lastActiveAt);

export const computeLifecycle = (user: {
  status: string;
  lastActiveAt?: Date | null;
  updatedAt?: Date;
  createdAt?: Date;
}): AccountLifecycle => {
  if (user.status === "pending") return "pending";
  if (user.status === "not_active") return "deactivated";
  if (!isOperationalAccountStatus(user.status)) return "other";
  const effectiveAt = inactivityPolicyEffectiveAt(user);
  if (!effectiveAt) return "active";
  const months = wholeMonthsSince(effectiveAt);
  if (months >= 3) return "inactive";
  return "active";
};

/** Next warning month due, or DEACTIVATION_MONTHS when deactivation is due, or null. */
export const nextInactivityMilestone = (user: {
  status: string;
  lastActiveAt?: Date | null;
  updatedAt?: Date;
  createdAt?: Date;
  inactivityWarningStage?: number;
}): number | null => {
  if (!isEligibleForInactivityAutomation(user)) return null;
  const effectiveAt = inactivityPolicyEffectiveAt(user);
  if (!effectiveAt) return null;
  const months = wholeMonthsSince(effectiveAt);
  const stage = user.inactivityWarningStage ?? 0;
  if (months >= DEACTIVATION_MONTHS && stage < DEACTIVATION_MONTHS) return DEACTIVATION_MONTHS;
  for (const m of WARNING_MONTHS) {
    if (months >= m && stage < m) return m;
  }
  return null;
};

export const scheduledActionDate = (lastActiveAt: Date, milestoneMonths: number): Date =>
  addCalendarMonths(lastActiveAt, milestoneMonths);

export const addCalendarMonths = (from: Date, months: number): Date => {
  const d = new Date(from.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
};

export const daysSince = (d: Date, reference = now()): number =>
  Math.floor((reference.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
