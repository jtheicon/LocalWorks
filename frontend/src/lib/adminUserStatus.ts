/** Unified admin status labels (User management, profile modal, reactivation). */

export type AdminStatusInput = {
  status: string;
  lifecycle?: string;
  monthsSinceActivity?: number | null;
  reactivationRequestStatus?: string | null;
};

export type AdminUnifiedStatus = {
  label: string;
  badgeClassName: string;
  /** Short line under the badge in modals. */
  accessNote: string;
};

export const resolveAdminUserStatus = (
  row: AdminStatusInput,
  deactivationMonths = 6,
): AdminUnifiedStatus => {
  if (row.reactivationRequestStatus === "pending") {
    return {
      label: "Reactivation pending",
      badgeClassName: "bg-amber-100 text-amber-900",
      accessNote: "Platform access blocked until admin review (deactivated).",
    };
  }

  if (row.status === "not_active" || row.lifecycle === "deactivated") {
    return {
      label: "Deactivated",
      badgeClassName: "bg-red-100 text-red-800",
      accessNote: "No platform access.",
    };
  }

  if (row.status === "pending" || row.lifecycle === "pending") {
    return {
      label: "Pending approval",
      badgeClassName: "bg-yellow-100 text-yellow-900",
      accessNote: "Account not yet approved for full access.",
    };
  }

  if (row.lifecycle === "inactive") {
    const longIdle =
      row.monthsSinceActivity != null && row.monthsSinceActivity >= deactivationMonths;
    return {
      label: longIdle ? `Inactive (${deactivationMonths}+ mo)` : "Inactive (monitoring)",
      badgeClassName: "bg-amber-100 text-amber-900",
      accessNote:
        longIdle
          ? row.status === "verified"
            ? "Verified · access still active · overdue for automated deactivation if the daily job has not run yet."
            : "Access still active · overdue for automated deactivation if the daily job has not run yet."
          : row.status === "verified"
            ? "Verified · platform access active · inactivity emails / deactivation may apply."
            : "Platform access active · in inactivity monitoring (3/4/5/6‑month policy).",
    };
  }

  if (row.status === "verified") {
    return {
      label: "Active · Verified",
      badgeClassName: "bg-green-100 text-green-800",
      accessNote: "Full platform access · verified worker.",
    };
  }

  return {
    label: "Active",
    badgeClassName: "bg-green-100 text-green-800",
    accessNote: "Full platform access · in good standing on inactivity monitoring.",
  };
};
