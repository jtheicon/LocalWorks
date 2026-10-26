/**
 * Demo fixtures for account inactivity, warnings, deactivation, and reactivation.
 *
 * Accounts use @localworks-inactivity.test by default and deterministic IDs so the
 * script is idempotent (--apply only inserts missing docs) and reversible (--reset).
 * INACTIVITY_DEMO_EMAIL routes the overdue worker's deactivation email to a test inbox;
 * it is never used as the seeded account's registered email.
 *
 * Usage (from backend/):
 *   npm run seed:inactivity                         preview
 *   npm run seed:inactivity -- --apply              write to DB
 *   npm run seed:inactivity -- --reset              remove demo docs only
 *   npm run seed:inactivity -- --apply --run-job    seed then run inactivity monitor once
 *   npm run seed:inactivity -- --check-login         verify demo worker login without changing DB
 *   npm run seed:inactivity -- --inspect-account     inspect a worker/employer account without changing DB
 *   npm run seed:inactivity -- --use-email-account   preview lifecycle test for INACTIVITY_DEMO_ACCOUNT_EMAIL
 *   npm run seed:inactivity -- --use-email-account   preview lifecycle test for INACTIVITY_DEMO_ACCOUNT_EMAIL
 *
 * Required for --apply / --reset:
 *   SEED_CONFIRM_PRODUCTION=I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION
 * Required for --apply:
 *   SEED_DEMO_PASSWORD=<min 8 chars, shared by all demo logins>
 * Optional:
 *   INACTIVITY_DEMO_EMAIL=<inbox for the deactivation email>
 */
import mongoose, { Model, Types } from "mongoose";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import Industry from "../model/Industry";
import Employer from "../model/Employer";
import Worker from "../model/Worker";
import ReactivationToken from "../model/ReactivationToken";
import AdminNotification from "../model/AdminNotification";
import {
  subtractCalendarMonths,
  computeLifecycle,
  wholeMonthsSince,
  DEACTIVATION_MONTHS,
  inactivityPolicyEffectiveAt,
  adminActivityReference,
} from "../services/inactivityPolicy";
import { buildInactivitySeedTimeline } from "./inactivitySeedTimeline";
import { hashReactivationToken } from "../services/reactivationTokens";
import { runInactivityMonitor } from "../services/inactivityMonitor";
import { notifyAdminLifecycleFromScript } from "../services/adminLifecycleSocket";

const PRODUCTION_CONFIRMATION = "I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION";
const EMAIL_DOMAIN = "localworks-inactivity.test";
const DEMO_DUE_ACCOUNT_EMAIL = `worker-due-deactivation@${EMAIL_DOMAIN}`;
const inactivityDemoEmailRecipient = process.env.INACTIVITY_DEMO_EMAIL?.trim();
/** Printed in the demo guide; maps to deactivated worker "elena". */
export const DEMO_REACTIVATION_TOKEN = "localworks-demo-reactivate-token-v1";

const oid = (key: string) =>
  new Types.ObjectId(createHash("md5").update(`localworks-inactivity:${key}`).digest("hex").slice(0, 24));

const monthsAgo = (months: number) => subtractCalendarMonths(new Date(), months);

const sanitizeError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[redacted MongoDB URI]");
};

const appOrigin = () => {
  const u = process.env.APP_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  const c = process.env.CORS_ORIGINS?.split(",")[0]?.trim();
  return c || "http://localhost:8080";
};

type FixtureMeta = {
  key: string;
  role: "worker" | "employer";
  label: string;
  email: string;
};

