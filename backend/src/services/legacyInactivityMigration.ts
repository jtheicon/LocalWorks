import { Model } from "mongoose";
import Worker from "../model/Worker";
import Employer from "../model/Employer";
import { applyAccountDeletion, type AccountRole } from "./accountDeletion";

const MODELS: [AccountRole, Model<any>][] = [
  ["worker", Worker],
  ["employer", Employer],
];

/**
 * Old policy kept inactivity at `not_active`; new policy deletes + purges.
 * Runs quietly (no user email) on each inactivity job until none remain.
 */
export const migrateLegacyInactivityDeactivatedAccounts = async (): Promise<number> => {
  let migrated = 0;

  for (const [role, M] of MODELS) {
    const docs = await M.find({
      status: "not_active",
      "deactivation.reason": "inactivity",
    })
      .select("status lastActiveAt deactivation")
      .lean();

    for (const doc of docs) {
      const deact = doc.deactivation as { previousStatus?: string } | null | undefined;
      const result = await applyAccountDeletion({
        role,
        userId: doc._id,
        reason: "inactivity",
        previousStatus: deact?.previousStatus ?? "not_active",
        lastActiveAt: doc.lastActiveAt ?? null,
        inactivityWarningStage: 6,
        legacyMigration: true,
      });
      if (result.ok && !result.alreadyDeleted) migrated += 1;
    }
  }

  if (migrated > 0) {
    console.log(`[inactivity] Migrated ${migrated} legacy inactivity-deactivated account(s) to deleted`);
  }
  return migrated;
};
