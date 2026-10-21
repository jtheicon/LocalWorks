// Automated verification that replaces routine admin approval.
//
//   - Employers: business permit / DTI / SEC document checked by AI -> account activated.
//   - Workers:   resume / credentials checked by AI -> account activated + verified badge.
//   - Jobs:      post screened by AI for scams and policy issues -> published.
//
// The admin is only notified when the AI cannot approve (unclear document, name mismatch,
// expired permit, suspicious job post, AI unavailable). Those items stay "pending" and
// carry the AI's reasons, so the admin reviews exceptions instead of every submission.
import path from "node:path";
import Employer from "../model/Employer";
import Worker from "../model/Worker";
import Job from "../model/Job";
import VerifiedWorker from "../model/VerifiedWorker";
import AdminNotification from "../model/AdminNotification";
import UserNotification from "../model/UserNotification";
import { JobPostPayload } from "../notif-payload/user";
import { getIO } from "../socket";
import { sendEmail } from "./emailOtp";
import { moderateJobPost, verifyBusinessPermit, verifyWorkerResume, VerificationResult } from "../ai/verification";

const UPLOADS = path.join(__dirname, "../../uploads");

const emit = (room: string | null, event: string, payload: unknown) => {
  try {
    const io = getIO();
    (room ? io.to(room) : io).emit(event, payload);
  } catch {
    // Socket server not running (e.g. scripts) - notifications are still saved.
  }
};

const notifyAdmin = async (title: string, description: string, result: VerificationResult, category: "account" | "job") => {
  const notification = await AdminNotification.create({
    type: category === "job" ? "job_posted" : "verification",
    category,
    title,
    description,
    time: new Date().toISOString(),
    read: false,
    details: `AI result: ${result.method === "ai" ? `needs review (confidence ${Math.round(result.confidence * 100)}%)` : "not available"}\n- ${result.reasons.join("\n- ")}`,
  });
  emit("admins", "notification:new", notification);
};

const safeEmail = (to: string, subject: string, text: string) =>
  sendEmail(to, subject, text).catch((err) => console.error("[autoVerify] email failed:", err));

/* -------------------------------------------------------------------------- */

export const autoVerifyEmployer = async (employerId: string) => {
  const employer = await Employer.findById(employerId);
  if (!employer || employer.status !== "pending") return;

  const result = await verifyBusinessPermit(path.join(UPLOADS, "permits", path.basename(employer.permit)), employer.company);
  employer.set("verification", result);

  if (result.decision === "approve") {
    employer.status = "active";
    await employer.save();
    await safeEmail(employer.email, "Your LocalWorks employer account is approved",
      `Good news! Your business document was verified and your LocalWorks account for ${employer.company} is now active. You can log in and post jobs.`);
    return;
  }

  await employer.save();
  await notifyAdmin(
    "Employer needs manual verification",
    `${employer.company} (${employer.email}) could not be verified automatically.`,
    result,
    "account",
  );
  await safeEmail(employer.email, "Your LocalWorks account is under review",
    `Thanks for registering ${employer.company}. We couldn't automatically verify your business document, so an administrator will review it shortly. We'll email you once your account is active.`);
};

export const autoVerifyWorker = async (workerId: string) => {
  const worker = await Worker.findById(workerId);
  if (!worker || worker.status !== "pending") return;

  const result = await verifyWorkerResume(path.join(UPLOADS, "resumes", path.basename(worker.resume)), worker.name, worker.skill);
  worker.set("verification", result);

  if (result.decision === "approve") {
    worker.status = "active";
    await worker.save();
    if (!(await VerifiedWorker.exists({ worker: worker._id }))) {
      await VerifiedWorker.create({ worker: worker._id });
    }
    await safeEmail(worker.email, "Your LocalWorks account is approved",
      `Hi ${worker.name}! Your resume was verified and your LocalWorks account is now active. You can log in and start applying for jobs.`);
    return;
  }

  await worker.save();
  await notifyAdmin(
    "Worker needs manual verification",
    `${worker.name} (${worker.email}) could not be verified automatically.`,
    result,
    "account",
  );
  await safeEmail(worker.email, "Your LocalWorks account is under review",
    `Hi ${worker.name}, thanks for registering. We couldn't automatically verify your resume, so an administrator will review it shortly. We'll email you once your account is active.`);
};

// notifyWorkers: false for an edited post, so workers aren't told about the same job twice.
export const autoModerateJob = async (jobId: string, { notifyWorkers = true } = {}) => {
  const job = await Job.findById(jobId);
  if (!job || job.status !== "PENDING") return;

  const result = await moderateJobPost({
    title: job.title,
    company: job.company,
    category: job.category,
    type: job.type,
    salary: job.salary,
    location: job.location,
    schedule: job.schedule,
    description: job.description,
    requirements: job.requirements,
    benefits: job.benefits,
    tags: job.tags,
  });
  job.set("verification", result);

  if (result.decision === "approve") {
    job.status = "ACCEPTED";
    await job.save();
    if (!notifyWorkers) return;

    // Same notification an admin approval sends.
    const workers = await Worker.find({ status: "active" }).select("_id");
    const employer = await Employer.findById(job.posted).select("email");
    const notification = await UserNotification.create(
      JobPostPayload(employer?.email ?? job.company, job.title, workers.map((w) => w._id), new Date()),
    );
    emit(null, "notification:worker:new", notification);
    return;
  }

  await job.save();
  await notifyAdmin(
    `Job post flagged: ${job.title}`,
    `"${job.title}" by ${job.company} was held for review by automated screening.`,
    result,
    "job",
  );
};

// Fire-and-forget wrapper so a slow or failing check never breaks the HTTP request.
export const runInBackground = (label: string, task: () => Promise<void>) => {
  task().catch((err) => console.error(`[autoVerify] ${label} failed:`, err));
};