const FIXTURES: FixtureMeta[] = [
  { key: "worker-active", role: "worker", label: "Active (recent login)", email: `worker-active@${EMAIL_DOMAIN}` },
  { key: "worker-inactive-3", role: "worker", label: "Inactive ~3 months (due 3-mo warning on next job run)", email: `worker-inactive-3@${EMAIL_DOMAIN}` },
  { key: "worker-inactive-4", role: "worker", label: "Inactive ~4 months (3-mo warning already sent)", email: `worker-inactive-4@${EMAIL_DOMAIN}` },
  { key: "worker-inactive-5", role: "worker", label: "Inactive ~5 months (4-mo warning sent; 5-mo due on next job)", email: `worker-inactive-5@${EMAIL_DOMAIN}` },
  { key: "worker-due-deactivation", role: "worker", label: "Active, due for deletion (6 months inactive)", email: DEMO_DUE_ACCOUNT_EMAIL },
  { key: "worker-deactivated", role: "worker", label: "Deleted (6+ months inactivity)", email: `worker-deactivated@${EMAIL_DOMAIN}` },
  { key: "worker-reactivation-pending", role: "worker", label: "Deactivated + pending reactivation request", email: `worker-reactivation-pending@${EMAIL_DOMAIN}` },
  { key: "worker-legacy", role: "worker", label: "Legacy (no lastActiveAt — excluded from auto job)", email: `worker-legacy@${EMAIL_DOMAIN}` },
  {
    key: "worker-profile-idle",
    role: "worker",
    label: "Profile idle 8+ mo with recent login (policy uses profile date)",
    email: `worker-profile-idle@${EMAIL_DOMAIN}`,
  },
  { key: "employer-active", role: "employer", label: "Employer active", email: `employer-active@${EMAIL_DOMAIN}` },
  { key: "employer-inactive-3", role: "employer", label: "Employer inactive ~3 months", email: `employer-inactive-3@${EMAIL_DOMAIN}` },
  { key: "employer-admin-off", role: "employer", label: "Admin deactivated (login blocked, no self-reactivate)", email: `employer-admin-off@${EMAIL_DOMAIN}` },
];

