/**
 * One-shot inactivity **email tour**: four demo workers at 3 / 4 / 5 / 6 calendar months idle.
 * A single `--run-job` sends the 3‑mo, 4‑mo, 5‑mo warning emails and the 6‑mo deletion email
 * (all to the lifecycle inbox, not the .test login addresses).
 *
 * Usage (from backend/):
 *   npm run seed:inactivity-email-tour              preview (no writes)
 *   npm run seed:inactivity-email-3mo               3-month warning email
 *   npm run seed:inactivity-email-4mo               4-month warning email
 *   npm run seed:inactivity-email-5mo               5-month final warning (deleted next month)
 *   npm run seed:inactivity-email-deletion          6-month purge + account-deleted email
 *   npm run seed:inactivity-email-tour -- --apply --run-job   all four emails
 *   npm run seed:inactivity-email-tour -- --reset
 *
 * Env:
 *   SEED_CONFIRM_PRODUCTION=I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION  (apply / reset)
 *   SEED_DEMO_PASSWORD=<min 8 chars>                                (apply)
 *   INACTIVITY_LIFECYCLE_INBOX=joav.zabala.up@phinmaed.com          (mail recipient only; never modified)
 *   EMAIL_* / APP_URL — same as production mail (see README)
 */
import mongoose, { Types } from "mongoose";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import Worker from "../model/Worker";
import {
  DEACTIVATION_MONTHS,
  wholeMonthsSince,
  inactivityPolicyEffectiveAt,
  adminActivityReference,
  computeAdminLifecycle,
  scheduledActionDate,
  nextInactivityMilestone,
} from "../services/inactivityPolicy";
import { runInactivityMonitor } from "../services/inactivityMonitor";
import { notifyAdminLifecycleFromScript } from "../services/adminLifecycleSocket";
import { buildInactivitySeedTimeline } from "./inactivitySeedTimeline";

const PRODUCTION_CONFIRMATION = "I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION";
const EMAIL_DOMAIN = "localworks-inactivity.test";
const LIFECYCLE_INBOX =
  process.env.INACTIVITY_LIFECYCLE_INBOX?.trim() || "joav.zabala.up@phinmaed.com";
const TOUR_NS = "localworks-inactivity-email-tour";

const oid = (key: string) =>
  new Types.ObjectId(createHash("md5").update(`${TOUR_NS}:${key}`).digest("hex").slice(0, 24));

type TourFixture = {
  key: string;
  label: string;
  name: string;
  lastActiveAt: Date;
  inactivityWarningStage: number;
  lastInactivityNotificationAt?: Date | null;
};

/** Tour workers: each uses today minus N calendar months (see inactivitySeedTimeline.ts). */
const buildTourFixtures = (ref = new Date()): TourFixture[] => {
  const row = (
    key: string,
    label: string,
    name: string,
    idleMonths: number,
  ): TourFixture => {
    const tl = buildInactivitySeedTimeline(ref, idleMonths);
    return {
      key,
      label,
      name,
      lastActiveAt: tl.lastActiveAt,
      inactivityWarningStage: tl.inactivityWarningStage,
      lastInactivityNotificationAt: tl.lastInactivityNotificationAt,
    };
  };

  return [
    row("lifecycle-3mo", "3 months idle → 1st warning email on job run", "Maria Santos", 3),
    row(
      "lifecycle-4mo",
      "4 months idle → 2nd warning (3-mo already sent on policy due date)",
      "Juan Dela Cruz",
      4,
    ),
    row(
      "lifecycle-5mo",
      "5 months idle → final warning (4-mo already sent on policy due date)",
      "Ana Reyes",
      5,
    ),
    row(
      "lifecycle-6mo",
      "6 months idle → account deleted + deletion email",
      "Roberto Garcia",
      DEACTIVATION_MONTHS,
    ),
  ];
};

const fmtShort = (d: Date) =>
  d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

const WARNING_KEYS = ["lifecycle-3mo", "lifecycle-4mo", "lifecycle-5mo"] as const;
const DELETION_KEY = "lifecycle-6mo";

type TourRunMode =
  | "fixtures-only"
  | "warning-3"
  | "warning-4"
  | "warning-5"
  | "warnings"
  | "deletion"
  | "full";

