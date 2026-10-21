// Automated deactivation of accounts that have been inactive for 6+ months.
//
// "Active" means a login or any authenticated request (see touchActivity below).
// Accounts created before activity tracking fall back to their last profile update.
//
// Deactivated accounts get status "not_active" with deactivation.reason "inactivity":
//   - they disappear from Find Workers / employer listings like any inactive account
//   - logging in again with the correct password reactivates them automatically
//     (accounts an admin deactivated stay blocked - see the login controllers)
import { Model } from "mongoose";
import Worker from "../model/Worker";
import Employer from "../model/Employer";
import { sendEmail } from "./emailOtp";

export const INACTIVITY_MONTHS = Number(process.env.INACTIVITY_MONTHS) || 6;
const DAY_MS = 24 * 60 * 60 * 1000;

const cutoffDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - INACTIVITY_MONTHS);
  return d;
};

const inactiveFilter = (cutoff: Date) => ({
  status: "active",
  $or: [
    { lastActiveAt: { $lt: cutoff } },
    { lastActiveAt: { $exists: false }, updatedAt: { $lt: cutoff } },
  ],
});

type Role = "worker" | "employer";
const MODELS: [Role, Model<any>][] = [["worker", Worker], ["employer", Employer]];

export interface CleanupCandidate {
  _id: string;
  role: Role;
  name: string;
  email: string;
  lastActiveAt: Date;
}

export const findInactiveAccounts = async (): Promise<CleanupCandidate[]> => {
  const cutoff = cutoffDate();
  const results: CleanupCandidate[] = [];
  for (const [role, M] of MODELS) {
    const docs: any[] = await M.find(inactiveFilter(cutoff)).select("name company email lastActiveAt updatedAt").lean();
    for (const d of docs) {
      results.push({
        _id: String(d._id),
        role,
        name: d.name ?? d.company,
        email: d.email,
        lastActiveAt: d.lastActiveAt ?? d.updatedAt,
      });
    }
  }
  return results.sort((a, b) => a.lastActiveAt.getTime() - b.lastActiveAt.getTime());
};

let lastRun: { at: Date; deactivated: number } | null = null;
export const getLastCleanupRun = () => lastRun;

export const deactivateInactiveAccounts = async () => {
  const candidates = await findInactiveAccounts();
  const now = new Date();

  for (const c of candidates) {
    const M = c.role === "worker" ? Worker : Employer;
    // Re-check the condition in the update so a user who just logged in is not deactivated.
    const result = await (M as Model<any>).updateOne(
      { _id: c._id, ...inactiveFilter(cutoffDate()) },
      { $set: { status: "not_active", deactivation: { reason: "inactivity", at: now, lastActiveAt: c.lastActiveAt } } },
      { timestamps: false },
    );
    if (result.modifiedCount) {
      sendEmail(
        c.email,
        "Your LocalWorks account was deactivated due to inactivity",
        `Hi ${c.name}, your LocalWorks account has been inactive for over ${INACTIVITY_MONTHS} months, so we deactivated it and removed it from public listings. You can reactivate it anytime by logging in with your email and password.`,
      ).catch((err) => console.error("[cleanup] email failed:", err));
    }
  }

  lastRun = { at: now, deactivated: candidates.length };
  console.log(`[cleanup] Deactivated ${candidates.length} account(s) inactive for ${INACTIVITY_MONTHS}+ months`);
  return candidates;
};

// Runs once shortly after startup, then daily. Set ACCOUNT_CLEANUP=off to disable.
export const scheduleAccountCleanup = () => {
  if (process.env.ACCOUNT_CLEANUP === "off") return;
  const run = () => deactivateInactiveAccounts().catch((err) => console.error("[cleanup] failed:", err));
  setTimeout(run, 60 * 1000); // give the DB connection time to open
  setInterval(run, DAY_MS);
};

// Called on login and on authenticated requests. Writes at most every 6 hours per user.
const lastTouched = new Map<string, number>();
const TOUCH_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const touchActivity = (id: string | undefined, role: string | undefined, force = false) => {
  if (!id || (role !== "worker" && role !== "employer")) return;
  const key = `${role}:${id}`;
  if (!force && Date.now() - (lastTouched.get(key) ?? 0) < TOUCH_INTERVAL_MS) return;
  lastTouched.set(key, Date.now());

  const M = (role === "worker" ? Worker : Employer) as Model<any>;
  M.updateOne({ _id: id }, { $set: { lastActiveAt: new Date() } }, { timestamps: false })
    .catch((err) => console.error("[activity] update failed:", err));
};
