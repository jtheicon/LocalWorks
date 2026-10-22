/**
 * Demo fixtures for account inactivity, warnings, deactivation, and reactivation.
 *
 * All accounts use emails @localworks-inactivity.test and deterministic IDs so the
 * script is idempotent (--apply only inserts missing docs) and reversible (--reset).
 *
 * Usage (from backend/):
 *   npm run seed:inactivity                         preview
 *   npm run seed:inactivity -- --apply              write to DB
 *   npm run seed:inactivity -- --reset              remove demo docs only
 *   npm run seed:inactivity -- --apply --run-job    seed then run inactivity monitor once
 *
 * Required for --apply / --reset:
 *   SEED_CONFIRM_PRODUCTION=I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION
 * Required for --apply:
 *   SEED_DEMO_PASSWORD=<min 8 chars, shared by all demo logins>
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
import { hashReactivationToken } from "../services/reactivationTokens";
import { runInactivityMonitor } from "../services/inactivityMonitor";

const PRODUCTION_CONFIRMATION = "I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION";
const EMAIL_DOMAIN = "localworks-inactivity.test";
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
  { key: "worker-inactive-5", role: "worker", label: "Inactive ~5 months (4 & 5-mo reminders sent)", email: `worker-inactive-5@${EMAIL_DOMAIN}` },
  { key: "worker-deactivated", role: "worker", label: "Deactivated (6+ months inactivity)", email: `worker-deactivated@${EMAIL_DOMAIN}` },
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

const buildDocuments = (passwordHash: string, industryId: Types.ObjectId) => {
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
      lastActiveAt: monthsAgo(3),
      inactivityWarningStage: 0,
    }),
    baseWorker("worker-inactive-4", "Carla FourMonths", {
      status: "active",
      lastActiveAt: monthsAgo(4),
      inactivityWarningStage: 3,
      lastInactivityNotificationAt: monthsAgo(3),
    }),
    baseWorker("worker-inactive-5", "Diego FiveMonths", {
      status: "active",
      lastActiveAt: monthsAgo(5),
      inactivityWarningStage: 5,
      lastInactivityNotificationAt: monthsAgo(4),
    }),
    baseWorker("worker-deactivated", "Elena Deactivated", {
      status: "not_active",
      lastActiveAt: monthsAgo(DEACTIVATION_MONTHS),
      inactivityWarningStage: DEACTIVATION_MONTHS,
      lastInactivityNotificationAt: monthsAgo(DEACTIVATION_MONTHS),
      deactivation: {
        reason: "inactivity",
        at: monthsAgo(0),
        lastActiveAt: monthsAgo(DEACTIVATION_MONTHS),
      },
      reactivationRequestStatus: null,
    }),
    baseWorker("worker-reactivation-pending", "Felix PendingReview", {
      status: "not_active",
      lastActiveAt: monthsAgo(DEACTIVATION_MONTHS),
      inactivityWarningStage: DEACTIVATION_MONTHS,
      deactivation: {
        reason: "inactivity",
        at: monthsAgo(1),
        lastActiveAt: monthsAgo(DEACTIVATION_MONTHS),
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
      userId: oid("worker-deactivated"),
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
  console.log("Admin (use your real admin login):");
  console.log(`  ${origin}/admin-dashboard`);
  console.log("  • User management → filter Active / Inactive / Deactivated");
  console.log("  • Reactivation tab → approve/reject Felix PendingReview\n");

  console.log("Demo worker logins (password from SEED_DEMO_PASSWORD):");
  for (const f of FIXTURES.filter((x) => x.role === "worker")) {
    console.log(`  ${f.label}`);
    console.log(`    Email: ${f.email}`);
  }
  console.log(`  Password: ${password ? "(set in SEED_DEMO_PASSWORD)" : "(preview only)"}\n`);

  console.log("Try logging in as worker-deactivated@… → expect ACCOUNT_DEACTIVATED (403).\n");

  console.log("Reactivation link (Elena Deactivated):");
  console.log(
    `  ${origin}/account/reactivation/request?token=${encodeURIComponent(DEMO_REACTIVATION_TOKEN)}\n`,
  );

  console.log("Run inactivity job manually (dev):");
  console.log("  POST /api/admin/inactivity/run  (admin cookie, or ALLOW_MANUAL_INACTIVITY_JOB in prod)");
  console.log("  Or: npm run seed:inactivity -- --apply --run-job\n");

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
  const password = process.env.SEED_DEMO_PASSWORD ?? "";

  if (apply && reset) throw new Error("Use either --apply or --reset, not both.");
  if (!mongoUri) throw new Error("MONGO_URI is required. Load env with dotenvx (see npm run seed:inactivity).");
  if ((apply || reset) && process.env.SEED_CONFIRM_PRODUCTION !== PRODUCTION_CONFIRMATION) {
    throw new Error(`Database writes require SEED_CONFIRM_PRODUCTION=${PRODUCTION_CONFIRMATION}.`);
  }
  if (apply && password.length < 8) {
    throw new Error("Set SEED_DEMO_PASSWORD (min 8 characters) for demo account passwords.");
  }

  const passwordHash = apply ? await bcrypt.hash(password, 12) : "preview";

  await mongoose.connect(mongoUri);

  try {
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

    if (apply && runJob) {
      console.log("\nRunning inactivity monitor once…");
      const result = await runInactivityMonitor();
      console.log(`  processed=${result.processed}, deactivated=${result.deactivated}`);
    }

    if (!apply) {
      console.log(`\nPreview: ${totalNew} document(s) would be inserted. Use --apply to write.`);
    } else {
      console.log(`\nInserted ${totalNew} new document(s).`);
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
