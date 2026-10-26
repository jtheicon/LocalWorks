/** Worker-facing account standing (mirrors admin inactivity lifecycle, read-only). */

export type WorkerAccountInsight = {
  lifecycle: string;
  status: string;
  inactivityWarningStage?: number;
  monthsSinceActivity?: number | null;
  nextMilestoneMonths?: number | null;
  deactivationMonths?: number;
};

export const workerAccountStatusLabel = (insight: WorkerAccountInsight): { label: string; className: string; detail: string } => {
  if (insight.status === "pending") {
    return {
      label: "Pending approval",
      className: "bg-yellow-100 text-yellow-900",
      detail: "Your account is waiting for admin approval.",
    };
  }
  if (insight.status === "not_active") {
    return {
      label: "Deactivated",
      className: "bg-red-100 text-red-800",
      detail: "You cannot use the platform until your account is restored.",
    };
  }
  if (insight.lifecycle === "inactive") {
    const stage = insight.inactivityWarningStage ?? 0;
    const mo = insight.monthsSinceActivity;
    const deleteAt = insight.deactivationMonths ?? 6;
    const detail =
      stage > 0
        ? `We emailed you about inactivity (stage ${stage} mo). Your CV/Resume and profile stay saved until then — sign in to stay active. Accounts are permanently removed after ${deleteAt} months idle.`
        : `Sign in regularly to keep your profile visible. Your CV/Resume and details stay saved until ${deleteAt}+ months of inactivity, when accounts may be permanently removed.`;
    return {
      label: mo != null && mo >= deleteAt ? `Inactive · action needed` : "Inactive · sign in soon",
      className: "bg-amber-100 text-amber-900",
      detail,
    };
  }
  if (insight.status === "verified") {
    return {
      label: "Verified · active",
      className: "bg-green-100 text-green-800",
      detail: "Your profile is verified and in good standing.",
    };
  }
  return {
    label: "Active",
    className: "bg-green-100 text-green-800",
    detail: "Your account is in good standing.",
  };
};
