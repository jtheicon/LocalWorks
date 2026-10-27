import { Model } from "mongoose";
import Worker from "../model/Worker";
import Employer from "../model/Employer";
import Admin from "../model/Admin";
import AdminNotification from "../model/AdminNotification";
import {
  DEACTIVATION_MONTHS,
  wholeMonthsSince,
  isEligibleForInactivityAutomation,
  inactivityPolicyEffectiveAt,
  now,
  type WarningMonth,
} from "./inactivityPolicy";
import {
  sendInactivityDeletionEmail,
  sendInactivityWarningEmail,
  notifyAdminInactivityDeletion,
  accountLifecycleEmail,
  accountDisplayName,
  lifecycleMailRecipientName,
} from "./inactivityEmails";
import { applyAccountDeletion } from "./accountDeletion";
import { migrateLegacyInactivityDeactivatedAccounts } from "./legacyInactivityMigration";
import { emitAdminUserLifecycleUpdated } from "./adminLifecycleSocket";

const DAY_MS = 24 * 60 * 60 * 1000;
export const INACTIVITY_MONTHS = DEACTIVATION_MONTHS;

type Role = "worker" | "employer";
const MODELS: [Role, Model<any>][] = [
  ["worker", Worker],
  ["employer", Employer],
];

export interface CleanupCandidate {
  _id: string;
  role: Role;
  name: string;
  email: string;
  lastActiveAt: Date;
}

export const findInactiveAccounts = async (): Promise<CleanupCandidate[]> => {
  const results: CleanupCandidate[] = [];
  for (const [role, M] of MODELS) {
    const docs: any[] = await M.find({
      status: { $in: ["active", "verified"] },
      lastActiveAt: { $exists: true, $ne: null },
    })
      .select("name company owner email lastActiveAt updatedAt createdAt")
      .lean();
    for (const d of docs) {
      const effectiveAt = inactivityPolicyEffectiveAt(d);
      if (!effectiveAt || wholeMonthsSince(effectiveAt) < DEACTIVATION_MONTHS) continue;
      results.push({
        _id: String(d._id),
        role,
        name: accountDisplayName(d, role),
        email: d.email,
        lastActiveAt: effectiveAt,
      });
    }
  }
  return results.sort((a, b) => a.lastActiveAt.getTime() - b.lastActiveAt.getTime());
};

let lastRun: {
  at: Date;
  processed: number;
  deleted: number;
  legacyMigrated: number;
} | null = null;
export const getLastCleanupRun = () => lastRun;

const adminNotify = async (title: string, description: string) => {
  await AdminNotification.create({
    type: "verification",
    title,
    description,
    time: now().toISOString(),
    read: false,
    category: "account",
    details: description,
  });
};