const buildDocuments = (passwordHash: string, industryId: Types.ObjectId, seedRef = new Date()) => {
  const tl = (idleMonths: number) => buildInactivitySeedTimeline(seedRef, idleMonths);
  const s3 = tl(3);
  const s4 = tl(4);
  const s5 = tl(5);
  const s6 = tl(DEACTIVATION_MONTHS);

  const baseWorker = (key: string, name: string, extra: Record<string, unknown>) => ({
    _id: oid(key),
    name,
    email: `${key}@${EMAIL_DOMAIN}`,
    password: passwordHash,
    phoneNumber: "+639170000099",
    role: "worker",
    skill: "Construction",
    skills: ["General Labor"],
    jobTitle: "Demo Worker",
    location: "Dagupan City, Pangasinan",
    yearsOfExperience: "3 years",
    availability: "Full-Time",
    expected_salary: "N/A",
    about_me: "Inactivity demo account",
    status: "active",
    ...extra,
  });

  const baseEmployer = (key: string, company: string, extra: Record<string, unknown>) => ({
    _id: oid(key),
    company,
    owner: "Demo Owner",
    email: `${key}@${EMAIL_DOMAIN}`,
    password: passwordHash,
    phone: "+639180000099",
    industry: industryId,
    location: "Dagupan City, Pangasinan",
    description: "Inactivity demo employer",
    noOfEmployees: 5,
    website: "N/A",
    status: "active",
    role: "employer",
    ...extra,
  });

  const workers = [
    baseWorker("worker-active", "Ana Active", {
      status: "active",
      lastActiveAt: monthsAgo(1),
      inactivityWarningStage: 0,
    }),
    baseWorker("worker-inactive-3", "Ben ThreeMonths", {
      status: "active",
      lastActiveAt: s3.lastActiveAt,
      updatedAt: s3.lastActiveAt,
      createdAt: s3.createdAtBackdate,
      inactivityWarningStage: s3.inactivityWarningStage,
      lastInactivityNotificationAt: s3.lastInactivityNotificationAt,
    }),
    baseWorker("worker-inactive-4", "Carla FourMonths", {
      status: "active",
      lastActiveAt: s4.lastActiveAt,
      updatedAt: s4.lastActiveAt,
      createdAt: s4.createdAtBackdate,
      inactivityWarningStage: s4.inactivityWarningStage,
      lastInactivityNotificationAt: s4.lastInactivityNotificationAt,
    }),
    baseWorker("worker-inactive-5", "Diego FiveMonths", {
      status: "active",
      lastActiveAt: s5.lastActiveAt,
      updatedAt: s5.lastActiveAt,
      createdAt: s5.createdAtBackdate,
      inactivityWarningStage: s5.inactivityWarningStage,
      lastInactivityNotificationAt: s5.lastInactivityNotificationAt,
    }),
    baseWorker("worker-due-deactivation", "Mika DueDeactivation", {
      email: DEMO_DUE_ACCOUNT_EMAIL,
      ...(inactivityDemoEmailRecipient
        ? { inactivityEmailOverride: inactivityDemoEmailRecipient }
        : {}),
      status: "active",
      lastActiveAt: s6.lastActiveAt,
      updatedAt: s6.lastActiveAt,
      createdAt: s6.createdAtBackdate,
      inactivityWarningStage: s6.inactivityWarningStage,
      lastInactivityNotificationAt: s6.lastInactivityNotificationAt,
    }),
    baseWorker("worker-deactivated", "Elena Deleted", {
      status: "deleted",
      lastActiveAt: monthsAgo(DEACTIVATION_MONTHS),
      inactivityWarningStage: DEACTIVATION_MONTHS,
      lastInactivityNotificationAt: monthsAgo(DEACTIVATION_MONTHS),
      deactivation: {
        reason: "inactivity",
        at: monthsAgo(0),
        lastActiveAt: monthsAgo(DEACTIVATION_MONTHS),
        deleted: true,
      },
      reactivationRequestStatus: null,
    }),
    baseWorker("worker-reactivation-pending", "Felix PendingReview", {
      status: "not_active",
      lastActiveAt: monthsAgo(2),
      inactivityWarningStage: 0,
      deactivation: {
        reason: "admin",
        at: monthsAgo(1),
        previousStatus: "active",
      },
      reactivationRequestedAt: monthsAgo(0),
      reactivationRequestStatus: "pending",
    }),
    baseWorker("worker-legacy", "Grace Legacy", {
      status: "active",
      // intentional: no lastActiveAt
      inactivityWarningStage: 0,
    }),
    baseWorker("worker-profile-idle", "Hector ProfileIdle", {
      status: "active",
      lastActiveAt: new Date(),
      updatedAt: monthsAgo(8),
      inactivityWarningStage: 0,
    }),
  ];

  const employers = [
    baseEmployer("employer-active", "Active Builders Co.", {
      status: "active",
      lastActiveAt: monthsAgo(1),
    }),
    baseEmployer("employer-inactive-3", "Idle Plumbing Inc.", {
      status: "active",
      lastActiveAt: monthsAgo(3),
      inactivityWarningStage: 0,
    }),
    baseEmployer("employer-admin-off", "Admin Closed Shop", {
      status: "not_active",
      lastActiveAt: monthsAgo(2),
      deactivation: { reason: "admin", at: monthsAgo(1) },
    }),
  ];

  const reactivationTokens = [
    {
      _id: oid("token:elena"),
      userId: oid("worker-reactivation-pending"),
      role: "worker",
      tokenHash: hashReactivationToken(DEMO_REACTIVATION_TOKEN),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usedAt: null,
    },
  ];

  const adminNotifications = [
    {
      _id: oid("admin-notif:reactivation"),
      type: "verification",
      title: "Reactivation request pending",
      description: `Felix PendingReview (worker, worker-reactivation-pending@${EMAIL_DOMAIN})`,
      time: new Date().toISOString(),
      read: false,
      category: "account",
      details: String(oid("worker-reactivation-pending")),
    },
  ];

  return {
    workers,
    employers,
    reactivationTokens,
    adminNotifications,
  };
};

