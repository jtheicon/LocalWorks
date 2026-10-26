import { Model, Types } from "mongoose";
import Application from "../model/Application";
import ApplicationAccepted from "../model/ApplicationAccepted";
import Contact from "../model/Contact";
import Job from "../model/Job";
import JobsCompleted from "../model/JobsCompleted";
import Message from "../model/Message";
import Proof from "../model/Proof";
import Rating from "../model/Rating";
import Reason from "../model/Reason";
import Report from "../model/Report";
import ReportWorker from "../model/ReportWorker";
import Transactions from "../model/Transactions";
import VerifiedWorker from "../model/VerifiedWorker";
import WorkerAssignment from "../model/WorkerAssignment";
import UserNotification from "../model/UserNotification";
import ReactivationToken from "../model/ReactivationToken";
import Worker from "../model/Worker";
import Employer from "../model/Employer";
import { ResponseModel } from "../model/Response";
import Portfolio from "../model/Portfolio";
import AboutMe from "../model/AboutMe";
import Experience from "../model/Experience";
import { DEACTIVATION_MONTHS, now } from "./inactivityPolicy";
import { collectAccountS3Keys, deleteAccountS3Objects } from "./accountS3Cleanup";

export type AccountRole = "worker" | "employer";
export type AccountDeletionReason = "inactivity" | "admin";

const oid = (id: string | Types.ObjectId) =>
  id instanceof Types.ObjectId ? id : new Types.ObjectId(String(id));

const modelForRole = (role: AccountRole): Model<any> =>
  role === "worker" ? Worker : Employer;

/** Mongoose 8 filter typings reject valid ObjectId queries on some legacy models. */
const deleteWhere = (M: Model<any>, filter: Record<string, unknown>) =>
  M.deleteMany(filter as never);

/** Clears profile / credentials from the tombstone row (email kept for login + signup release). */
export const scrubDeletedAccountPersonalData = async (
  role: AccountRole,
  userId: string | Types.ObjectId,
) => {
  const id = oid(userId);
  const tag = `#purged-${String(id)}`;

  if (role === "worker") {
    await Worker.updateOne(
      { _id: id, status: "deleted" },
      {
        $set: {
          name: `Removed user${tag}`,
          phoneNumber: "",
          photo: "",
          resume: "",
          jobTitle: "",
          location: "",
          yearsOfExperience: "",
          about_me: "",
          expected_salary: "",
          hourlyRate: "",
          education: "",
          skills: [],
          certifications: [],
          previousJobs: [],
          verification: null,
          inactivityEmailOverride: "",
        },
        $unset: {
          reactivationReviewedAt: "",
          reactivationReviewedBy: "",
          reactivationRejectionReason: "",
        },
      },
    );
    return;
  }

  await Employer.updateOne(
    { _id: id, status: "deleted" },
    {
      $set: {
        company: `Removed employer${tag}`,
        owner: "",
        logo: "",
        location: "",
        description: "",
        website: "",
        phone: "",
        profile: "",
        permit: "",
        verification: null,
        inactivityEmailOverride: "",
      },
      $unset: {
        reactivationReviewedAt: "",
        reactivationReviewedBy: "",
        reactivationRejectionReason: "",
      },
    },
  );
};

