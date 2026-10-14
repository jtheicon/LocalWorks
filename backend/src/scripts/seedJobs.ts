import mongoose, { Types } from "mongoose";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import Employer from "../model/Employer";
import Industry from "../model/Industry";
import Job from "../model/Job";

const PRODUCTION_CONFIRMATION = "I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION";
const SEED_MARKER = "[dashboard-count-seed:v1]";
const DEMO_EMPLOYER_EMAIL = "dashboard-seed-employer@local-work-backend.invalid";
const DEMO_EMPLOYER_COMPANY = "[DEMO SEED] Dashboard Example Employer";

const fixtures = [
  {
    id: "66f000000000000000000001",
    title: "[DEMO SEED] Pending dashboard example",
    status: "PENDING",
    description: `${SEED_MARKER} Sample job awaiting admin review.`,
  },
  {
    id: "66f000000000000000000002",
    title: "[DEMO SEED] Accepted dashboard example",
    status: "ACCEPTED",
    description: `${SEED_MARKER} Sample job accepted by an admin.`,
  },
  {
    id: "66f000000000000000000003",
    title: "[DEMO SEED] Declined dashboard example",
    status: "DECLINED",
    description: `${SEED_MARKER} Sample job declined by an admin.`,
  },
] as const;

const sanitizeError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[redacted MongoDB URI]");
};

const run = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;
  const employerEmail = process.env.SEED_EMPLOYER_EMAIL?.trim();
  const createDemoEmployer = process.env.SEED_CREATE_DEMO_EMPLOYER === "true";
  const apply = process.argv.includes("--apply");

  if (!mongoUri) {
    throw new Error("MONGO_URI is required. Load it through dotenvx before running this script.");
  }
  if (!employerEmail && !createDemoEmployer) {
    throw new Error("Set SEED_EMPLOYER_EMAIL or explicitly enable SEED_CREATE_DEMO_EMPLOYER=true.");
  }
  if (apply && process.env.SEED_CONFIRM_PRODUCTION !== PRODUCTION_CONFIRMATION) {
    throw new Error(
      `Production writes require SEED_CONFIRM_PRODUCTION=${PRODUCTION_CONFIRMATION}.`,
    );
  }

  await mongoose.connect(mongoUri);

  try {
    let employer = createDemoEmployer
      ? await Employer.findOne({ email: DEMO_EMPLOYER_EMAIL }).select(
          "_id company location role status industry",
        )
      : await Employer.findOne({ email: employerEmail }).select(
          "_id company location role status industry",
        );

    let industryToCreate: InstanceType<typeof Industry> | undefined;
    let employerToCreate: InstanceType<typeof Employer> | undefined;

    if (createDemoEmployer && employer) {
      if (employer.company !== DEMO_EMPLOYER_COMPANY || employer.status !== "verified") {
        throw new Error("The reserved demo employer email is already used by a different account.");
      }
    } else if (createDemoEmployer) {
      let industry = await Industry.findOne({ title: "General" });
      if (!industry) {
        industry = new Industry({ title: "General", notAccepted: false });
        industryToCreate = industry;
      }

      const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
      employerToCreate = new Employer({
        company: DEMO_EMPLOYER_COMPANY,
        email: DEMO_EMPLOYER_EMAIL,
        password: passwordHash,
        phone: "+639000000000",
        industry: industry._id,
        location: "Manila, Philippines",
        status: "verified",
      });
      employer = employerToCreate;
    } else if (!employer) {
      throw new Error("No employer matched SEED_EMPLOYER_EMAIL.");
    }

    if (!employer) {
      throw new Error("Unable to prepare an employer for the seeded jobs.");
    }
    if (
      employer.role !== "employer" ||
      ["pending", "deleted", "not_active"].includes(employer.status.toLowerCase())
    ) {
      throw new Error(
        `The matching account is not eligible for job seeding (role: ${employer.role}, status: ${employer.status}).`,
      );
    }

    const existingJobs = await Job.find({
      _id: { $in: fixtures.map(({ id }) => new Types.ObjectId(id)) },
    }).select("_id title status posted description");

    for (const existing of existingJobs) {
      const fixture = fixtures.find(({ id }) => id === existing._id.toString());
      if (
        !fixture ||
        existing.title !== fixture.title ||
        existing.status !== fixture.status ||
        existing.posted.toString() !== employer._id.toString() ||
        !existing.description.startsWith(SEED_MARKER)
      ) {
        throw new Error(
          `Refusing to modify existing job ${existing._id}; it does not match this seed's fixture.`,
        );
      }
    }

    const location = employer.location?.trim();
    if (!location || location === "No Location") {
      throw new Error("The employer must have a real location before jobs can be seeded.");
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    const applyBefore = new Date();
    applyBefore.setDate(applyBefore.getDate() + 30);

    const existingIds = new Set(existingJobs.map((job) => job._id.toString()));
    const pendingFixtures = fixtures.filter(({ id }) => !existingIds.has(id));

    console.log(`${apply ? "Applying" : "Preview"}: ${pendingFixtures.length} new job(s) for ${employer.company}.`);
    if (employerToCreate) {
      console.log(`- A dormant demo employer account will be created (${DEMO_EMPLOYER_EMAIL}).`);
    }
    for (const fixture of fixtures) {
      console.log(`- ${fixture.status}: ${fixture.title}${existingIds.has(fixture.id) ? " (already seeded)" : ""}`);
    }

    if (!apply || pendingFixtures.length === 0) {
      return;
    }

    if (industryToCreate) {
      await industryToCreate.save();
    }
    if (employerToCreate) {
      await employerToCreate.save();
    }

    const result = await Job.bulkWrite(
      pendingFixtures.map((fixture) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(fixture.id) },
          update: {
            $setOnInsert: {
              _id: new Types.ObjectId(fixture.id),
              title: fixture.title,
              company: employer.company,
              posted: employer._id,
              location,
              type: "Full-Time",
              salary: "PHP 700 per day",
              description: fixture.description,
              tags: ["General Labor"],
              requirements: ["Able to perform the listed job duties"],
              benefits: [],
              schedule: "Monday to Friday",
              startDate: startDate.toISOString().slice(0, 10),
              status: fixture.status,
              positions: 1,
              category: "General",
              applyBefore: applyBefore.toISOString().slice(0, 10),
            },
          },
          upsert: true,
        },
      })),
      { ordered: true },
    );

    if (result.upsertedCount !== pendingFixtures.length) {
      throw new Error(
        `Expected to insert ${pendingFixtures.length} job(s), but inserted ${result.upsertedCount}.`,
      );
    }

    console.log(`Seed complete: inserted ${result.upsertedCount} job(s).`);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error: unknown) => {
  console.error(`Job seeding failed: ${sanitizeError(error)}`);
  process.exitCode = 1;
});