const processUser = async (
  doc: any,
  role: Role,
  M: Model<any>,
  emailRecipient?: string,
) => {
  if (!isEligibleForInactivityAutomation(doc)) {
    return { deleted: false, changed: false, emailFailed: false };
  }

  const effectiveAt = inactivityPolicyEffectiveAt(doc);
  if (!effectiveAt) return { deleted: false, changed: false, emailFailed: false };

  const months = wholeMonthsSince(effectiveAt);
  const stage: number = doc.inactivityWarningStage ?? 0;
  let warningEmailFailed = false;

  const sendWarning = async (warnMonth: WarningMonth) => {
    const updated = await M.findOneAndUpdate(
      {
        _id: doc._id,
        status: { $in: ["active", "verified"] },
        inactivityWarningStage: { $lt: warnMonth },
        lastActiveAt: doc.lastActiveAt,
      },
      {
        $set: {
          inactivityWarningStage: warnMonth,
          lastInactivityNotificationAt: now(),
        },
      },
      { new: true },
    );
    if (!updated) return false;
    const to =
      emailRecipient ??
      accountLifecycleEmail(updated.email, updated.get("inactivityEmailOverride"));
    const name = await lifecycleMailRecipientName(
      {
        email: updated.email,
        inactivityEmailOverride: updated.get("inactivityEmailOverride"),
        name: updated.get("name"),
        company: updated.get("company"),
        owner: updated.get("owner"),
      },
      role,
      to,
    );
    try {
      await sendInactivityWarningEmail(to, name, warnMonth);
    } catch (err) {
      console.error("[inactivity] warning email failed:", err);
      warningEmailFailed = true;
      await M.updateOne(
        { _id: doc._id, inactivityWarningStage: warnMonth },
        {
          $set: {
            inactivityWarningStage: stage,
            lastInactivityNotificationAt: doc.lastInactivityNotificationAt ?? null,
          },
        },
      );
      return false;
    }
    return true;
  };

  if (months >= DEACTIVATION_MONTHS && stage < DEACTIVATION_MONTHS) {
    // fall through to deletion below
  } else if (months >= 5 && stage < 5) {
    const sent = await sendWarning(5);
    if (sent) {
      emitAdminUserLifecycleUpdated("inactivity_warning", {
        userId: String(doc._id),
        role,
      });
    }
    return { deleted: false, changed: sent, emailFailed: warningEmailFailed };
  } else if (months >= 4 && stage < 4) {
    const sent = await sendWarning(4);
    if (sent) {
      emitAdminUserLifecycleUpdated("inactivity_warning", {
        userId: String(doc._id),
        role,
      });
    }
    return { deleted: false, changed: sent, emailFailed: warningEmailFailed };
  } else if (months >= 3 && stage < 3) {
    const sent = await sendWarning(3);
    if (sent) {
      emitAdminUserLifecycleUpdated("inactivity_warning", {
        userId: String(doc._id),
        role,
      });
    }
    return { deleted: false, changed: sent, emailFailed: warningEmailFailed };
  } else if (months < DEACTIVATION_MONTHS || stage >= DEACTIVATION_MONTHS) {
    return { deleted: false, changed: false, emailFailed: false };
  }

  const reserved = await M.findOneAndUpdate(
    {
      _id: doc._id,
      status: { $in: ["active", "verified"] },
      inactivityWarningStage: { $lt: DEACTIVATION_MONTHS },
    },
    {
      $set: {
        inactivityWarningStage: DEACTIVATION_MONTHS,
        lastInactivityNotificationAt: now(),
      },
    },
    { new: true },
  );
  if (!reserved) {
    return { deleted: false, changed: false, emailFailed: false };
  }

  const deletionTo =
    emailRecipient ??
    accountLifecycleEmail(doc.email, doc.inactivityEmailOverride);
  const deletionGreetingName = await lifecycleMailRecipientName(
    {
      email: doc.email,
      inactivityEmailOverride: doc.inactivityEmailOverride,
      name: doc.name,
      company: doc.company,
      owner: doc.owner,
    },
    role,
    deletionTo,
  );

  const deletion = await applyAccountDeletion({
    role,
    userId: doc._id,
    reason: "inactivity",
    previousStatus: doc.status,
    lastActiveAt: doc.lastActiveAt,
    policyEffectiveAt: effectiveAt,
    inactivityWarningStage: DEACTIVATION_MONTHS,
  });

  if (!deletion.ok) {
    await M.updateOne(
      { _id: doc._id, inactivityWarningStage: DEACTIVATION_MONTHS },
      {
        $set: {
          inactivityWarningStage: stage,
          lastInactivityNotificationAt: doc.lastInactivityNotificationAt ?? null,
        },
      },
    );
    return { deleted: false, changed: false, emailFailed: false };
  }

  if (deletion.alreadyDeleted) {
    return { deleted: false, changed: false, emailFailed: false };
  }

  const deletedDoc = await M.findById(doc._id).select("email").lean();
  if (!deletedDoc) {
    return { deleted: false, changed: false, emailFailed: false };
  }

  let deletionEmailFailed = false;
  try {
    await sendInactivityDeletionEmail(deletionTo, deletionGreetingName);
  } catch (err) {
    console.error("[inactivity] deletion email failed:", err);
    deletionEmailFailed = true;
  }

  const label = `${deletionGreetingName} (${role}, ${deletedDoc.email})`;
  await adminNotify("Account deleted (inactivity)", label);
  const admin = await Admin.findOne().select("email").lean();
  if (admin?.email) {
    notifyAdminInactivityDeletion(admin.email, label).catch((e) =>
      console.error("[inactivity] admin email failed:", e),
    );
  }

  emitAdminUserLifecycleUpdated("inactivity_deletion", {
    userId: String(doc._id),
    role,
  });

  return { deleted: true, changed: true, emailFailed: deletionEmailFailed };
};

export const runInactivityMonitor = async (options?: {
  userIds?: string[];
  emailRecipient?: string;
}) => {
  const started = now();
  let legacyMigrated = 0;
  if (!options?.userIds) {
    legacyMigrated = await migrateLegacyInactivityDeactivatedAccounts();
    if (legacyMigrated > 0) {
      emitAdminUserLifecycleUpdated("inactivity_job");
    }
  }

  let processed = 0;
  let deleted = 0;
  let emailFailures = 0;
  const userFilter = options?.userIds ? { _id: { $in: options.userIds } } : {};

  for (const [role, M] of MODELS) {
    const users = await M.find({
      status: { $in: ["active", "verified"] },
      lastActiveAt: { $exists: true },
      ...userFilter,
    })
      .select(
        "name company owner email lastActiveAt updatedAt createdAt inactivityWarningStage lastInactivityNotificationAt inactivityEmailOverride status",
      )
      .lean();

    for (const doc of users) {
      try {
        processed += 1;
        const result = await processUser(doc, role, M, options?.emailRecipient);
        if (result.deleted) deleted += 1;
        if (result.emailFailed) emailFailures += 1;
      } catch (err) {
        console.error("[inactivity] user processing failed:", doc._id, err);
      }
    }
  }

  lastRun = { at: started, processed, deleted, legacyMigrated };
  console.log(
    `[inactivity] Processed ${processed} account(s), deleted ${deleted}, legacy migrated ${legacyMigrated}`,
  );
  if (processed > 0) {
    emitAdminUserLifecycleUpdated("inactivity_job");
  }
  return { processed, deleted, emailFailures, legacyMigrated };
};

/** @deprecated alias */
export const deactivateInactiveAccounts = async () => {
  await runInactivityMonitor();
  return findInactiveAccounts();
};

/** When false, startup/daily inactivity job is not scheduled (see scheduleAccountCleanup). */
export const shouldScheduleAccountCleanup = (): boolean => {
  if (process.env.ACCOUNT_CLEANUP === "off") return false;
  if (process.env.NODE_ENV !== "production" && process.env.ACCOUNT_CLEANUP !== "on") return false;
  return true;
};

export const scheduleAccountCleanup = () => {
  if (!shouldScheduleAccountCleanup()) return;
  const run = () => runInactivityMonitor().catch((err) => console.error("[inactivity] failed:", err));
  setTimeout(run, 60 * 1000);
  setInterval(run, DAY_MS);
};

export { recordQualifyingActivity, touchActivity } from "./activityTracking";
