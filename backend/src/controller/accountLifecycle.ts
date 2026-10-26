import { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import Worker from "../model/Worker";
import Employer from "../model/Employer";
import Admin from "../model/Admin";
import AdminNotification from "../model/AdminNotification";
import { mainError } from "../errors/showErrors";
import {
  validateReactivationToken,
  consumeReactivationToken,
  issueReactivationToken,
} from "../services/reactivationTokens";
import {
  sendReactivationSubmittedEmail,
  sendReactivationApprovedEmail,
  sendReactivationRejectedEmail,
  notifyAdminReactivationRequest,
  accountLifecycleEmail,
} from "../services/inactivityEmails";
import { resetInactivityCycleOnReactivation } from "../services/activityTracking";
import { userModelByRole } from "../services/userModelByRole";
import {
  adminActivityReference,
  computeAdminLifecycle,
  computeLifecycle,
  wholeMonthsSince,
  nextInactivityMilestone,
  scheduledActionDate,
  DEACTIVATION_MONTHS,
  daysSince,
  now,
  isEligibleForInactivityAutomation,
  inactivityPolicyEffectiveAt,
} from "../services/inactivityPolicy";
import { runInactivityMonitor } from "../services/inactivityMonitor";
import { emitAdminUserLifecycleUpdated } from "../services/adminLifecycleSocket";
import { z } from "zod";
import mongoose from "mongoose";

export const reactivationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many reactivation attempts. Try again later." },
});

const tokenQuery = z.object({ token: z.string().min(16) });

export const GetReactivationContext = async (req: Request, res: Response) => {
  const parsed = tokenQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Invalid or missing reactivation link." });
  }

  const validation = await validateReactivationToken(parsed.data.token);
  if (!validation.ok) {
    const messages = {
      invalid: "This reactivation link is invalid.",
      expired: "This reactivation link has expired.",
      used: "This reactivation link has already been used.",
    };
    return res.status(400).json({ success: false, message: messages[validation.code] });
  }

  const M = userModelByRole(validation.role);
  const user = await M.findById(validation.userId).select("status name company email role deactivation reactivationRequestStatus").lean();
  if (!user || user.status !== "not_active") {
    return res.status(400).json({ success: false, message: "This account is not eligible for reactivation via this link." });
  }
  if ((user as any).deactivation?.reason !== "inactivity") {
    return res.status(400).json({ success: false, message: "This account is not eligible for reactivation via this link." });
  }

  return res.status(200).json({
    success: true,
    displayName: (user as any).name ?? (user as any).company ?? "User",
    role: validation.role,
    deactivationReason: (user as any).deactivation?.reason ?? "unknown",
    reactivationRequestStatus: (user as any).reactivationRequestStatus ?? null,
  });
};

export const SubmitReactivationRequest = async (req: Request, res: Response) => {
  const parsed = tokenQuery.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Invalid request." });
  }

  const validation = await validateReactivationToken(parsed.data.token);
  if (!validation.ok) {
    return res.status(400).json({ success: false, message: "Invalid or expired reactivation link." });
  }

  const M = userModelByRole(validation.role);
  const user = await M.findById(validation.userId);
  if (!user || user.status !== "not_active") {
    return res.status(400).json({ success: false, message: "Account not eligible for reactivation." });
  }
  if (user.get("deactivation")?.reason !== "inactivity") {
    return res.status(400).json({ success: false, message: "Account not eligible for reactivation." });
  }

  const updated = await M.findOneAndUpdate(
    {
      _id: validation.userId,
      status: "not_active",
      reactivationRequestStatus: { $ne: "pending" },
    },
    {
      $set: {
        reactivationRequestedAt: now(),
        reactivationRequestStatus: "pending",
      },
    },
    { new: true },
  );
  if (!updated) {
    return res.status(409).json({ success: false, message: "A reactivation request is already pending review." });
  }

  await consumeReactivationToken(validation.tokenId);

  const name = updated.get("name") ?? updated.get("company") ?? "User";
  await sendReactivationSubmittedEmail(
    accountLifecycleEmail(updated.email, updated.get("inactivityEmailOverride")),
    name,
  );

  const label = `${name} (${validation.role}, ${updated.email})`;
  await AdminNotification.create({
    type: "verification",
    title: "Reactivation request pending",
    description: label,
    time: now().toISOString(),
    read: false,
    category: "account",
    details: String(updated._id),
  });
  const admin = await Admin.findOne().select("email").lean();
  if (admin?.email) {
    notifyAdminReactivationRequest(admin.email, label).catch(console.error);
  }

  emitAdminUserLifecycleUpdated("reactivation_request", {
    userId: validation.userId,
    role: validation.role,
  });

  return res.status(200).json({
    success: true,
    message: "Your reactivation request has been submitted for administrative review.",
  });
};