const RUN_MODE_FLAGS: { flag: string; mode: TourRunMode }[] = [
  { flag: "--run-3mo", mode: "warning-3" },
  { flag: "--run-4mo", mode: "warning-4" },
  { flag: "--run-5mo", mode: "warning-5" },
  { flag: "--run-warnings", mode: "warnings" },
  { flag: "--run-deletion", mode: "deletion" },
  { flag: "--run-job", mode: "full" },
];

const parseCli = (argv: string[]) => {
  const apply = argv.includes("--apply");
  const reset = argv.includes("--reset");
  const selected = RUN_MODE_FLAGS.filter(({ flag }) => argv.includes(flag));
  if (selected.length > 1) {
    throw new Error(`Use only one run flag: ${RUN_MODE_FLAGS.map((r) => r.flag).join(", ")}.`);
  }
  if (Number(apply) + Number(reset) > 1) {
    throw new Error("Use only one of --apply or --reset.");
  }
  if (selected.length > 0 && !apply) {
    throw new Error("--run-* flags require --apply.");
  }

  const mode: TourRunMode = selected[0]?.mode ?? "fixtures-only";
  return { apply, reset, mode };
};

const fixtureByKey = (fixtures: TourFixture[], key: string) => {
  const f = fixtures.find((x) => x.key === key);
  if (!f) throw new Error(`Unknown tour fixture: ${key}`);
  return f;
};

const fixturesForMode = (fixtures: TourFixture[], mode: TourRunMode): TourFixture[] => {
  if (mode === "warning-3") return [fixtureByKey(fixtures, "lifecycle-3mo")];
  if (mode === "warning-4") return [fixtureByKey(fixtures, "lifecycle-4mo")];
  if (mode === "warning-5") return [fixtureByKey(fixtures, "lifecycle-5mo")];
  if (mode === "warnings") {
    return fixtures.filter((f) => (WARNING_KEYS as readonly string[]).includes(f.key));
  }
  if (mode === "deletion") return [fixtureByKey(fixtures, DELETION_KEY)];
  return [...fixtures];
};

const WARNING_EMAIL_HINT: Partial<Record<TourRunMode, string>> = {
  "warning-3": "3-month inactivity warning",
  "warning-4": "4-month inactivity reminder",
  "warning-5": "5-month final warning (account will be deleted next month if still idle)",
};

const tourEmail = (key: string) => `${key}@${EMAIL_DOMAIN}`;

const buildWorkerDoc = (fixture: TourFixture, passwordHash: string) => ({
  _id: oid(fixture.key),
  name: fixture.name,
  email: tourEmail(fixture.key),
  password: passwordHash,
  phoneNumber: "+639170000099",
  role: "worker",
  skill: "Construction",
  skills: ["General Labor"],
  jobTitle: "Inactivity email tour",
  location: "Dagupan City, Pangasinan",
  yearsOfExperience: "1 year",
  availability: "Full-Time",
  expected_salary: "N/A",
  about_me: "Automated inactivity email tour fixture",
  status: "active",
  lastActiveAt: fixture.lastActiveAt,
  updatedAt: fixture.lastActiveAt,
  inactivityWarningStage: fixture.inactivityWarningStage,
  lastInactivityNotificationAt: fixture.lastInactivityNotificationAt ?? null,
  inactivityEmailOverride: LIFECYCLE_INBOX,
  deactivation: null,
  reactivationRequestStatus: null,
});

const printGuide = (tourFixtures: TourFixture[]) => {
  console.log("\n========== INACTIVITY EMAIL TOUR ==========\n");
  console.log(`INACTIVITY_LIFECYCLE_INBOX: ${LIFECYCLE_INBOX}`);
  console.log("  Lifecycle emails go here. This inbox account is never backdated, deleted, or otherwise modified.");
  console.log("  Only the @localworks-inactivity.test tour fixtures are changed by this script.\n");
  console.log("Expected after --apply --run-job (one monitor pass):");
  console.log("  1. 3-month inactivity warning");
  console.log("  2. 4-month reminder");
  console.log("  3. 5-month final reminder (deletion next month)");
  console.log("  4. Account deleted notice for the 6-month worker\n");
  console.log("Demo logins (SEED_DEMO_PASSWORD):");
  for (const f of tourFixtures) {
    console.log(`  ${f.label}`);
    console.log(`    Email: ${tourEmail(f.key)}`);
  }
  console.log("\nCommands (from backend/, SEED_CONFIRM_PRODUCTION + SEED_DEMO_PASSWORD in .env):");
  console.log("  npm run seed:inactivity-email-3mo      → one 3-month warning");
  console.log("  npm run seed:inactivity-email-4mo      → one 4-month warning");
  console.log("  npm run seed:inactivity-email-5mo      → one 5-month final warning");
  console.log("  npm run seed:inactivity-email-deletion → 6-month delete + account-deleted email");
  console.log("  npm run seed:inactivity-email-tour -- --apply --run-job   → all four emails");
  console.log("  npm run seed:inactivity-email-tour -- --reset\n");
  console.log("(Not the same as seed:inactivity — that seed is for admin/UI demo fixtures.)\n");
};

