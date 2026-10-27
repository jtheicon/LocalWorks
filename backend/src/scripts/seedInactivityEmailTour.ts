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
 *   INACTIVITY_LIFECYCLE_INBOX=notify@example.com                (required for --apply; all warning/deletion mail goes here)
 *   INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL=worker-login@example.com  (optional; account to backdate when login ≠ inbox)
 *   SEED_BACKDATE_LIFECYCLE_INBOX=I_UNDERSTAND_THIS_BACKDATES_THE_CONFIGURED_LIFECYCLE_INBOX_ACCOUNT
 *   SEED_DELETE_LIFECYCLE_INBOX=I_UNDERSTAND_THIS_DELETES_THE_CONFIGURED_LIFECYCLE_INBOX_ACCOUNT
 *   EMAIL_* / APP_URL — same as production mail (see README)
 */
import mongoose, { Types } from "mongoose";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import Worker from "../model/Worker";
import Employer from "../model/Employer";
import {
  DEACTIVATION_MONTHS,
  wholeMonthsSince,
  inactivityPolicyEffectiveAt,
  adminActivityReference,
  computeAdminLifecycle,
  scheduledActionDate,
  nextInactivityMilestone,
  isOperationalAccountStatus,
} from "../services/inactivityPolicy";
import { runInactivityMonitor } from "../services/inactivityMonitor";
import { notifyAdminLifecycleFromScript } from "../services/adminLifecycleSocket";
import { buildInactivitySeedTimeline } from "./inactivitySeedTimeline";
import {
  readLifecycleInbox,
  readLifecycleAccountEmail,
  resolveLifecycleSeedTargets,
  type LifecycleSeedTargets,
} from "./lifecycleInboxEnv";

const PRODUCTION_CONFIRMATION = "I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION";
const INBOX_BACKDATE_CONFIRMATION =
  "I_UNDERSTAND_THIS_BACKDATES_THE_CONFIGURED_LIFECYCLE_INBOX_ACCOUNT";
const INBOX_DELETION_CONFIRMATION =
  "I_UNDERSTAND_THIS_DELETES_THE_CONFIGURED_LIFECYCLE_INBOX_ACCOUNT";
const EMAIL_DOMAIN = "localworks-inactivity.test";
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

