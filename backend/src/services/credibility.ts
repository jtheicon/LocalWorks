// Credibility scoring (0-100) for workers and employers.
//
// The score combines the AI document verification (the strongest signal) with the
// account's track record on LocalWorks. Every point is attributed to a named factor,
// so users and admins can see exactly why a score is what it is.
import { Types } from "mongoose";
import Worker from "../model/Worker";
import Employer from "../model/Employer";
import Job from "../model/Job";
import Application from "../model/Application";
import JobsCompleted from "../model/JobsCompleted";
import Report from "../model/Report";
import VerifiedWorker from "../model/VerifiedWorker";

export interface CredibilityFactor {
  label: string;
  points: number; // negative for penalties
  max: number;    // 0 for penalties
  detail: string;
}

export interface Credibility {
  score: number;
  // "New": under a month old with no track record or reports yet - a low score there
  // means "not enough history", not "untrustworthy".
  level: "High" | "Good" | "Fair" | "Low" | "New";
  factors: CredibilityFactor[];
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const levelOf = (score: number): Credibility["level"] =>
  score >= 80 ? "High" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Low";
const monthsSince = (d?: Date) => (d ? (Date.now() - new Date(d).getTime()) / (30 * 24 * 60 * 60 * 1000) : 0);

const finish = (factors: CredibilityFactor[], isNew: boolean): Credibility => {
  const score = Math.round(clamp(factors.reduce((sum, f) => sum + f.points, 0)));
  const hasPenalty = factors.some((f) => f.points < 0);
  return { score, level: isNew && !hasPenalty && score < 60 ? "New" : levelOf(score), factors };
};

// Document verification: AI approval scales with its confidence; an admin approval
// (account activated after manual review) earns a fixed, slightly lower amount.
const documentFactor = (doc: any, max: number, adminPoints: number, what: string): CredibilityFactor => {
  const v = doc.verification;
  if (v?.method === "ai" && v.decision === "approve") {
    const pct = Math.round((v.confidence ?? 0) * 100);
    return { label: `${what} verification`, points: Math.round(max * (v.confidence ?? 0)), max, detail: `Verified by AI (${pct}% confidence)` };
  }
  if (doc.status === "active" || doc.status === "verified") {
    return { label: `${what} verification`, points: adminPoints, max, detail: "Approved by an administrator" };
  }
  return { label: `${what} verification`, points: 0, max, detail: "Not verified yet" };
};

const reportPenalties = (reports: any[]): CredibilityFactor[] => {
  const upheld = reports.filter((r) => r.status === "Resolved").length;
  const open = reports.filter((r) => r.status === "Pending" || r.status === "Under Review").length;
  const out: CredibilityFactor[] = [];
  if (upheld) out.push({ label: "Upheld reports", points: -15 * upheld, max: 0, detail: `${upheld} report(s) resolved against this account` });
  if (open) out.push({ label: "Open reports", points: -5 * open, max: 0, detail: `${open} report(s) under review` });
  return out;
};

const filled = (value: unknown, placeholders: unknown[] = []) =>
  value != null && value !== "" && !placeholders.includes(value) && !(Array.isArray(value) && value.length === 0);

/* -------------------------------------------------------------------------- */

export const workerCredibility = async (ids: string[]): Promise<Record<string, Credibility>> => {
  const objectIds = ids.filter(Types.ObjectId.isValid).map((id) => new Types.ObjectId(id));
  const [workers, badges, hires, submissions, reports] = await Promise.all([
    Worker.find({ _id: { $in: objectIds } }).lean(),
    VerifiedWorker.find({ worker: { $in: objectIds } }).select("worker").lean(),
    Application.find({ worker: { $in: objectIds }, status: "Accepted" }).select("worker").lean(),
    JobsCompleted.find({ workerId: { $in: objectIds }, submitted: true }).select("workerId status isLate").lean(),
    Report.find({ workerId: { $in: objectIds }, reporter: "employer" }).select("workerId status").lean(),
  ]);

  const by = <T extends Record<string, any>>(list: T[], key: keyof T) => (id: string) => list.filter((x) => String(x[key]) === id);
  const hiresOf = by(hires as any[], "worker");
  const subsOf = by(submissions as any[], "workerId");
  const reportsOf = by(reports as any[], "workerId");
  const badged = new Set((badges as any[]).map((b) => String(b.worker)));

  const result: Record<string, Credibility> = {};
  for (const w of workers as any[]) {
    const id = String(w._id);
    const factors: CredibilityFactor[] = [];

    factors.push(documentFactor(w, 35, 25, "Resume"));
    factors.push({
      label: "Verified badge",
      points: badged.has(id) ? 5 : 0,
      max: 5,
      detail: badged.has(id) ? "Holds the LocalWorks verified badge" : "No verified badge yet",
    });

    const hired = hiresOf(id).length;
    const completed = subsOf(id).filter((s) => s.status === "COMPLETED").length;
    factors.push({
      label: "Work track record",
      points: Math.min(25, (hired + completed) * 5),
      max: 25,
      detail: `${hired} hire(s), ${completed} completed assignment(s)`,
    });

    // Workers without reviews get a neutral half score instead of zero.
    factors.push(
      w.reviews > 0
        ? { label: "Ratings", points: Math.round((Number(w.rating) / 5) * 15), max: 15, detail: `${Number(w.rating).toFixed(1)} / 5 from ${w.reviews} review(s)` }
        : { label: "Ratings", points: 8, max: 15, detail: "No reviews yet (neutral)" },
    );

    const profileChecks = [
      filled(w.photo),
      filled(w.about_me, ["N/A"]),
      (w.skills ?? []).length >= 3,
      filled(w.location, ["No Specified Location"]),
      filled(w.yearsOfExperience, ["Years of experience isn't specified"]),
      filled(w.expected_salary, ["N/A"]),
    ];
    const done = profileChecks.filter(Boolean).length;
    factors.push({ label: "Profile completeness", points: Math.round((done / profileChecks.length) * 12), max: 12, detail: `${done} of ${profileChecks.length} profile sections filled` });

    const months = monthsSince(w.createdAt);
    factors.push({ label: "Account age", points: Math.min(8, Math.floor(months * 2)), max: 8, detail: months < 1 ? "Joined this month" : `Member for ${Math.floor(months)} month(s)` });

    const lateOrRejected = subsOf(id).filter((s) => s.isLate || s.status === "REJECTED").length;
    if (lateOrRejected) factors.push({ label: "Late / rejected work", points: -3 * lateOrRejected, max: 0, detail: `${lateOrRejected} late or rejected submission(s)` });
    factors.push(...reportPenalties(reportsOf(id)));

    result[id] = finish(factors, months < 1 && hired + completed === 0);
  }
  return result;
};

export const employerCredibility = async (ids: string[]): Promise<Record<string, Credibility>> => {
  const objectIds = ids.filter(Types.ObjectId.isValid).map((id) => new Types.ObjectId(id));
  const [employers, jobs, reports] = await Promise.all([
    Employer.find({ _id: { $in: objectIds } }).lean(),
    Job.find({ posted: { $in: objectIds }, status: { $ne: "DELETED" } }).select("posted status verification").lean(),
    Report.find({ employerId: { $in: objectIds }, reporter: "worker" }).select("employerId status").lean(),
  ]);
  const hires = await Application.find({ job: { $in: (jobs as any[]).map((j) => j._id) }, status: "Accepted" }).select("job").lean();
  const jobOwner = new Map((jobs as any[]).map((j) => [String(j._id), String(j.posted)]));

  const result: Record<string, Credibility> = {};
  for (const e of employers as any[]) {
    const id = String(e._id);
    const factors: CredibilityFactor[] = [];

    factors.push(documentFactor(e, 35, 25, "Business permit"));

    const placed = (hires as any[]).filter((h) => jobOwner.get(String(h.job)) === id).length;
    factors.push({ label: "Hiring track record", points: Math.min(20, placed * 5), max: 20, detail: `${placed} worker(s) hired through LocalWorks` });

    // Share of this employer's job posts that passed AI screening without being flagged or declined.
    const own = (jobs as any[]).filter((j) => String(j.posted) === id);
    const clean = own.filter((j) => j.status === "ACCEPTED" && j.verification?.decision !== "needs_review").length;
    factors.push(
      own.length
        ? { label: "Job post quality", points: Math.round((clean / own.length) * 15), max: 15, detail: `${clean} of ${own.length} job post(s) passed screening` }
        : { label: "Job post quality", points: 8, max: 15, detail: "No job posts yet (neutral)" },
    );

    const profileChecks = [
      filled(e.profile, ["default.jpg"]),
      filled(e.description, ["No Description"]),
      filled(e.location, ["No Location"]),
      filled(e.website, ["N/A"]),
      filled(e.owner, ["N/A"]),
      Number(e.noOfEmployees) > 0,
    ];
    const done = profileChecks.filter(Boolean).length;
    factors.push({ label: "Profile completeness", points: Math.round((done / profileChecks.length) * 15), max: 15, detail: `${done} of ${profileChecks.length} company details filled` });

    const months = monthsSince(e.createdAt);
    factors.push({ label: "Account age", points: Math.min(15, Math.floor(months * 2.5)), max: 15, detail: months < 1 ? "Joined this month" : `Member for ${Math.floor(months)} month(s)` });

    const declined = own.filter((j) => j.status === "DECLINED").length;
    if (declined) factors.push({ label: "Declined job posts", points: -5 * declined, max: 0, detail: `${declined} job post(s) declined` });
    factors.push(...reportPenalties((reports as any[]).filter((r) => String(r.employerId) === id)));

    result[id] = finish(factors, months < 1 && placed === 0);
  }
  return result;
};
