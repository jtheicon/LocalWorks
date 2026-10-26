import { isPurgedDisplayName } from "./inactivityEmails";

export const FORMER_WORKER_LABEL = "Former worker (account removed)";

/** Name mangled when a deleted worker tombstone is released for re-registration. */
export const isReleasedTombstoneName = (name?: string | null): boolean =>
  /\(deleted\)#deleted-[a-f0-9]{24}$/i.test(String(name ?? "").trim());

export const isWorkerUnavailableToEmployer = (worker: unknown): boolean => {
  if (!worker || typeof worker !== "object") return true;
  const w = worker as { status?: string; name?: string };
  if (w.status === "deleted") return true;
  const name = w.name?.trim() ?? "";
  if (!name) return true;
  if (isPurgedDisplayName(name)) return true;
  if (isReleasedTombstoneName(name)) return true;
  return false;
};

export const employerWorkerDisplayName = (worker: unknown): string => {
  if (isWorkerUnavailableToEmployer(worker)) return FORMER_WORKER_LABEL;
  return String((worker as { name?: string }).name ?? "").trim() || FORMER_WORKER_LABEL;
};

type PopulatedApplication = {
  _id: unknown;
  status: string;
  job: unknown;
  worker: unknown;
  [key: string]: unknown;
};

/** Normalizes employer-facing application payloads; drops unusable pending rows. */
export const formatApplicationForEmployer = (app: PopulatedApplication) => {
  const maybeDoc = app as { toObject?: () => PopulatedApplication };
  const raw =
    typeof maybeDoc.toObject === "function" ? maybeDoc.toObject() : { ...app };

  if (!raw.job || typeof raw.job !== "object") return null;

  const unavailable =
    !raw.worker ||
    typeof raw.worker !== "object" ||
    isWorkerUnavailableToEmployer(raw.worker);

  if (unavailable) {
    return null;
  }

  const worker = raw.worker as Record<string, unknown>;
  raw.worker = {
    ...worker,
    name: employerWorkerDisplayName(worker),
    unavailable: false,
  };
  return raw;
};
