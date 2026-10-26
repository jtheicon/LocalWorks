import { computeAdminLifecycle } from "./inactivityPolicy";

/** Same buckets as User management lifecycle + dashboard Account health. */
export type AccountHealthBuckets = {
  /** Operational accounts with no inactivity concern (< 3 mo idle basis). */
  platformActive: number;
  /** Still has platform access but in 3/4/5/6‑month inactivity pipeline. */
  inactivityMonitoring: number;
  pending: number;
  /** All admin/user `not_active` (moderation hold). */
  deactivated: number;
  /** `not_active` with admin deactivation (reactivation flow). */
  deactivatedAdmin: number;
  /** Old 6-month policy: still `not_active` — daily job migrates to deleted. */
  legacyInactivityDeactivated: number;
  /** @deprecated alias of legacyInactivityDeactivated */
  autoDeactivated: number;
};

export const bucketAccountHealth = (users: readonly Record<string, unknown>[]): AccountHealthBuckets => {
  const out: AccountHealthBuckets = {
    platformActive: 0,
    inactivityMonitoring: 0,
    pending: 0,
    deactivated: 0,
    deactivatedAdmin: 0,
    legacyInactivityDeactivated: 0,
    autoDeactivated: 0,
  };

  for (const u of users) {
    const status = String(u.status ?? "");
    if (status === "pending") {
      out.pending += 1;
      continue;
    }
    if (status === "not_active") {
      out.deactivated += 1;
      const deact = u.deactivation as { reason?: string } | null | undefined;
      if (deact?.reason === "inactivity") {
        out.legacyInactivityDeactivated += 1;
      } else {
        out.deactivatedAdmin += 1;
      }
      continue;
    }
    if (status === "active" || status === "verified") {
      const lifecycle = computeAdminLifecycle({
        status,
        lastActiveAt: u.lastActiveAt as Date | null | undefined,
        updatedAt: u.updatedAt as Date | undefined,
        createdAt: u.createdAt as Date | undefined,
      });
      if (lifecycle === "inactive") out.inactivityMonitoring += 1;
      else out.platformActive += 1;
    }
  }

  out.autoDeactivated = out.legacyInactivityDeactivated;
  return out;
};
