import { getIO } from "../socket";

export type AdminUserLifecycleReason =
  | "status_change"
  | "reactivation"
  | "reactivation_request"
  | "inactivity_job"
  | "inactivity_warning"
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
