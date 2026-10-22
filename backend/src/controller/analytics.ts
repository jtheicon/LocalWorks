import { Request, Response } from "express";
import Job from "../model/Job";
import Worker from "../model/Worker";
import Employer from "../model/Employer";
import Application from "../model/Application";
import { mainError } from "../errors/showErrors";
import {
  INACTIVITY_MONTHS,
  findInactiveAccounts,
  getLastCleanupRun,
} from "../services/accountCleanup";
import { runInactivityMonitor } from "../services/inactivityMonitor";
import { bucketAccountHealth } from "../services/adminAccountBuckets";

// Sector names come from free-text job categories / worker skill categories,
// so group case-insensitively and display the most common spelling.
const sectorKey = (s?: string) => (s ?? "").trim().toLowerCase() || "uncategorized";
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const isOpen = (job: { status: string; applyBefore?: string }, today: string) =>
  job.status === "ACCEPTED" && (!job.applyBefore || job.applyBefore === "N/A" || job.applyBefore >= today);

const countBy = <T>(items: T[], key: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

// High-level statistics for the admin overview (no per-item lists).
export const Analytics = async (_req: Request, res: Response) => {
  try {
    const [jobs, workers, employers, applications] = await Promise.all([
      Job.find({ status: { $ne: "DELETED" } }).select("category status positions applyBefore createdAt verification").lean(),
      // Deleted accounts (soft-deleted by an admin) are left out of all statistics.
      Worker.find({ status: { $ne: "deleted" } })
        .select("skill status createdAt updatedAt lastActiveAt verification deactivation reactivationRequestStatus")
        .lean(),
      Employer.find({ status: { $ne: "deleted" } })
        .select("status createdAt updatedAt lastActiveAt verification deactivation reactivationRequestStatus")
        .lean(),
      Application.find().select("job status createdAt").lean(),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const jobSector = new Map(jobs.map((j: any) => [String(j._id), sectorKey(j.category)]));

    /* ------------------------------ by sector ------------------------------ */
    type Row = { sector: string; labels: Record<string, number>; jobPosts: number; openJobs: number; openPositions: number; workers: number; applications: number; placements: number };
    const sectors = new Map<string, Row>();
    const row = (raw?: string) => {
      const key = sectorKey(raw);
      if (!sectors.has(key)) {
        sectors.set(key, { sector: key, labels: {}, jobPosts: 0, openJobs: 0, openPositions: 0, workers: 0, applications: 0, placements: 0 });
      }
      const r = sectors.get(key)!;
      const label = (raw ?? "").trim() || "Uncategorized";
      r.labels[label] = (r.labels[label] ?? 0) + 1;
      return r;
    };

    for (const j of jobs as any[]) {
      if (j.status === "DECLINED") continue;
      const r = row(j.category);
      r.jobPosts++;
      if (isOpen(j, today)) {
        r.openJobs++;
        r.openPositions += Number(j.positions) || 0;
      }
    }
    for (const w of workers as any[]) {
      if (w.status !== "active") continue;
      row(w.skill).workers++;
    }
    for (const a of applications as any[]) {
      const key = jobSector.get(String(a.job));
      if (!key || !sectors.has(key)) continue;
      const r = sectors.get(key)!;
      r.applications++;
      if (a.status === "Accepted") r.placements++;
    }

    const bySector = [...sectors.values()]
      .map(({ labels, ...r }) => ({
        ...r,
        sector: titleCase(Object.entries(labels).sort((a, b) => b[1] - a[1])[0][0]),
      }))
      .sort((a, b) => b.jobPosts - a.jobPosts || b.workers - a.workers);

    /* ---------------------------- monthly trend ---------------------------- */
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("en-US", { month: "short" }),
      });
    }
    const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const jobsPerMonth = countBy(jobs as any[], (j) => monthOf(new Date(j.createdAt)));
    const appsPerMonth = countBy(applications as any[], (a) => monthOf(new Date(a.createdAt)));
    const usersPerMonth = countBy([...workers, ...employers] as any[], (u) => monthOf(new Date(u.createdAt)));
    const monthly = months.map((m) => ({
      month: m.label,
      jobsPosted: jobsPerMonth[m.key] ?? 0,
      applications: appsPerMonth[m.key] ?? 0,
      newUsers: usersPerMonth[m.key] ?? 0,
    }));

    /* ------------------------- application outcomes ------------------------ */
    const outcomeCounts = countBy(applications as any[], (a) => a.status);
    const applicationOutcomes = ["Pending Review", "Interview Scheduled", "Accepted", "Not Selected", "Withdrawed"].map((status) => ({
      status: status === "Withdrawed" ? "Withdrawn" : status,
      count: outcomeCounts[status] ?? 0,
    }));

    /* --------------------------- AI verification --------------------------- */
    const checked = [...jobs, ...workers, ...employers].map((d: any) => d.verification).filter(Boolean);
    const verification = {
      total: checked.length,
      autoApproved: checked.filter((v: any) => v.method === "ai" && v.decision === "approve").length,
      flagged: checked.filter((v: any) => v.method === "ai" && v.decision === "needs_review").length,
      unavailable: checked.filter((v: any) => v.method === "unavailable").length,
    };

    /* ---------------------------- account health (aligned with User management) */
    const accountStatus = (list: any[]) => bucketAccountHealth(list);

    const openJobs = jobs.filter((j: any) => isOpen(j, today));
    const placements = outcomeCounts["Accepted"] ?? 0;
    const workerHealth = accountStatus(workers);
    const employerHealth = accountStatus(employers);

    return res.status(200).json({
      success: true,
      totals: {
        openJobs: openJobs.length,
        openPositions: openJobs.reduce((sum: number, j: any) => sum + (Number(j.positions) || 0), 0),
        activeWorkers: workerHealth.platformActive + workerHealth.inactivityMonitoring,
        activeEmployers: employerHealth.platformActive + employerHealth.inactivityMonitoring,
        applications: applications.length,
        placements,
        placementRate: applications.length ? Math.round((placements / applications.length) * 100) : 0,
      },
      bySector,
      monthly,
      applicationOutcomes,
      verification,
      accounts: { workers: workerHealth, employers: employerHealth },
    });
  } catch (error) {
    mainError(error, res);
  }
};

/* -------------------------------------------------------------------------- */
/*                               Account cleanup                              */
/* -------------------------------------------------------------------------- */

export const CleanupPreview = async (_req: Request, res: Response) => {
  try {
    const candidates = await findInactiveAccounts();
    return res.status(200).json({
      success: true,
      inactivityMonths: INACTIVITY_MONTHS,
      lastRun: getLastCleanupRun(),
      candidates,
    });
  } catch (error) {
    mainError(error, res);
  }
};

export const RunCleanup = async (_req: Request, res: Response) => {
  try {
    const result = await runInactivityMonitor();
    return res.status(200).json({
      success: true,
      message: `Inactivity job finished (${result.deactivated} deactivated).`,
      result,
    });
  } catch (error) {
    mainError(error, res);
  }
};
