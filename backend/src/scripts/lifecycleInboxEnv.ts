/**
 * INACTIVITY_LIFECYCLE_INBOX — notification destination for inactivity email tour seeds.
 * INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL — optional platform login to backdate (defaults to inbox).
 * Read at runtime (inside run()) so dotenvx-injected .env is always used.
 */

export type LifecycleSeedTargets = {
  /** SMTP recipient for every lifecycle email these seeds send */
  notifyInbox: string;
  /** Worker/employer login email to backdate for individual 3/4/5/deletion commands */
  accountEmail: string;
};

export const readLifecycleInbox = (): string | null => {
  const trimmed = process.env.INACTIVITY_LIFECYCLE_INBOX?.trim();
  return trimmed || null;
};

export const readLifecycleAccountEmail = (): string | null => {
  const trimmed = process.env.INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL?.trim();
  return trimmed || null;
};

export const requireLifecycleInbox = (forAction: string): string => {
  const inbox = readLifecycleInbox();
  if (!inbox) {
    throw new Error(
      `Set INACTIVITY_LIFECYCLE_INBOX in backend/.env ${forAction}. ` +
        "All warning and deletion emails from these seeds are sent to this address. " +
        "For individual 3/4/5/deletion commands, set INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL to the worker/employer login to backdate when it differs from the inbox. " +
        "Re-run after changing .env (shell exports are overridden via dotenvx --overload on npm seed scripts).",
    );
  }
  return inbox;
};

export const resolveLifecycleSeedTargets = (forAction: string): LifecycleSeedTargets => {
  const notifyInbox = requireLifecycleInbox(forAction);
  const accountEmail = readLifecycleAccountEmail() || notifyInbox;
  return { notifyInbox, accountEmail };
};
