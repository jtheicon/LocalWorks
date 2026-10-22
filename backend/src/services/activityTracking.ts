/**
 * Qualifying activity (updates lastActiveAt):
 * - Successful worker/employer login
 * - Profile updates (worker or employer)
 * - Job create/update (employer)
 * - Job application submit/withdraw (worker)
 * - Application status/interview updates (employer)
 * - Job-related message sent (worker/employer)
 * - Worker assignment created, worker job submission updates
 * - Report filed or updated (worker/employer)
 *
 * Not qualifying: GET/list/read endpoints, token refresh, notifications mark-read, heartbeats.
 */
import { DEACTIVATION_MONTHS, wholeMonthsSince, now } from "./inactivityPolicy";
import { resolveRestoredAccountStatus } from "./accountRestore";
import { userModelByRole } from "./userModelByRole";
import { emitAdminUserLifecycleUpdated } from "./adminLifecycleSocket";

const lastTouched = new Map<string, number>();
const TOUCH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const adminSocketLastEmit = new Map<string, number>();
const ADMIN_SOCKET_EMIT_MS = 15_000;

export const recordQualifyingActivity = (
  id: string | undefined,
  role: string | undefined,
  force = false,
) => {
  if (!id || (role !== "worker" && role !== "employer")) return;
  const key = `${role}:${id}`;
  if (!force && Date.now() - (lastTouched.get(key) ?? 0) < TOUCH_INTERVAL_MS) return;
  lastTouched.set(key, Date.now());

  const M = userModelByRole(role);
  const at = now();
  M.updateOne(
    { _id: id },
    {
      $set: { lastActiveAt: at },
      $unset: { inactivityWarningStage: "", lastInactivityNotificationAt: "" },
    },
    { timestamps: false },
  )
    .then((result) => {
      if (result.modifiedCount > 0) {
        const key = `${role}:${id}`;
        const t = Date.now();
        if (t - (adminSocketLastEmit.get(key) ?? 0) >= ADMIN_SOCKET_EMIT_MS) {
          adminSocketLastEmit.set(key, t);
          emitAdminUserLifecycleUpdated("qualifying_activity", {
            userId: id,
            role: role as "worker" | "employer",
          });
        }
      }
    })
    .catch((err) => console.error("[activity] update failed:", err));
};

/** @deprecated use recordQualifyingActivity */
export const touchActivity = recordQualifyingActivity;

export const resetInactivityCycleOnReactivation = async (
  role: "worker" | "employer",
  id: string,
  adminId?: string,
) => {
  const M = userModelByRole(role);
  const existing = await M.findById(id).select("deactivation").lean();
  const restoredStatus = await resolveRestoredAccountStatus(
    role,
    id,
    (existing as { deactivation?: { previousStatus?: string } } | null)?.deactivation,
  );
  await M.updateOne(
    { _id: id },
    {
      $set: {
        status: restoredStatus,
        lastActiveAt: now(),
        inactivityWarningStage: 0,
        reactivationRequestStatus: "approved",
        reactivationReviewedAt: now(),
        ...(adminId ? { reactivationReviewedBy: adminId } : {}),
        deactivation: null,
      },
      $unset: {
        lastInactivityNotificationAt: "",
        reactivationRequestedAt: "",
        reactivationRejectionReason: "",
      },
    },
  );
};

export const monthsInactiveLabel = (lastActiveAt: Date | null | undefined): number | null => {
  if (!lastActiveAt) return null;
  return wholeMonthsSince(new Date(lastActiveAt));
};

export { DEACTIVATION_MONTHS };
