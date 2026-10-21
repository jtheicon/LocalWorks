import Worker from "../model/Worker";
import Employer from "../model/Employer";

const notDeleted = { status: { $ne: "deleted" } };

// True if an account that is NOT deleted already uses this email.
export const isEmailTaken = async (email: string) => {
  const [worker, employer] = await Promise.all([
    Worker.exists({ email, ...notDeleted }),
    Employer.exists({ email, ...notDeleted }),
  ]);
  return Boolean(worker || employer);
};

// Admin "delete" is a soft delete (status: "deleted") so past jobs, applications
// and reports keep their history. The old record still holds the unique email
// (and, for workers, the unique name), which would block re-registering.
// This renames those fields on deleted records only, freeing them for a new account.
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
      await doc.collection.updateOne({ _id: doc._id }, { $set: { name: `${doc.name} (deleted)${tag(doc._id)}` } });
    }
  }
};
