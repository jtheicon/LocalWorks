/**
 * Lists all database seed scripts (nothing is run from here).
 * Usage: npm run seed
 */
const scripts = [
  {
    npm: "seed:jobs",
    file: "src/scripts/seedJobs.ts",
    purpose: "Three dashboard job counts (PENDING / ACCEPTED / DECLINED) for one existing employer.",
    preview: "npm run seed:jobs",
    apply:
      'SEED_CONFIRM_PRODUCTION=I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION npm run seed:jobs -- --apply',
    env: ["MONGO_URI", "SEED_EMPLOYER_EMAIL", "SEED_CONFIRM_PRODUCTION (apply only)"],
  },
  {
    npm: "seed:demo",
    file: "src/scripts/seedDemo.ts",
    purpose: "Full demo dataset: industries, users, jobs, applications, messages, reports, ratings.",
    preview: "npm run seed:demo",
    apply:
      'SEED_CONFIRM_PRODUCTION=I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION SEED_DEMO_PASSWORD=******** npm run seed:demo -- --apply',
    reset: "npm run seed:demo -- --reset",
    env: ["MONGO_URI", "SEED_DEMO_PASSWORD (apply)", "SEED_CONFIRM_PRODUCTION (apply/reset)"],
  },
  {
    npm: "seed:inactivity",
    file: "src/scripts/seedInactivityDemo.ts",
    purpose: "Inactivity lifecycle fixtures (3/4/5 warnings, 6-mo deletion, admin reactivation demo).",
    preview: "npm run seed:inactivity",
    apply:
      'SEED_CONFIRM_PRODUCTION=I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION SEED_DEMO_PASSWORD=******** npm run seed:inactivity -- --apply',
    reset: "npm run seed:inactivity -- --reset",
    extra: "npm run seed:inactivity -- --apply --run-job  (seed + one inactivity monitor run)",
    env: ["MONGO_URI", "SEED_DEMO_PASSWORD (apply)", "SEED_CONFIRM_PRODUCTION (apply/reset)"],
  },
  {
    npm: "seed:inactivity-email-tour",
    file: "src/scripts/seedInactivityEmailTour.ts",
    purpose:
      "Email tour only: four workers, all mail to INACTIVITY_LIFECYCLE_INBOX (not seed:inactivity UI demo).",
    preview: "npm run seed:inactivity-email-tour",
    apply:
      "SEED_CONFIRM_PRODUCTION=I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION SEED_DEMO_PASSWORD=******** npm run seed:inactivity-email-tour -- --apply --run-job",
    reset: "npm run seed:inactivity-email-tour -- --reset",
    extra: [
      "npm run seed:inactivity-email-3mo | 4mo | 5mo  (one warning email each)",
      "npm run seed:inactivity-email-deletion  (6-month delete + account-deleted email)",
    ],
    env: [
      "MONGO_URI",
      "SEED_DEMO_PASSWORD (apply)",
      "SEED_CONFIRM_PRODUCTION (apply/reset)",
      "INACTIVITY_LIFECYCLE_INBOX (required; notification inbox)",
      "INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL (optional; platform login to backdate when ≠ inbox)",
      "SEED_BACKDATE_LIFECYCLE_INBOX (3/4/5mo individual npm scripts)",
      "SEED_DELETE_LIFECYCLE_INBOX (deletion npm script only)",
      "EMAIL_USER / EMAIL_PASS / EMAIL_OWNER / APP_URL (any --apply that sends mail)",
      "EMAIL_USER / EMAIL_PASS / APP_URL",
    ],
  },
];

console.log("\nLocalWorks backend seed scripts (all still available):\n");
for (const s of scripts) {
  console.log(`  npm run ${s.npm}`);
  console.log(`    File: ${s.file}`);
  console.log(`    ${s.purpose}`);
  console.log(`    Preview: ${s.preview}`);
  if (s.apply) console.log(`    Apply:   ${s.apply}`);
  if (s.reset) console.log(`    Reset:   ${s.reset}`);
  if (s.extra) {
    for (const line of Array.isArray(s.extra) ? s.extra : [s.extra]) {
      console.log(`    Extra:   ${line}`);
    }
  }
  console.log(`    Env:     ${s.env.join(", ")}\n`);
}
