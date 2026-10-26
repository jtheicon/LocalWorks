export const FORMER_WORKER_LABEL = "Former worker (account removed)";

export const isUnavailableEmployerWorker = (worker?: {
  unavailable?: boolean;
  name?: string;
} | null): boolean =>
  Boolean(worker?.unavailable || worker?.name === FORMER_WORKER_LABEL);

export const employerWorkerLabel = (worker?: { name?: string; unavailable?: boolean } | null): string =>
  isUnavailableEmployerWorker(worker) ? FORMER_WORKER_LABEL : (worker?.name?.trim() || FORMER_WORKER_LABEL);
