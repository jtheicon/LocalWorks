import VerifiedWorker from "../model/VerifiedWorker";
import { isOperationalAccountStatus } from "./inactivityPolicy";

/** Status to restore after inactivity reactivation (preserves verified workers / employers). */
export const resolveRestoredAccountStatus = async (
  role: "worker" | "employer",
  userId: string,
  deactivation?: { previousStatus?: string } | null,
): Promise<string> => {
  const previous = deactivation?.previousStatus;
  if (previous && isOperationalAccountStatus(previous)) return previous;

  if (role === "worker") {
    const verified = await VerifiedWorker.exists({ worker: userId });
    return verified ? "verified" : "active";
  }

  return "active";
};