const listQuery = z.object({
  lifecycle: z.enum(["all", "active", "inactive", "deactivated", "pending"]).optional(),
  role: z.enum(["all", "worker", "employer"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const mapUserLifecycleRow = (doc: any, role: "worker" | "employer") => {
  const activity = adminActivityReference(doc);
  const lifecycle = computeAdminLifecycle(doc);
  const milestone = nextInactivityMilestone(doc);
  const displayAt = activity.at;
  const createdAt = doc.createdAt ? new Date(doc.createdAt) : null;
  const qualifyingAt = doc.lastActiveAt ? new Date(doc.lastActiveAt) : null;
  const policyAt = inactivityPolicyEffectiveAt(doc);
  const automatedLifecycle = computeLifecycle(doc);
  const qualifyingMonths = qualifyingAt ? wholeMonthsSince(qualifyingAt) : null;
  const policyMonths = policyAt ? wholeMonthsSince(policyAt) : null;
  return {
    _id: String(doc._id),
    role,
    name: doc.name ?? doc.company,
    email: doc.email,
    status: doc.status,
    lifecycle,
    automatedLifecycle,
    inactivityTracked: isEligibleForInactivityAutomation(doc),
    createdAt,
    monthsSinceRegistration: createdAt ? wholeMonthsSince(createdAt) : null,
    activityBasis: activity.basis,
    lastActiveAt: displayAt,
    qualifyingLastActiveAt: qualifyingAt,
    automatedMonthsSinceActivity: qualifyingMonths,
    policyMonthsSinceActivity: policyMonths,
    lastQualifyingActivityAt: activity.lastQualifyingActivityAt,
    profileUpdatedAt: activity.profileUpdatedAt,
    monthsSinceActivity: displayAt ? wholeMonthsSince(displayAt) : null,
    daysSinceActivity: displayAt ? daysSince(displayAt) : null,
    eligibleForAutoDeactivation:
      isEligibleForInactivityAutomation(doc) &&
      policyAt != null &&
      wholeMonthsSince(policyAt) >= DEACTIVATION_MONTHS,
    lastInactivityNotificationAt: doc.lastInactivityNotificationAt ?? null,
    inactivityWarningStage: doc.inactivityWarningStage ?? 0,
    nextMilestoneMonths: milestone,
    nextScheduledAt:
      policyAt && milestone ? scheduledActionDate(policyAt, milestone) : null,
    deactivation: doc.deactivation ?? null,
    reactivationRequestedAt: doc.reactivationRequestedAt ?? null,
    reactivationRequestStatus: doc.reactivationRequestStatus ?? null,
  };
};

const mapUserRow = mapUserLifecycleRow;

export const AdminListUsersLifecycle = async (req: Request, res: Response) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message });
  }

  const {
    lifecycle = "all",
    role = "all",
    search = "",
    page = 1,
    limit = 24,
  } = parsed.data;
  const q = search.trim().toLowerCase();

  try {
    const rows: ReturnType<typeof mapUserRow>[] = [];

    const load = async (r: "worker" | "employer") => {
      const docs = await userModelByRole(r)
        .find({ status: { $ne: "deleted" } })
        .select(
          "name company email status lastActiveAt updatedAt createdAt inactivityWarningStage lastInactivityNotificationAt deactivation reactivationRequestedAt reactivationRequestStatus",
        )
        .lean();
      for (const d of docs) rows.push(mapUserRow(d, r));
    };

    if (role === "all" || role === "worker") await load("worker");
    if (role === "all" || role === "employer") await load("employer");

    let filtered = rows;
    if (lifecycle !== "all") {
      filtered = filtered.filter((u) => u.lifecycle === lifecycle);
    }
    if (q) {
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.name && u.name.toLowerCase().includes(q)),
      );
    }

    filtered.sort((a, b) => {
      const ta = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const tb = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      return ta - tb;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const users = filtered.slice(start, start + limit);

    return res.status(200).json({
      success: true,
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      policy: { deactivationMonths: DEACTIVATION_MONTHS },
    });
  } catch (error) {
    mainError(error, res);
  }
};

const reactivationAction = z.object({
  userId: z.string().min(1),
  role: z.enum(["worker", "employer"]),
  reason: z.string().max(500).optional(),
});

export const AdminApproveReactivation = async (req: Request, res: Response) => {
  const parsed = reactivationAction.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid payload" });

  const { userId, role } = parsed.data;
  const M = userModelByRole(role);
  const user = await M.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (user.get("reactivationRequestStatus") !== "pending") {
    return res.status(400).json({ success: false, message: "No pending reactivation request." });
  }

  await resetInactivityCycleOnReactivation(role, userId, req.user?.id);
  const name = user.get("name") ?? user.get("company") ?? "User";
  await sendReactivationApprovedEmail(
    accountLifecycleEmail(user.email, user.get("inactivityEmailOverride")),
    name,
  );

  emitAdminUserLifecycleUpdated("reactivation", { userId, role });

  return res.status(200).json({ success: true, message: "Account reactivated." });
};

