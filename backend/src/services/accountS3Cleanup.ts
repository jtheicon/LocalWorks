import { Types } from "mongoose";
import { deleteFileFromAws } from "../s3-files/upload";
import Worker from "../model/Worker";
import Employer from "../model/Employer";
import Report from "../model/Report";
import Proof from "../model/Proof";
import JobsCompleted from "../model/JobsCompleted";
import type { AccountRole } from "./accountDeletion";

const SKIP_KEYS = new Set(["", "default.png", "default.jpg", "N/A"]);

const pushKey = (keys: Set<string>, raw?: string | null) => {
  const key = raw?.trim();
  if (!key || SKIP_KEYS.has(key)) return;
  keys.add(key);
};

/** Collect S3 object keys for a worker/employer before Mongo purge (call while the user row still exists). */
export const collectAccountS3Keys = async (
  role: AccountRole,
  userId: string | Types.ObjectId,
): Promise<string[]> => {
  const id = userId instanceof Types.ObjectId ? userId : new Types.ObjectId(String(userId));
  const keys = new Set<string>();

  if (role === "worker") {
    const worker = await Worker.findById(id).select("photo resume").lean();
    pushKey(keys, worker?.photo);
    pushKey(keys, worker?.resume);
    const proofs = await Proof.find({ worker: String(id) } as never).select("document").lean();
    for (const p of proofs) pushKey(keys, p.document);
  } else {
    const employer = await Employer.findById(id).select("logo profile permit").lean();
    pushKey(keys, employer?.logo);
    pushKey(keys, employer?.profile);
    pushKey(keys, employer?.permit);
  }

  const reports = await Report.find({
    $or: [{ workerId: id }, { employerId: id }, { sentBy: id }],
  })
    .select("submitEvidence")
    .lean();
  for (const r of reports) {
    for (const file of r.submitEvidence ?? []) pushKey(keys, file.fileName);
  }

  const completed = await JobsCompleted.find({
    $or: [{ workerId: id }, { employerId: id }],
  })
    .select("workerUpload")
    .lean();
  for (const row of completed) {
    for (const upload of row.workerUpload ?? []) pushKey(keys, upload.name);
  }

  return [...keys];
};

/** Best-effort S3 removal; skips when AWS is not configured. */
export const deleteAccountS3Objects = async (keys: string[]) => {
  if (!keys.length) return;
  if (!process.env.AWS_BUCKET_NAME?.trim()) {
    console.warn("[accountDeletion] AWS_BUCKET_NAME unset; skipping S3 cleanup");
    return;
  }
  for (const key of keys) {
    try {
      await deleteFileFromAws(key);
    } catch (err) {
      console.error("[accountDeletion] S3 delete failed:", key, err);
    }
  }
};
