import { getIO } from "../socket";

export type AdminUserLifecycleReason =
  | "status_change"
  | "reactivation"
  | "reactivation_request"
  | "inactivity_job"
  | "inactivity_warning"
  | "inactivity_deletion"
  | "qualifying_activity";

export type AdminUserLifecycleSocketPayload = {
  reason: AdminUserLifecycleReason;
  at: string;
  userId?: string;
  role?: "worker" | "employer";
};

/** Push admin User Management to refetch lifecycle data (room: admins). */
export const emitAdminUserLifecycleUpdated = (
  reason: AdminUserLifecycleReason,
  target?: { userId: string; role: "worker" | "employer" },
) => {
  try {
    const payload: AdminUserLifecycleSocketPayload = {
      reason,
      at: new Date().toISOString(),
      ...(target ? { userId: target.userId, role: target.role } : {}),
    };
    getIO().to("admins").emit("admin:user-lifecycle:updated", payload);
  } catch {
    // Socket not initialized (tests / scripts).
  }
};

/** Seeds / CLI jobs: ping a running API so open admin tabs refetch lifecycle (socket only works in-server). */
export const notifyAdminLifecycleFromScript = async () => {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_SEED_LIFECYCLE_BROADCAST !== "true"
  ) {
    return;
  }
  const secret =
    process.env.SEED_LIFECYCLE_BROADCAST_SECRET?.trim() ||
    process.env.SEED_CONFIRM_PRODUCTION?.trim();
  if (!secret) return;
  const port = process.env.PORT?.trim() || "8920";
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/inactivity/broadcast`, {
      method: "POST",
      headers: { "x-lifecycle-broadcast": secret },
    });
    if (res.ok) {
      console.log("[lifecycle] Admin dashboard notified to refresh user lifecycle data.");
    }
  } catch {
    // API not running — admin UI still picks up changes on refetch/focus.
  }
};
