/**
 * Removes employer job applications tied to deleted / tombstoned workers.
 * Restores job position slots when a stale row was Accepted.
 *
 * Preview: npm run cleanup:stale-applications
 * Apply:   SEED_CONFIRM_PRODUCTION=I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION npm run cleanup:stale-applications -- --apply
 */
import mongoose from "mongoose";
import Employer from "../model/Employer";
import { purgeStaleApplicationsForEmployer } from "../services/employerApplicationCleanup";

const PRODUCTION_CONFIRMATION = "I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION";

const sanitizeError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[redacted MongoDB URI]");
};

const run = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;
  const apply = process.argv.includes("--apply");
  const employerEmail = process.env.CLEANUP_EMPLOYER_EMAIL?.trim();

  if (!mongoUri) {
    throw new Error("MONGO_URI is required. Load it through dotenvx before running this script.");
  }
  if (apply && process.env.SEED_CONFIRM_PRODUCTION !== PRODUCTION_CONFIRMATION) {
    throw new Error(
      `Production writes require SEED_CONFIRM_PRODUCTION=${PRODUCTION_CONFIRMATION}.`,
    );
  }

  await mongoose.connect(mongoUri);

  try {
    const employers = employerEmail
      ? await Employer.find({ email: employerEmail, status: { $ne: "deleted" } }).select("_id email")
      : await Employer.find({ status: { $ne: "deleted" } }).select("_id email");

    if (!employers.length) {
      console.log(employerEmail ? `No active employer found for ${employerEmail}.` : "No employers to scan.");
      return;
    }

    let totalPurged = 0;
    let totalSlots = 0;

    for (const employer of employers) {
      const result = await purgeStaleApplicationsForEmployer(employer._id, { dryRun: !apply });
      if (!result.purged) continue;
      totalPurged += result.purged;
      totalSlots += result.positionsRestored;
      console.log(
        `${apply ? "Purged" : "Would purge"} ${result.purged} application(s) for ${employer.email} (${result.positionsRestored} slot(s) restored).`,
      );
    }

    console.log(
      `\n${apply ? "Done" : "Dry run"}: ${totalPurged} stale application(s)${totalSlots ? `, ${totalSlots} position slot(s) restored` : ""}.`,
    );
    if (!apply && totalPurged) {
      console.log("Re-run with --apply to write changes.");
    }
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error(`Stale application cleanup failed: ${sanitizeError(error)}`);
  process.exit(1);
});
