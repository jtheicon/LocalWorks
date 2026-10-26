import { Types } from "mongoose";
import Application from "../model/Application";
import ApplicationAccepted from "../model/ApplicationAccepted";
import Job from "../model/Job";
import Reason from "../model/Reason";
import Worker from "../model/Worker";
import { ResponseModel } from "../model/Response";
import { isWorkerUnavailableToEmployer } from "./employerWorkerDisplay";

export type StaleApplicationCleanupResult = {
  purged: number;
  positionsRestored: number;
};

type ApplicationRow = {
  _id: Types.ObjectId;
  job: Types.ObjectId;
  worker: Types.ObjectId;
  status: string;
};

/** Removes one application whose worker is gone or tombstoned; restores a job slot when it was Accepted. */
export const purgeOneStaleApplication = async (app: ApplicationRow): Promise<boolean> => {
  let restoredSlot = false;
  if (app.status === "Accepted") {
    await Job.updateOne({ _id: app.job }, { $inc: { positions: 1 } });
    await ApplicationAccepted.deleteOne({ job: app.job });
    restoredSlot = true;
  }
  await ResponseModel.deleteMany({ application: app._id });
  await Reason.deleteMany({ applicationId: app._id });
  await Application.deleteOne({ _id: app._id });
  return restoredSlot;
};

export const applicationWorkerIsStale = (
  workerId: Types.ObjectId | string,
  workerById: Map<string, { status?: string; name?: string }>,
): boolean => {
  const worker = workerById.get(String(workerId));
  return !worker || isWorkerUnavailableToEmployer(worker);
};

/** Purges applications on an employer's jobs when the worker account no longer exists or is removed. */
export const purgeStaleApplicationsForEmployerJobs = async (
  jobIds: Types.ObjectId[],
  options?: { dryRun?: boolean },
): Promise<StaleApplicationCleanupResult> => {
  if (!jobIds.length) return { purged: 0, positionsRestored: 0 };

  const apps = (await Application.find({ job: { $in: jobIds } })
    .select("_id job worker status")
    .lean()) as ApplicationRow[];
  if (!apps.length) return { purged: 0, positionsRestored: 0 };

  const workerIds = [...new Set(apps.map((a) => String(a.worker)))];
  const workers = await Worker.find({ _id: { $in: workerIds } }).select("status name").lean();
  const workerById = new Map(workers.map((w) => [String(w._id), w]));

  const stale = apps.filter((app) => applicationWorkerIsStale(app.worker, workerById));
  const positionsRestored = stale.filter((a) => a.status === "Accepted").length;

  if (options?.dryRun || !stale.length) {
    return { purged: stale.length, positionsRestored };
  }

  for (const app of stale) {
    await purgeOneStaleApplication(app);
  }

  if (stale.length) {
    console.info(
      `[employerApplicationCleanup] purged ${stale.length} stale application(s); restored ${positionsRestored} job slot(s).`,
    );
  }

  return { purged: stale.length, positionsRestored };
};

export const purgeStaleApplicationsForEmployer = async (
  employerId: string | Types.ObjectId,
  options?: { dryRun?: boolean },
): Promise<StaleApplicationCleanupResult> => {
  const jobIds = await Job.find({ posted: employerId }).distinct("_id");
  return purgeStaleApplicationsForEmployerJobs(jobIds, options);
};
