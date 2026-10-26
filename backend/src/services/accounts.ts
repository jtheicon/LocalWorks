import Worker from "../model/Worker";
import Employer from "../model/Employer";
import Application from "../model/Application";

const notDeleted = { status: { $ne: "deleted" } };

// True if an account that is NOT deleted already uses this email.
export const isEmailTaken = async (email: string) => {
  const [worker, employer] = await Promise.all([
    Worker.exists({ email, ...notDeleted }),
    Employer.exists({ email, ...notDeleted }),
  ]);
  return Boolean(worker || employer);
};

// Deleted accounts keep a tombstone row (status: "deleted") for audit; related
// jobs/applications/messages are removed in accountDeletion.ts. The tombstone
// still holds the unique email (and worker name), which blocks re-register until
// releaseDeletedAccount renames those fields when someone signs up again.
export const releaseDeletedAccount = async (email: string, workerName?: string) => {
  const tag = (id: unknown) => `#deleted-${String(id)}`;

  const deleted = [
    ...(await Worker.find({ email, status: "deleted" }).select("_id email")),
    ...(await Employer.find({ email, status: "deleted" }).select("_id email")),
  ];
  for (const doc of deleted) {
    // Not a valid email anymore, so it can never be used to log in.
    await doc.collection.updateOne({ _id: doc._id }, { $set: { email: `${doc.get("email")}${tag(doc._id)}` } });
  }

  if (workerName) {
    const sameName = await Worker.find({ name: workerName, status: "deleted" }).select("_id name");
    for (const doc of sameName) {
      // ponytail: deleteMany only — ResponseModel cleanup lives in accountDeletion purge
      await Application.deleteMany({ worker: doc._id });
      await doc.collection.updateOne({ _id: doc._id }, { $set: { name: `${doc.name} (deleted)${tag(doc._id)}` } });
    }
  }
};