const printShowcaseGuide = (password: string) => {
  const origin = appOrigin();
  console.log("\n========== INACTIVITY DEMO GUIDE ==========\n");
  console.log("Worker login test (active account):");
  console.log(`  Email: worker-active@${EMAIL_DOMAIN}`);
  console.log(`  Password: ${password ? "(set in SEED_DEMO_PASSWORD)" : "(preview only)"}`);
  console.log("  Sign in with the Worker tab. Gmail is only used as the lifecycle notification inbox.\n");
  console.log("Admin (use your real admin login):");
  console.log(`  ${origin}/admin-dashboard`);
  console.log("  • Reactivation requests → approve/reject Felix PendingReview (admin deactivation demo)");
  console.log("  • User management → filter Active / Inactive / Deactivated\n");

  console.log("Demo worker logins (password from SEED_DEMO_PASSWORD):");
  for (const f of FIXTURES.filter((x) => x.role === "worker")) {
    console.log(`  ${f.label}`);
    console.log(`    Email: ${f.email}`);
  }
  console.log(`  Password: ${password ? "(set in SEED_DEMO_PASSWORD)" : "(preview only)"}\n`);

  console.log("Six-month deletion test:");
  console.log(`  Login email: worker-due-deactivation@${EMAIL_DOMAIN}`);
  console.log(`  Password: ${password ? "(set in SEED_DEMO_PASSWORD)" : "(preview only)"}`);
  console.log("  After --apply --run-job, Worker login should return ACCOUNT_DELETED (403).");
  console.log("  A deletion notice is sent to INACTIVITY_DEMO_EMAIL when the seed runs --run-job.");
  console.log("  To use LocalWorks again, register a new account (same email is allowed after release on signup).\n");

  console.log("Reactivation link (legacy admin-deactivated Felix PendingReview):");
  console.log(
    `  ${origin}/account/reactivation/request?token=${encodeURIComponent(DEMO_REACTIVATION_TOKEN)}\n`,
  );

  console.log("Run this repeatable test from backend/ (verify MONGO_URI points to a test database first):");
  console.log("  npm run seed:inactivity");
  console.log("  npm run seed:inactivity -- --apply --run-job\n");

  console.log("Expected lifecycle (policy effective date, computed now):");
  const docs = buildDocuments("x", oid("industry:placeholder"));
  for (const w of docs.workers) {
    const row = w as Record<string, unknown>;
    const lc = computeLifecycle(row as { status: string; lastActiveAt?: Date | null; updatedAt?: Date });
    const eff = inactivityPolicyEffectiveAt(row as { lastActiveAt?: Date | null; updatedAt?: Date });
    const basis = adminActivityReference(row as { lastActiveAt?: Date | null; updatedAt?: Date }).basis;
    const mo = eff ? wholeMonthsSince(eff) : "n/a";
    console.log(`  ${w.email} → ${lc} (${mo} mo idle, basis ${basis})`);
  }
  for (const e of docs.employers) {
    const row = e as Record<string, unknown>;
    const lc = computeLifecycle(row as { status: string; lastActiveAt?: Date | null; updatedAt?: Date });
    const eff = inactivityPolicyEffectiveAt(row as { lastActiveAt?: Date | null; updatedAt?: Date });
    const mo = eff ? wholeMonthsSince(eff) : "n/a";
    console.log(`  ${e.email} → ${lc} (${mo} mo)`);
  }
  console.log("\nRemove demo data: npm run seed:inactivity -- --reset\n");
};