const verifyPolicy = (tourFixtures: TourFixture[]) => {
  console.log("Policy check (calendar months from idle basis):");
  for (const f of tourFixtures) {
    const lastActiveAt = f.lastActiveAt;
    const eff = inactivityPolicyEffectiveAt({ lastActiveAt, updatedAt: lastActiveAt });
    const mo = eff ? wholeMonthsSince(eff) : "n/a";
    const stage = f.inactivityWarningStage;
    const stageDue =
      eff && stage > 0 && stage < DEACTIVATION_MONTHS
        ? fmtShort(scheduledActionDate(eff, stage))
        : "—";
    const priorDue =
      f.lastInactivityNotificationAt && eff
        ? fmtShort(new Date(f.lastInactivityNotificationAt))
        : "—";
    const nextMo = nextInactivityMilestone({
      status: "active",
      lastActiveAt,
      updatedAt: lastActiveAt,
      inactivityWarningStage: stage,
    });
    const nextDue = eff && nextMo ? fmtShort(scheduledActionDate(eff, nextMo)) : "—";
    console.log(
      `  ${tourEmail(f.key)} → ${mo} mo idle · stage ${stage} · prior notice ${priorDue} (stage due ~${stageDue}) · next job sends ${nextMo ?? "delete"} (due ~${nextDue})`,
    );
  }
};

const assertMonitorResult = async (mode: TourRunMode, fixtures: TourFixture[], result: {
  processed: number;
  deleted: number;
  emailFailures: number;
}) => {
  if (result.processed < fixtures.length) {
    throw new Error(`Expected to process ${fixtures.length} tour worker(s), got ${result.processed}.`);
  }
  if (result.emailFailures > 0) {
    throw new Error("Some lifecycle emails failed — check EMAIL_USER / EMAIL_PASS / Gmail app password.");
  }

  if (mode === "warning-3" || mode === "warning-4" || mode === "warning-5") {
    if (result.deleted !== 0) throw new Error("Warning run must not delete any account.");
    console.log(`\nDone. Check ${LIFECYCLE_INBOX} for: ${WARNING_EMAIL_HINT[mode]}.`);
    return;
  }

  if (mode === "warnings") {
    if (result.deleted !== 0) throw new Error("Warning run must not delete any account.");
    console.log(`\nDone. Check ${LIFECYCLE_INBOX} for 3 warning emails (3 / 4 / 5 month idle).`);
    return;
  }

  if (mode === "deletion" || mode === "full") {
    if (result.deleted !== 1) {
      throw new Error("Expected exactly one deletion (6-month tour worker).");
    }
    const six = await Worker.findById(oid(DELETION_KEY)).select("status").lean();
    if (six?.status !== "deleted") {
      throw new Error("6-month tour worker should be status deleted after the job.");
    }
    if (mode === "full") {
      console.log(`\nDone. Check ${LIFECYCLE_INBOX} for 3 warning emails + 1 account-deleted email.`);
    } else {
      console.log(`\nDone. Check ${LIFECYCLE_INBOX} for the account-deleted email.`);
    }
    console.log(`Login ${tourEmail(DELETION_KEY)} should return ACCOUNT_DELETED.`);
  }
};