type LifecycleInboxAccount = {
  id: Types.ObjectId;
  email: string;
  role: "worker" | "employer";
  status: string;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findLifecycleInboxAccount = async (email: string): Promise<LifecycleInboxAccount> => {
  const emailMatch = { $regex: `^${escapeRegex(email)}$`, $options: "i" };
  const [workers, employers] = await Promise.all([
    Worker.find({ email: emailMatch }).select("_id email status").lean(),
    Employer.find({ email: emailMatch }).select("_id email status").lean(),
  ]);
  const matches: LifecycleInboxAccount[] = [
    ...workers.map((user) => ({
      id: user._id,
      email: user.email,
      role: "worker" as const,
      status: user.status,
    })),
    ...employers.map((user) => ({
      id: user._id,
      email: user.email,
      role: "employer" as const,
      status: user.status,
    })),
  ];

  if (matches.length !== 1) {
    let hint =
      matches.length === 0
        ? `No worker or employer is registered with login email "${email}". Register that account, or set INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL to an existing login while INACTIVITY_LIFECYCLE_INBOX holds the mailbox that should receive mail.`
        : "Multiple accounts share this address across worker and employer collections.";
    if (matches.length === 0) {
      const [deletedWorker, deletedEmployer] = await Promise.all([
        Worker.findOne({ email: emailMatch, status: "deleted" }).select("email").lean(),
        Employer.findOne({ email: emailMatch, status: "deleted" }).select("email").lean(),
      ]);
      if (deletedWorker || deletedEmployer) {
        hint = `A deleted ${deletedWorker ? "worker" : "employer"} record still uses "${email}" (likely from seed:inactivity-email-deletion). Register a new account with this email or pick another INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL.`;
      }
    }
    throw new Error(
      `Expected exactly one worker or employer for lifecycle account email "${email}"; found ${matches.length}. ${hint} No account was changed.`,
    );
  }
  return matches[0];
};

const diagnoseLifecycleAccount = async (accountEmail: string): Promise<string | null> => {
  const emailMatch = { $regex: `^${escapeRegex(accountEmail)}$`, $options: "i" };
  const [workers, employers] = await Promise.all([
    Worker.find({ email: emailMatch }).select("email status").lean(),
    Employer.find({ email: emailMatch }).select("email status").lean(),
  ]);
  const rows = [...workers, ...employers];
  if (rows.length === 0) {
    const [deletedWorker, deletedEmployer] = await Promise.all([
      Worker.findOne({ email: emailMatch, status: "deleted" }).select("email").lean(),
      Employer.findOne({ email: emailMatch, status: "deleted" }).select("email").lean(),
    ]);
    if (deletedWorker || deletedEmployer) {
      return `Login "${accountEmail}" is deleted — 3/4/5/deletion seeds cannot run until you re-register or change INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL.`;
    }
    return `No worker or employer registered with login "${accountEmail}".`;
  }
  if (rows.length > 1) {
    return `Multiple worker/employer records share "${accountEmail}".`;
  }
  const status = rows[0].status;
  if (!isOperationalAccountStatus(status)) {
    if (status === "deleted") {
      return `Login "${accountEmail}" is deleted — re-register or choose another INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL.`;
    }
    return `Login "${accountEmail}" has status "${status}" (need active or verified).`;
  }
  return null;
};

const findLifecycleInboxState = async (account: LifecycleInboxAccount) => {
  if (account.role === "worker") {
    return Worker.findById(account.id)
      .select(
        "status lastActiveAt updatedAt createdAt inactivityWarningStage lastInactivityNotificationAt inactivityEmailOverride email",
      )
      .lean();
  }
  return Employer.findById(account.id)
    .select(
      "status lastActiveAt updatedAt createdAt inactivityWarningStage lastInactivityNotificationAt inactivityEmailOverride email",
    )
    .lean();
};

const backdateLifecycleInboxAccount = async (
  account: LifecycleInboxAccount,
  timeline: ReturnType<typeof buildInactivitySeedTimeline>,
  lifecycleInbox: string,
) => {
  const filter = { _id: account.id, status: account.status };
  const $set: Record<string, unknown> = {
    lastActiveAt: timeline.lastActiveAt,
    updatedAt: timeline.lastActiveAt,
    inactivityWarningStage: timeline.inactivityWarningStage,
    lastInactivityNotificationAt: timeline.lastInactivityNotificationAt,
  };
  const $unset: Record<string, ""> = {};
  if (account.email.trim().toLowerCase() !== lifecycleInbox.trim().toLowerCase()) {
    $set.inactivityEmailOverride = lifecycleInbox;
  } else {
    $unset.inactivityEmailOverride = "";
  }
  const update = { $set, ...(Object.keys($unset).length > 0 ? { $unset } : {}) };
  return account.role === "worker"
    ? Worker.updateOne(filter, update, { timestamps: false })
    : Employer.updateOne(filter, update, { timestamps: false });
};

const RUN_MODE_FLAGS: { flag: string; mode: TourRunMode }[] = [
  { flag: "--run-3mo", mode: "warning-3" },
  { flag: "--run-4mo", mode: "warning-4" },
  { flag: "--run-5mo", mode: "warning-5" },
  { flag: "--run-warnings", mode: "warnings" },
  { flag: "--run-deletion", mode: "deletion" },
  { flag: "--run-job", mode: "full" },
];

const isIndividualWarningMode = (mode: TourRunMode) =>
  mode === "warning-3" || mode === "warning-4" || mode === "warning-5";

const warningMonthForMode = (mode: TourRunMode): 3 | 4 | 5 => {
  if (mode === "warning-3") return 3;
  if (mode === "warning-4") return 4;
  if (mode === "warning-5") return 5;
  throw new Error(`Mode ${mode} does not represent an individual warning.`);
};

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

const buildWorkerDoc = (
  fixture: TourFixture,
  passwordHash: string,
  lifecycleInbox: string,
) => ({
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
  inactivityEmailOverride: lifecycleInbox,
  deactivation: null,
  reactivationRequestStatus: null,
});

const printGuide = (
  tourFixtures: TourFixture[],
  targets: { notifyInbox: string | null; accountEmail: string | null },
) => {
  console.log("\n========== INACTIVITY EMAIL TOUR ==========\n");
  console.log(
    `INACTIVITY_LIFECYCLE_INBOX: ${targets.notifyInbox ?? "(not set — required in backend/.env for --apply)"}`,
  );
  console.log("  All warning and deletion emails from these seeds are sent here.");
  if (
    targets.accountEmail &&
    targets.notifyInbox &&
    targets.accountEmail.toLowerCase() !== targets.notifyInbox.toLowerCase()
  ) {
    console.log(`INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL: ${targets.accountEmail}`);
    console.log("  Individual 3/4/5-month and deletion commands backdate this platform login (not the inbox address).");
  } else {
    console.log(
      "  Individual 3/4/5-month and deletion commands backdate the worker/employer whose login email matches the inbox (or set INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL when mail should go elsewhere).",
    );
  }
  console.log("  The full --run-job email tour modifies only @localworks-inactivity.test fixtures.");
  console.log(
    "  The deletion-only command permanently deletes the platform account selected by INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL or INACTIVITY_LIFECYCLE_INBOX.\n",
  );
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
  console.log("\nCommands (run from backend/; write confirmation required):");
  console.log("  npm run seed:inactivity-email-3mo      → one 3-month warning");
  console.log("  npm run seed:inactivity-email-4mo      → one 4-month warning");
  console.log("  npm run seed:inactivity-email-5mo      → one 5-month final warning");
  console.log("  npm run seed:inactivity-email-deletion → backdate and delete the configured inbox account");
  console.log("  npm run seed:inactivity-email-tour -- --apply --run-job   → all four emails");
  console.log("  npm run seed:inactivity-email-tour -- --reset\n");
  console.log(
    `Warning-stage backdating also requires SEED_BACKDATE_LIFECYCLE_INBOX=${INBOX_BACKDATE_CONFIRMATION}.\n`,
  );
  console.log(
    `Inbox deletion also requires SEED_DELETE_LIFECYCLE_INBOX=${INBOX_DELETION_CONFIRMATION}.\n`,
  );
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

const assertMonitorResult = async (
  mode: TourRunMode,
  fixtures: TourFixture[],
  result: {
    processed: number;
    deleted: number;
    emailFailures: number;
  },
  lifecycleInbox: string,
  inboxAccount?: LifecycleInboxAccount,
) => {
  if (!isIndividualWarningMode(mode) && mode !== "deletion" && result.processed < fixtures.length) {
    throw new Error(`Expected to process ${fixtures.length} tour worker(s), got ${result.processed}.`);
  }
  if (result.emailFailures > 0) {
    throw new Error("Some lifecycle emails failed — check EMAIL_USER / EMAIL_PASS / Gmail app password.");
  }

  if (mode === "warning-3" || mode === "warning-4" || mode === "warning-5") {
    if (result.deleted !== 0) throw new Error("Warning run must not delete any account.");
    if (result.processed !== 1) {
      throw new Error(`Expected to process exactly one configured inbox account, got ${result.processed}.`);
    }
    if (!inboxAccount) throw new Error("Missing preflighted lifecycle inbox account.");
    const expectedStage = warningMonthForMode(mode);
    const saved = await findLifecycleInboxState(inboxAccount);
    if (
      !saved ||
      !isOperationalAccountStatus(saved.status) ||
      saved.inactivityWarningStage !== expectedStage ||
      !saved.lastInactivityNotificationAt ||
      computeAdminLifecycle(saved) !== "inactive"
    ) {
      throw new Error(
        `Expected the configured inbox account to remain operational, show inactive lifecycle, and persist warning stage ${expectedStage}; verify its database record and monitor logs.`,
      );
    }
    console.log(`\nDone. Check ${lifecycleInbox} for: ${WARNING_EMAIL_HINT[mode]}.`);
    console.log(
      `Verified ${saved.email}: platform status ${saved.status}, lifecycle inactive, warning stage ${saved.inactivityWarningStage}.`,
    );
    return;
  }

  if (mode === "warnings") {
    if (result.deleted !== 0) throw new Error("Warning run must not delete any account.");
    console.log(`\nDone. Check ${lifecycleInbox} for 3 warning emails (3 / 4 / 5 month idle).`);
    return;
  }

  if (mode === "deletion" || mode === "full") {
    if (result.deleted !== 1) {
      throw new Error("Expected exactly one deletion in the selected 6-month test.");
    }
    if (mode === "deletion") {
      if (!inboxAccount) throw new Error("Missing preflighted lifecycle inbox account.");
      if ((await findLifecycleInboxState(inboxAccount))?.status !== "deleted") {
        throw new Error("Configured lifecycle inbox account should be status deleted after the job.");
      }
      console.log(`\nDone. Check ${lifecycleInbox} for the account-deleted email.`);
      console.log(`Fresh login for ${inboxAccount.email} should return ACCOUNT_DELETED.`);
      return;
    }
    const six = await Worker.findById(oid(DELETION_KEY)).select("status").lean();
    if (six?.status !== "deleted") {
      throw new Error("6-month tour worker should be status deleted after the job.");
    }
    if (mode === "full") {
      console.log(`\nDone. Check ${lifecycleInbox} for 3 warning emails + 1 account-deleted email.`);
    } else {
      console.log(`\nDone. Check ${lifecycleInbox} for the account-deleted email.`);
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
  const previewTargets = {
    notifyInbox: readLifecycleInbox(),
    accountEmail: readLifecycleAccountEmail() ?? readLifecycleInbox(),
  };
  const seedTargets: LifecycleSeedTargets | null = apply
    ? resolveLifecycleSeedTargets("before applying email tour seeds")
    : null;
  if (
    apply &&
    mode !== "deletion" &&
    !isIndividualWarningMode(mode) &&
    password.length < 8
  ) {
    throw new Error("Set SEED_DEMO_PASSWORD (min 8 characters) for tour worker passwords.");
  }
  if (
    apply &&
    isIndividualWarningMode(mode) &&
    process.env.SEED_BACKDATE_LIFECYCLE_INBOX !== INBOX_BACKDATE_CONFIRMATION
  ) {
    throw new Error(
      `Testing warning stages on the configured inbox account requires SEED_BACKDATE_LIFECYCLE_INBOX=${INBOX_BACKDATE_CONFIRMATION}.`,
    );
  }
  if (
    apply &&
    mode === "deletion" &&
    process.env.SEED_DELETE_LIFECYCLE_INBOX !== INBOX_DELETION_CONFIRMATION
  ) {
    throw new Error(
      `Deleting the configured lifecycle inbox account requires SEED_DELETE_LIFECYCLE_INBOX=${INBOX_DELETION_CONFIRMATION}.`,
    );
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

    printGuide(tourFixtures, previewTargets);
    verifyPolicy(tourFixtures);

    const accountEmailForPreflight =
      previewTargets.accountEmail ?? previewTargets.notifyInbox ?? null;
    if (accountEmailForPreflight) {
      const preflightIssue = await diagnoseLifecycleAccount(accountEmailForPreflight);
      if (preflightIssue) {
        console.log(`\nAccount preflight (3/4/5/deletion seeds): ${preflightIssue}`);
      } else {
        console.log(
          `\nAccount preflight (3/4/5/deletion seeds): OK — one active/verified account for ${accountEmailForPreflight}.`,
        );
      }
    }

    if (!apply) {
      console.log("\nPreview only (no DB writes).");
      console.log("  Upsert fixtures:  npm run seed:inactivity-email-tour -- --apply");
      console.log("  Send one email:    npm run seed:inactivity-email-3mo | 4mo | 5mo | deletion");
      return;
    }

    const inboxStageMode = mode === "deletion" || isIndividualWarningMode(mode);
    const fixtures = inboxStageMode ? [] : fixturesForMode(tourFixtures, mode);
    const { notifyInbox, accountEmail } = seedTargets!;
    console.log(`\nLifecycle mail → ${notifyInbox}`);
    if (accountEmail.toLowerCase() !== notifyInbox.toLowerCase()) {
      console.log(`Platform account to backdate/delete → ${accountEmail}`);
    }
    const modeLabel: Record<TourRunMode, string> = {
      "fixtures-only": "upsert all tour workers (no emails)",
      "warning-3": `3-month warning for ${accountEmail} (mail → ${notifyInbox})`,
      "warning-4": `4-month warning for ${accountEmail} (mail → ${notifyInbox})`,
      "warning-5": `5-month final warning for ${accountEmail} (mail → ${notifyInbox})`,
      warnings: "3 / 4 / 5 month warning emails (combined)",
      deletion: `6-month deletion of ${accountEmail} + mail → ${notifyInbox}`,
      full: "full email tour (4 emails)",
    };
    console.log(`Mode: ${modeLabel[mode]}`);

    let inboxAccount: LifecycleInboxAccount | undefined;
    let jobUserIds: string[];
    if (inboxStageMode) {
      inboxAccount = await findLifecycleInboxAccount(accountEmail);
      if (!isOperationalAccountStatus(inboxAccount.status)) {
        const deletedHint =
          inboxAccount.status === "deleted"
            ? " It was likely removed by seed:inactivity-email-deletion — re-register this email or set INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL to another active login."
            : "";
        throw new Error(
          `Configured lifecycle account ${inboxAccount.email} has status "${inboxAccount.status}", not active/verified.${deletedHint} No account was changed.`,
        );
      }

      const idleMonths = mode === "deletion" ? DEACTIVATION_MONTHS : warningMonthForMode(mode);
      const timeline = buildInactivitySeedTimeline(seedRef, idleMonths);
      const updated = await backdateLifecycleInboxAccount(inboxAccount, timeline, notifyInbox);
      if (updated.matchedCount !== 1) {
        throw new Error("Lifecycle inbox account changed during preflight; no monitor run was started.");
      }
      const seededState = await findLifecycleInboxState(inboxAccount);
      const seededAt = seededState ? inactivityPolicyEffectiveAt(seededState) : null;
      if (
        !seededState ||
        !seededAt ||
        wholeMonthsSince(seededAt, seedRef) !== idleMonths ||
        seededState.inactivityWarningStage !== timeline.inactivityWarningStage
      ) {
        throw new Error(
          "The configured inbox account's inactivity dates/stage did not persist as seeded; refusing to run the monitor.",
        );
      }
      if (notifyInbox.toLowerCase() !== inboxAccount.email.toLowerCase()) {
        const override = seededState.inactivityEmailOverride;
        if (override?.trim().toLowerCase() !== notifyInbox.toLowerCase()) {
          throw new Error(
            `Expected inactivityEmailOverride on ${inboxAccount.email} to be "${notifyInbox}" after seeding; refusing to run the monitor.`,
          );
        }
      }
      jobUserIds = [String(inboxAccount.id)];
      console.log(
        `Seeded configured ${inboxAccount.role} account ${inboxAccount.email} to ${idleMonths} months idle, with warning stage ${timeline.inactivityWarningStage}; lifecycle mail → ${notifyInbox}; underlying status remains ${inboxAccount.status}.`,
      );
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      for (const fixture of fixtures) {
        const doc = buildWorkerDoc(fixture, passwordHash, notifyInbox);
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
      jobUserIds = fixtures.map((f) => String(oid(f.key)));
      await Worker.updateMany(
        { _id: { $in: fixtures.map((f) => oid(f.key)) } },
        { $set: { inactivityEmailOverride: notifyInbox } },
      );
      console.log(`Upserted ${fixtures.length} tour worker(s); lifecycle mail → ${notifyInbox}.`);
    }

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

    console.log(
      inboxAccount
        ? "\nRunning inactivity monitor for the configured inbox account…"
        : "\nRunning inactivity monitor for tour workers…",
    );
    const result = await runInactivityMonitor({
      userIds: jobUserIds,
      emailRecipient: notifyInbox,
    });
    console.log(
      `  processed=${result.processed}, deleted=${result.deleted}, emailFailures=${result.emailFailures}`,
    );

    await assertMonitorResult(mode, fixtures, result, notifyInbox, inboxAccount);
    for (const f of fixtures) {
      const saved = await Worker.findById(oid(f.key))
        .select("name email lastActiveAt inactivityWarningStage lastInactivityNotificationAt status")
        .lean();
      if (!saved) continue;
      const bucket = computeAdminLifecycle(saved);
      console.log(
        `  After job: ${saved.email} → platform status "${saved.status}", lifecycle "${bucket}", stage ${saved.inactivityWarningStage ?? 0}, last notice ${saved.lastInactivityNotificationAt?.toISOString() ?? "none"}`,
      );
    }
    if (inboxAccount) {
      const saved = await findLifecycleInboxState(inboxAccount);
      if (saved) {
        console.log(
          `  After job: ${inboxAccount.email} → platform status "${saved.status}", lifecycle "${computeAdminLifecycle(saved)}", stage ${saved.inactivityWarningStage ?? 0}, last notice ${saved.lastInactivityNotificationAt?.toISOString() ?? "none"}`,
        );
      }
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