const run = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;
  const apply = process.argv.includes("--apply");
  const reset = process.argv.includes("--reset");
  const runJob = process.argv.includes("--run-job");
  const checkLogin = process.argv.includes("--check-login");
  const inspectAccount = process.argv.includes("--inspect-account");
  const useEmailAccount = process.argv.includes("--use-email-account");
  const password = process.env.SEED_DEMO_PASSWORD ?? "";
  const targetEmail = process.env.INACTIVITY_DEMO_ACCOUNT_EMAIL?.trim().toLowerCase();
  const loginEmail =
    process.env.WORKER_LOGIN_EMAIL?.trim().toLowerCase() || `worker-active@${EMAIL_DOMAIN}`;

  if (Number(apply) + Number(reset) + Number(checkLogin) + Number(inspectAccount) > 1) {
    throw new Error("Use only one of --apply, --reset, --check-login, or --inspect-account.");
  }
  if (useEmailAccount && reset) throw new Error("--use-email-account cannot be combined with --reset.");
  if ((checkLogin || inspectAccount) && runJob) {
    throw new Error("--check-login and --inspect-account cannot be combined with --run-job.");
  }
  if (useEmailAccount && !targetEmail) {
    throw new Error("Set INACTIVITY_DEMO_ACCOUNT_EMAIL to the worker account email you explicitly want to use.");
  }
  if (useEmailAccount && !runJob) {
    console.log("Previewing the requested email-account lifecycle target. No database changes will be made.");
  }
  if (useEmailAccount && apply && !runJob) {
    throw new Error("Use --apply --run-job together with --use-email-account; otherwise the command only previews.");
  }
  if (useEmailAccount && runJob && !apply) {
    throw new Error("Applying an existing account lifecycle test requires --apply.");
  }
  if (!mongoUri) throw new Error("MONGO_URI is required. Load env with dotenvx (see npm run seed:inactivity).");
  if ((apply || reset) && process.env.SEED_CONFIRM_PRODUCTION !== PRODUCTION_CONFIRMATION) {
    throw new Error(`Database writes require SEED_CONFIRM_PRODUCTION=${PRODUCTION_CONFIRMATION}.`);
  }
  if (((apply && !useEmailAccount) || checkLogin) && password.length < 8) {
    throw new Error("Set SEED_DEMO_PASSWORD (min 8 characters) for demo account passwords.");
  }

  const passwordHash = apply ? await bcrypt.hash(password, 12) : "preview";

  await mongoose.connect(mongoUri);

  try {
    if (useEmailAccount) {
      const escapedEmail = targetEmail!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const target = await Worker.findOne({
        email: { $regex: `^${escapedEmail}$`, $options: "i" },
      }).select("_id email role status deactivation");

      if (!target) {
        throw new Error(`No worker account found for ${targetEmail} in the configured database.`);
      }
      if (target.status === "deleted" || target.status === "pending") {
        throw new Error(`Refusing lifecycle test for a ${target.status} worker account. Only an active or already inactivity-deactivated worker is allowed.`);
      }
      if (
        target.status === "not_active" &&
        target.get("deactivation")?.reason !== "inactivity"
      ) {
        throw new Error("Refusing to reactivate an account deactivated by an administrator.");
      }

      const notificationEmail =
        process.env.INACTIVITY_DEMO_EMAIL?.trim() || target.email;
      console.log(`Target worker: ${target.email}`);
      console.log(`Current status: ${target.status}`);
      console.log(`Lifecycle email recipient: ${notificationEmail}`);
      console.log("Password will not be changed.");

      if (!runJob) {
        console.log("Preview only. Add --apply --run-job to set this worker's inactivity date to six months ago, deactivate it, and send the reactivation link.");
        return;
      }
      if (!apply) {
        throw new Error("--use-email-account --run-job requires --apply.");
      }

      const activityAt = monthsAgo(DEACTIVATION_MONTHS);
      await Worker.collection.updateOne(
        { _id: target._id },
        {
          $set: {
            status: "active",
            lastActiveAt: activityAt,
            updatedAt: activityAt,
            inactivityWarningStage: DEACTIVATION_MONTHS - 1,
            lastInactivityNotificationAt: monthsAgo(DEACTIVATION_MONTHS - 1),
            inactivityEmailOverride: notificationEmail,
            deactivation: null,
            reactivationRequestStatus: null,
          },
          $unset: {
            reactivationRequestedAt: "",
            reactivationReviewedAt: "",
            reactivationReviewedBy: "",
            reactivationRejectionReason: "",
          },
        },
      );

      console.log("\nRunning inactivity job for this worker only…");
      const result = await runInactivityMonitor({
        userIds: [String(target._id)],
        emailRecipient: notificationEmail,
      });
      console.log(
        `  processed=${result.processed}, deleted=${result.deleted}, emailFailures=${result.emailFailures}`,
      );
      if (result.processed !== 1 || result.deleted !== 1) {
        throw new Error("The selected worker was not deleted. Check the inactivity job output and account status.");
      }
      if (result.emailFailures > 0) {
        throw new Error("The selected worker was deleted, but email delivery failed. Check Gmail SMTP configuration.");
      }
      console.log("Worker login should now return ACCOUNT_DELETED; register again to create a new account.");
      await notifyAdminLifecycleFromScript();
      return;
    }

    if (inspectAccount) {
      const escapedEmail = loginEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const email = { $regex: `^${escapedEmail}$`, $options: "i" };
      const [worker, employer] = await Promise.all([
        Worker.findOne({ email }).select("email role status").lean(),
        Employer.findOne({ email }).select("email role status").lean(),
      ]);
      const accounts = [
        ...(worker ? [{ ...worker, accountType: "worker" }] : []),
        ...(employer ? [{ ...employer, accountType: "employer" }] : []),
      ];
      console.log(`Account inspection for ${loginEmail}`);
      if (!accounts.length) {
        console.log("  No worker or employer account found in the database configured by MONGO_URI.");
      } else {
        for (const account of accounts) {
          console.log(`  Account type: ${account.accountType}`);
          console.log(`  Stored email: ${account.email}`);
          console.log(`  Status: ${account.status}`);
        }
      }
      return;
    }

    if (checkLogin) {
      const worker = await Worker.findOne({ email: loginEmail }).select("email password status role");
      if (!worker) {
        throw new Error(`No worker account found for ${loginEmail} in the database configured by MONGO_URI.`);
      }
      const passwordMatches = await bcrypt.compare(password, worker.password);
      const loginAllowed =
        passwordMatches &&
        worker.role === "worker" &&
        worker.status !== "pending" &&
        worker.status !== "not_active" &&
        worker.status !== "deleted";

      console.log(`Worker login check for ${worker.email}`);
      console.log(`  Account found: yes`);
      console.log(`  Role: ${worker.role}`);
      console.log(`  Status: ${worker.status}`);
      console.log(`  Password matches SEED_DEMO_PASSWORD: ${passwordMatches ? "yes" : "no"}`);
      console.log(`  Worker login allowed: ${loginAllowed ? "yes" : "no"}`);

      if (!loginAllowed) {
        throw new Error("Worker login check failed. Apply the seed with this password, then run --check-login again.");
      }
      return;
    }

    let industry = await Industry.findOne({ title: "Construction" }).select("_id");
    if (!industry && apply) {
      industry = await Industry.create({ title: "Construction" });
      console.log("- Created Construction industry for demo employers");
    }
    if (!industry) {
      throw new Error("Construction industry not found. Start the server once or run seed:demo first.");
    }

    const docs = buildDocuments(passwordHash, industry._id as Types.ObjectId);

    const groups = [
      { label: "Workers", model: Worker, docs: docs.workers },
      { label: "Employers", model: Employer, docs: docs.employers },
      { label: "Reactivation tokens", model: ReactivationToken, docs: docs.reactivationTokens },
      { label: "Admin notifications", model: AdminNotification, docs: docs.adminNotifications },
    ] as { label: string; model: Model<any>; docs: Record<string, unknown>[] }[];

    for (const { label, model, docs: groupDocs } of groups) {
      for (const doc of groupDocs) {
        try {
          await new model(doc).validate();
        } catch (error) {
          throw new Error(`${label} ${String(doc._id)} invalid: ${sanitizeError(error)}`);
        }
      }
    }

    for (const { model, docs: groupDocs } of groups.filter((g) => g.model === Worker || g.model === Employer)) {
      const clashes = await model
        .find({
          email: { $in: groupDocs.map((d) => d.email) },
          _id: { $nin: groupDocs.map((d) => d._id) },
        })
        .select("email");
      if (clashes.length) {
        throw new Error(`Email clash with non-demo account: ${clashes.map((c) => c.email).join(", ")}`);
      }
    }

    const mode = reset ? "Reset" : apply ? "Apply" : "Preview";
    console.log(`${mode}: inactivity demo fixtures\n`);

    if (reset) {
      for (const { label, model, docs: groupDocs } of [...groups].reverse()) {
        const { deletedCount } = await model.deleteMany({ _id: { $in: groupDocs.map((d) => d._id) } });
        console.log(`- ${label}: removed ${deletedCount}`);
      }
      console.log("\nInactivity demo data removed.");
      return;
    }

    let totalNew = 0;
    for (const { label, model, docs: groupDocs } of groups) {
      const existing = new Set(
        (await model.find({ _id: { $in: groupDocs.map((d) => d._id) } }).select("_id").lean()).map((d: any) =>
          String(d._id),
        ),
      );
      const missing = groupDocs.filter((d) => !existing.has(String(d._id)));
      totalNew += missing.length;
      console.log(`- ${label}: ${missing.length} new, ${existing.size} already present`);

      if (apply && missing.length) {
        await model.collection.insertMany(missing.map((d) => new model(d).toObject({ depopulate: true })));
      }
    }

    if (apply) {
      const activeWorkerResult = await Worker.collection.updateOne(
        { _id: oid("worker-active") },
        {
          $set: {
            password: passwordHash,
            status: "active",
            lastActiveAt: new Date(),
            inactivityWarningStage: 0,
          },
          $unset: {
            deactivation: "",
            reactivationRequestedAt: "",
            reactivationRequestStatus: "",
            reactivationReviewedAt: "",
            reactivationReviewedBy: "",
            reactivationRejectionReason: "",
          },
        },
      );
      if (activeWorkerResult.matchedCount !== 1) {
        throw new Error("The seeded active worker account was not found after fixture insertion.");
      }
      console.log("- Active worker login fixture: password refreshed and account enabled");
    }

    if (apply && inactivityDemoEmailRecipient) {
      const result = await Worker.updateOne(
        { _id: oid("worker-due-deactivation") },
        { $set: { inactivityEmailOverride: inactivityDemoEmailRecipient } },
      );
      console.log(`- Demo worker lifecycle email override: ${result.matchedCount ? "configured" : "worker not found"}`);
    }

    if (apply && runJob) {
      const activityAt = monthsAgo(DEACTIVATION_MONTHS);
      const $set: Record<string, unknown> = {
        password: passwordHash,
        status: "active",
        lastActiveAt: activityAt,
        updatedAt: activityAt,
        inactivityWarningStage: Math.max(0, DEACTIVATION_MONTHS - 1),
        lastInactivityNotificationAt: monthsAgo(Math.max(1, DEACTIVATION_MONTHS - 1)),
        deactivation: null,
        reactivationRequestStatus: null,
      };
      const $unset: Record<string, ""> = {
        reactivationRequestedAt: "",
        reactivationReviewedAt: "",
        reactivationReviewedBy: "",
        reactivationRejectionReason: "",
      };
      if (inactivityDemoEmailRecipient) {
        $set.inactivityEmailOverride = inactivityDemoEmailRecipient;
      } else {
        $unset.inactivityEmailOverride = "";
      }

      const resetResult = await Worker.collection.updateOne(
        { _id: oid("worker-due-deactivation") },
        { $set, $unset },
      );
      if (resetResult.matchedCount !== 1) {
        throw new Error("Seeded overdue worker was not found before running the inactivity job.");
      }

      console.log("\nRunning inactivity monitor once…");
      const result = await runInactivityMonitor({
        userIds: [String(oid("worker-due-deactivation"))],
        emailRecipient: inactivityDemoEmailRecipient,
      });
      console.log(
        `  processed=${result.processed}, deleted=${result.deleted}, emailFailures=${result.emailFailures}`,
      );
      if (result.processed !== 1 || result.deleted !== 1) {
        throw new Error("The demo worker was not deleted. Check the inactivity job output.");
      }
      if (result.emailFailures > 0) {
        throw new Error("The demo account was deleted, but its lifecycle email failed. Check Gmail SMTP configuration and rerun to retry.");
      }
      await notifyAdminLifecycleFromScript();
    }

    if (!apply) {
      console.log(`\nPreview: ${totalNew} document(s) would be inserted. Use --apply to write.`);
    } else {
      console.log(`\nInserted ${totalNew} new document(s).`);
      await notifyAdminLifecycleFromScript();
    }

    printShowcaseGuide(apply ? password : "");
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error: unknown) => {
  console.error(`Inactivity demo seed failed: ${sanitizeError(error)}`);
  process.exitCode = 1;
});
