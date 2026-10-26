/** Unified admin status labels (User management, profile modal, reactivation). */

export type AdminStatusInput = {
  status: string;
  lifecycle?: string;
  monthsSinceActivity?: number | null;
  inactivityWarningStage?: number | null;
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
    const warnStage = row.inactivityWarningStage ?? 0;
    const warnNote =
      warnStage > 0 ? ` · ${warnStage}-month warning email sent` : "";
    return {
      label: longIdle ? "Inactive (deletion due)" : "Inactive (monitoring)",
      badgeClassName: longIdle ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900",
      accessNote:
        (longIdle
          ? row.status === "verified"
            ? "Verified · access still active until the daily job runs · 6+ mo idle → permanent account deletion (not admin deactivate)."
            : "Access still active until the daily job runs · 6+ mo idle → permanent account deletion (not admin deactivate)."
          : row.status === "verified"
            ? "Verified · platform access active · inactivity warnings at 3/4/5 mo; permanent deletion at 6 mo."
            : "Platform access active · inactivity monitoring (3/4/5 warnings, permanent deletion at 6 mo).") +
        warnNote,
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