export const AdminRejectReactivation = async (req: Request, res: Response) => {
  const parsed = reactivationAction.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid payload" });

  const { userId, role, reason } = parsed.data;
  const M = userModelByRole(role);
  const user = await M.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (user.get("reactivationRequestStatus") !== "pending") {
    return res.status(400).json({ success: false, message: "No pending reactivation request." });
  }

  user.set({
    reactivationRequestStatus: "rejected",
    reactivationReviewedAt: now(),
    reactivationReviewedBy: req.user?.id,
    reactivationRejectionReason: reason ?? "",
  });
  await user.save();

  const name = user.get("name") ?? user.get("company") ?? "User";
  let reactivationUrl: string | undefined;
  if (user.get("deactivation")?.reason === "inactivity") {
    try {
      const { raw } = await issueReactivationToken(userId, role);
      const origin =
        process.env.APP_URL?.replace(/\/$/, "") ||
        process.env.CORS_ORIGINS?.split(",")[0]?.trim() ||
        "http://localhost:8080";
      reactivationUrl = `${origin}/account/reactivation/request?token=${encodeURIComponent(raw)}`;
    } catch (err) {
      console.error("[reactivation] failed to issue token after reject:", err);
    }
  }
  await sendReactivationRejectedEmail(
    accountLifecycleEmail(user.email, user.get("inactivityEmailOverride")),
    name,
    reason,
    reactivationUrl,
  );

  emitAdminUserLifecycleUpdated("reactivation", { userId, role });

  return res.status(200).json({ success: true, message: "Reactivation request rejected." });
};

export const AdminManualReactivate = async (req: Request, res: Response) => {
  const parsed = reactivationAction.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid payload" });

  const { userId, role, reason } = parsed.data;
  const M = userModelByRole(role);
  const user = await M.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (user.status !== "not_active") {
    return res.status(400).json({ success: false, message: "Account is not deactivated." });
  }

  await resetInactivityCycleOnReactivation(role, userId, req.user?.id);
  if (reason) {
    await M.updateOne({ _id: userId }, { $set: { reactivationRejectionReason: reason } });
  }

  const name = user.get("name") ?? user.get("company") ?? "User";
  await sendReactivationApprovedEmail(
    accountLifecycleEmail(user.email, user.get("inactivityEmailOverride")),
    name,
  );

  emitAdminUserLifecycleUpdated("reactivation", { userId, role });

  return res.status(200).json({ success: true, message: "Account manually reactivated." });
};

export const AdminListReactivationRequests = async (_req: Request, res: Response) => {
  try {
    const pending: any[] = [];
    for (const role of ["worker", "employer"] as const) {
      const docs = await userModelByRole(role)
        .find({ reactivationRequestStatus: "pending" })
        .select(
          "name company email status lastActiveAt deactivation reactivationRequestedAt reactivationRequestStatus role",
        )
        .lean();
      for (const d of docs) {
        pending.push({
          _id: String(d._id),
          role,
          name: d.name ?? d.company,
          email: d.email,
          lastActiveAt: d.lastActiveAt ?? null,
          deactivation: d.deactivation ?? null,
          reactivationRequestedAt: d.reactivationRequestedAt,
          reactivationRequestStatus: d.reactivationRequestStatus,
        });
      }
    }
    pending.sort(
      (a, b) =>
        new Date(a.reactivationRequestedAt).getTime() - new Date(b.reactivationRequestedAt).getTime(),
    );
    return res.status(200).json({ success: true, requests: pending });
  } catch (error) {
    mainError(error, res);
  }
};

export const AdminGetUserLifecycle = async (req: Request, res: Response) => {
  const role = req.params.role;
  const userId = req.params.userId;
  if (role !== "worker" && role !== "employer") {
    return res.status(400).json({ success: false, message: "Invalid role." });
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user id." });
  }
  try {
    const doc = await userModelByRole(role)
      .findById(userId)
      .select(
        "name company email status lastActiveAt updatedAt createdAt inactivityWarningStage lastInactivityNotificationAt deactivation reactivationRequestedAt reactivationRequestStatus",
      )
      .lean();
    if (!doc || doc.status === "deleted") {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    return res.status(200).json({
      success: true,
      user: mapUserLifecycleRow(doc, role),
      policy: { deactivationMonths: DEACTIVATION_MONTHS },
    });
  } catch (error) {
    mainError(error, res);
  }
};

export const AdminRunInactivityJob = async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MANUAL_INACTIVITY_JOB !== "true") {
    return res.status(403).json({ success: false, message: "Manual run disabled in production." });
  }
  const result = await runInactivityMonitor();
  return res.status(200).json({ success: true, result });
};
