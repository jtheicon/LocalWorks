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
  sendDeactivationEmail,
  sendInactivityWarningEmail,
  notifyAdminDeactivation,
} from "./inactivityEmails";
import ReactivationToken from "../model/ReactivationToken";
import { hashReactivationToken, issueReactivationToken } from "./reactivationTokens";
import { emitAdminUserLifecycleUpdated } from "./adminLifecycleSocket";

const DAY_MS = 24 * 60 * 60 * 1000;
export const INACTIVITY_MONTHS = DEACTIVATION_MONTHS;

type Role = "worker" | "employer";
const MODELS: [Role, Model<any>][] = [
  ["worker", Worker],
  ["employer", Employer],
];

const appOrigin = () => {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const cors = process.env.CORS_ORIGINS?.split(",")[0]?.trim();
  return cors || "http://localhost:8080";
};

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
      .select("name company email lastActiveAt updatedAt createdAt")
      .lean();
    for (const d of docs) {
      const effectiveAt = inactivityPolicyEffectiveAt(d);
      if (!effectiveAt || wholeMonthsSince(effectiveAt) < DEACTIVATION_MONTHS) continue;
      results.push({
        _id: String(d._id),
        role,
        name: d.name ?? d.company,
        email: d.email,
        lastActiveAt: effectiveAt,
      });
    }
  }
  return results.sort((a, b) => a.lastActiveAt.getTime() - b.lastActiveAt.getTime());
};

let lastRun: { at: Date; processed: number; deactivated: number } | null = null;
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

const processUser = async (doc: any, role: Role, M: Model<any>) => {
  if (!isEligibleForInactivityAutomation(doc)) return { deactivated: false, changed: false };

  const effectiveAt = inactivityPolicyEffectiveAt(doc);
  if (!effectiveAt) return { deactivated: false, changed: false };

  const months = wholeMonthsSince(effectiveAt);
  const stage: number = doc.inactivityWarningStage ?? 0;

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
    const name = updated.name ?? updated.company ?? "there";
    try {
      await sendInactivityWarningEmail(updated.email, name, warnMonth);
    } catch (err) {
      console.error("[inactivity] warning email failed:", err);
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
    // fall through to deactivation below
  } else if (months >= 5 && stage < 5) {
    const sent = await sendWarning(5);
    if (sent) {
      emitAdminUserLifecycleUpdated("inactivity_warning", {
        userId: String(doc._id),
        role,
      });
    }
    return { deactivated: false, changed: sent };
  } else if (months >= 4 && stage < 4) {
    const sent = await sendWarning(4);
    if (sent) {
      emitAdminUserLifecycleUpdated("inactivity_warning", {
        userId: String(doc._id),
        role,
      });
    }
    return { deactivated: false, changed: sent };
  } else if (months >= 3 && stage < 3) {
    const sent = await sendWarning(3);
    if (sent) {
      emitAdminUserLifecycleUpdated("inactivity_warning", {
        userId: String(doc._id),
        role,
      });
    }
    return { deactivated: false, changed: sent };
  } else if (months < DEACTIVATION_MONTHS || stage >= DEACTIVATION_MONTHS) {
    return { deactivated: false, changed: false };
  }

  let reactivationUrl = `${appOrigin()}/account/reactivation/request`;
  let tokenRaw: string | null = null;
  try {
    const issued = await issueReactivationToken(String(doc._id), role);
    tokenRaw = issued.raw;
    reactivationUrl = `${appOrigin()}/account/reactivation/request?token=${encodeURIComponent(issued.raw)}`;
  } catch (err) {
    console.error("[inactivity] reactivation token failed:", err);
    return { deactivated: false, changed: false };
  }

  const deactivatedDoc = await M.findOneAndUpdate(
    {
      _id: doc._id,
      status: { $in: ["active", "verified"] },
      inactivityWarningStage: { $lt: DEACTIVATION_MONTHS },
    },
    {
      $set: {
        status: "not_active",
        inactivityWarningStage: DEACTIVATION_MONTHS,
        lastInactivityNotificationAt: now(),
        deactivation: {
          reason: "inactivity",
          at: now(),
          lastActiveAt: doc.lastActiveAt,
          policyEffectiveAt: effectiveAt,
          previousStatus: doc.status,
        },
        reactivationRequestStatus: null,
      },
    },
    { new: true },
  );

  if (!deactivatedDoc) {
    if (tokenRaw) {
      await ReactivationToken.deleteMany({ tokenHash: hashReactivationToken(tokenRaw) });
    }
    return { deactivated: false, changed: false };
  }

  const name = deactivatedDoc.name ?? deactivatedDoc.company ?? "User";
  try {
    await sendDeactivationEmail(deactivatedDoc.email, name, reactivationUrl);
  } catch (err) {
    console.error("[inactivity] deactivation email failed:", err);
  }

  const label = `${name} (${role}, ${deactivatedDoc.email})`;
  await adminNotify("Account deactivated (inactivity)", label);
  const admin = await Admin.findOne().select("email").lean();
  if (admin?.email) {
    notifyAdminDeactivation(admin.email, label).catch((e) =>
      console.error("[inactivity] admin email failed:", e),
    );
  }

  return { deactivated: true, changed: true };
};

export const runInactivityMonitor = async () => {
  const started = now();
  let processed = 0;
  let deactivated = 0;

  for (const [role, M] of MODELS) {
    const users = await M.find({
      status: { $in: ["active", "verified"] },
      lastActiveAt: { $exists: true },
    })
      .select(
        "name company email lastActiveAt updatedAt createdAt inactivityWarningStage lastInactivityNotificationAt status",
      )
      .lean();

    for (const doc of users) {
      try {
        processed += 1;
        const result = await processUser(doc, role, M);
        if (result.deactivated) deactivated += 1;
      } catch (err) {
        console.error("[inactivity] user processing failed:", doc._id, err);
      }
    }
  }

  lastRun = { at: started, processed, deactivated };
  console.log(
    `[inactivity] Processed ${processed} account(s), deactivated ${deactivated}`,
  );
  if (processed > 0) {
    emitAdminUserLifecycleUpdated("inactivity_job");
  }
  return { processed, deactivated };
};

/** @deprecated alias */
export const deactivateInactiveAccounts = async () => {
  await runInactivityMonitor();
  return findInactiveAccounts();
};

export const scheduleAccountCleanup = () => {
  if (process.env.ACCOUNT_CLEANUP === "off") return;
  const run = () => runInactivityMonitor().catch((err) => console.error("[inactivity] failed:", err));
  setTimeout(run, 60 * 1000);
  setInterval(run, DAY_MS);
};

export { recordQualifyingActivity, touchActivity } from "./activityTracking";