/** Removes platform data tied to a worker or employer (shared by inactivity and admin delete). */
export const purgeAccountRelatedData = async (
  role: AccountRole,
  userId: string | Types.ObjectId,
) => {
  const id = oid(userId);

  await ReactivationToken.deleteMany({ userId: id, role });
  await UserNotification.deleteMany({ audience: "specific", targetUsers: id });
  await Message.deleteMany({ $or: [{ senderId: id }, { recipientId: id }] });
  await deleteWhere(Portfolio, { user: id });
  await deleteWhere(AboutMe, { user: id });
  await deleteWhere(Experience, { user: id });
  await deleteWhere(Report, { sentBy: id });

  if (role === "worker") {
    const applicationIds = (
      await Application.find({ worker: id }).select("_id").lean()
    ).map((a) => a._id);
    if (applicationIds.length) {
      await ResponseModel.deleteMany({ application: { $in: applicationIds } });
    }

    const contacts = await Contact.find({ worker: id }).select("_id").lean();
    const contactIds = contacts.map((c) => c._id);
    if (contactIds.length) {
      await Message.deleteMany({ contactId: { $in: contactIds } });
      await Contact.deleteMany({ _id: { $in: contactIds } });
    }
    await WorkerAssignment.updateMany(
      { "targetWorkers._id": id },
      { $pull: { targetWorkers: { _id: id } } },
    );
    await Promise.all([
      deleteWhere(Application, { worker: id }),
      deleteWhere(Rating, { worker: id }),
      deleteWhere(Proof, { worker: id }),
      deleteWhere(VerifiedWorker, { worker: id }),
      deleteWhere(Report, { workerId: id }),
      deleteWhere(ReportWorker, { workerId: id }),
      deleteWhere(Reason, { workerId: id }),
      deleteWhere(JobsCompleted, { workerId: id }),
      deleteWhere(Transactions, { $or: [{ workerId: id }, { sender: id }] }),
    ]);
    return;
  }

  const jobIds = (await Job.find({ posted: id }).select("_id").lean()).map((j) => j._id);
  if (jobIds.length) {
    await ResponseModel.deleteMany({ job: { $in: jobIds } });
    await Application.deleteMany({ job: { $in: jobIds } });
    await ApplicationAccepted.deleteMany({ job: { $in: jobIds } });
    await Job.deleteMany({ _id: { $in: jobIds } });
  }

  const contacts = await Contact.find({ employerId: id }).select("_id").lean();
  const contactIds = contacts.map((c) => c._id);
  if (contactIds.length) {
    await Message.deleteMany({ contactId: { $in: contactIds } });
    await Contact.deleteMany({ _id: { $in: contactIds } });
  }

  await Promise.all([
    deleteWhere(WorkerAssignment, { employerId: id }),
    deleteWhere(Report, { employerId: id }),
    deleteWhere(ReportWorker, { employerId: id }),
    deleteWhere(Reason, { employerId: id }),
    deleteWhere(JobsCompleted, { employerId: id }),
    deleteWhere(Transactions, { $or: [{ employerId: id }, { sender: id }] }),
  ]);
};

export type ApplyAccountDeletionInput = {
  role: AccountRole;
  userId: string | Types.ObjectId;
  reason: AccountDeletionReason;
  previousStatus: string;
  lastActiveAt?: Date | null;
  policyEffectiveAt?: Date | null;
  inactivityWarningStage?: number;
  /** Legacy `not_active` + inactivity → deleted without sending another lifecycle email */
  legacyMigration?: boolean;
};

/**
 * Purges related rows and sets the user document to status `deleted`.
 * Idempotent when the account is already deleted.
 */
export const applyAccountDeletion = async (
  input: ApplyAccountDeletionInput,
): Promise<{ ok: true; alreadyDeleted: boolean } | { ok: false; error: string }> => {
  const M = modelForRole(input.role);
  const id = oid(input.userId);

  const existing = await M.findById(id).select("status").lean();
  if (!existing) return { ok: false, error: "not_found" };
  if (existing.status === "deleted") return { ok: true, alreadyDeleted: true };

  const s3Keys = await collectAccountS3Keys(input.role, id);
  await deleteAccountS3Objects(s3Keys);

  try {
    await purgeAccountRelatedData(input.role, id);
  } catch (err) {
    console.error("[accountDeletion] purge failed:", id, err);
    return { ok: false, error: "purge_failed" };
  }

  const warningStage =
    input.inactivityWarningStage ??
    (input.reason === "inactivity" ? DEACTIVATION_MONTHS : undefined);

  const updated = await M.findOneAndUpdate(
    { _id: id, status: { $ne: "deleted" } },
    {
      $set: {
        status: "deleted",
        deactivation: {
          reason: input.reason,
          at: now(),
          deleted: true,
          previousStatus: input.previousStatus,
          ...(input.legacyMigration ? { migratedFromLegacyDeactivation: true } : {}),
          ...(input.lastActiveAt ? { lastActiveAt: input.lastActiveAt } : {}),
          ...(input.policyEffectiveAt ? { policyEffectiveAt: input.policyEffectiveAt } : {}),
        },
        reactivationRequestStatus: null,
        reactivationRequestedAt: null,
        ...(warningStage != null ? { inactivityWarningStage: warningStage } : {}),
        ...(input.reason === "inactivity"
          ? { lastInactivityNotificationAt: now() }
          : {}),
      },
    },
    { new: true },
  );

  if (!updated) return { ok: false, error: "status_update_failed" };

  await scrubDeletedAccountPersonalData(input.role, id);

  return { ok: true, alreadyDeleted: false };
};

/** @deprecated use purgeAccountRelatedData */
export const purgeAccountDataForInactivity = purgeAccountRelatedData;