const run = async () => {
  const { apply, reset, mode } = parseCli(process.argv);
  const password = process.env.SEED_DEMO_PASSWORD ?? "";
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required.");
  if ((apply || reset) && process.env.SEED_CONFIRM_PRODUCTION !== PRODUCTION_CONFIRMATION) {
    throw new Error(`Writes require SEED_CONFIRM_PRODUCTION=${PRODUCTION_CONFIRMATION}.`);
  }
  if (apply && password.length < 8) {
    throw new Error("Set SEED_DEMO_PASSWORD (min 8 characters) for tour worker passwords.");
  }
  if (apply && mode !== "fixtures-only") {
    const missingEmailSettings = ["EMAIL_USER", "EMAIL_PASS", "EMAIL_OWNER", "APP_URL"]
      .filter((name) => !process.env[name]?.trim());
    if (missingEmailSettings.length > 0) {
      throw new Error(
        `Set ${missingEmailSettings.join(", ")} in backend/.env before sending lifecycle emails.`,
      );
    }
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const seedRef = new Date();
    const tourFixtures = buildTourFixtures(seedRef);
    const tourIds = tourFixtures.map((f) => oid(f.key));
    if (reset) {
      const { deletedCount } = await Worker.deleteMany({ _id: { $in: tourIds } });
      console.log(`Removed ${deletedCount} email-tour worker(s).`);
      return;
    }

    printGuide(tourFixtures);
    verifyPolicy(tourFixtures);

    if (!apply) {
      console.log("\nPreview only (no DB writes).");
      console.log("  Upsert fixtures:  npm run seed:inactivity-email-tour -- --apply");
      console.log("  Send one email:    npm run seed:inactivity-email-3mo | 4mo | 5mo | deletion");
      return;
    }

    const fixtures = fixturesForMode(tourFixtures, mode);
    const modeLabel: Record<TourRunMode, string> = {
      "fixtures-only": "upsert all tour workers (no emails)",
      "warning-3": "3-month warning email",
      "warning-4": "4-month warning email",
      "warning-5": "5-month final warning email",
      warnings: "3 / 4 / 5 month warning emails (combined)",
      deletion: "6-month account deletion + email",
      full: "full email tour (4 emails)",
    };
    console.log(`\nMode: ${modeLabel[mode]}`);

    const passwordHash = await bcrypt.hash(password, 12);
    for (const fixture of fixtures) {
      const doc = buildWorkerDoc(fixture, passwordHash);
      await Worker.collection.updateOne(
        { _id: doc._id },
        {
          $set: doc,
          $unset: {
            reactivationRequestedAt: "",
            reactivationReviewedAt: "",
            reactivationReviewedBy: "",
            reactivationRejectionReason: "",
          },
        },
        { upsert: true },
      );
    }
    console.log(`Upserted ${fixtures.length} tour worker(s); lifecycle mail → ${LIFECYCLE_INBOX}.`);

    for (const f of fixtures) {
      const saved = await Worker.findById(oid(f.key))
        .select("name email lastActiveAt updatedAt createdAt inactivityWarningStage status")
        .lean();
      if (!saved) continue;
      const bucket = computeAdminLifecycle(saved);
      const months = adminActivityReference(saved).at
        ? wholeMonthsSince(adminActivityReference(saved).at!)
        : "n/a";
      console.log(
        `  Admin UI expect: ${saved.email} → lifecycle "${bucket}", ~${months} mo idle, stage ${saved.inactivityWarningStage ?? 0} (badge: ${bucket === "inactive" ? "Inactive (monitoring)" : "Active"})`,
      );
    }

    if (mode === "fixtures-only") {
      console.log("Add --run-3mo | --run-4mo | --run-5mo | --run-deletion | --run-job to send email.");
      await notifyAdminLifecycleFromScript();
      return;
    }

    const jobUserIds = fixtures.map((f) => String(oid(f.key)));
    console.log("\nRunning inactivity monitor for tour workers…");
    const result = await runInactivityMonitor({
      userIds: jobUserIds,
      emailRecipient: LIFECYCLE_INBOX,
    });
    console.log(
      `  processed=${result.processed}, deleted=${result.deleted}, emailFailures=${result.emailFailures}`,
    );

    await assertMonitorResult(mode, fixtures, result);
    for (const f of fixtures) {
      const saved = await Worker.findById(oid(f.key))
        .select("name email lastActiveAt inactivityWarningStage lastInactivityNotificationAt status")
        .lean();
      if (!saved) continue;
      const bucket = computeAdminLifecycle(saved);
      console.log(
        `  After job: ${saved.email} → lifecycle "${bucket}", stage ${saved.inactivityWarningStage ?? 0}, last notice ${saved.lastInactivityNotificationAt?.toISOString() ?? "none"}`,
      );
    }
    await notifyAdminLifecycleFromScript();
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
