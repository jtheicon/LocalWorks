import { Request, Response, NextFunction } from "express";
import { clearAuthCookieOptions } from "../config/http";
import { userModelByRole } from "../services/userModelByRole";
import { isOperationalAccountStatus } from "../services/inactivityPolicy";

/** Blocks deactivated worker/employer sessions; admins unaffected. */
export const enforceActiveAccount = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as { id?: string; role?: string; status?: string } | undefined;
  if (!user?.id || !user.role) return next();
  if (user.role === "admin") return next();

  if (user.role !== "worker" && user.role !== "employer") return next();

  const M = userModelByRole(user.role);
  const doc = await M.findById(user.id).select("status deactivation").lean();
  if (!doc) {
    res.clearCookie("token", clearAuthCookieOptions);
    return res.status(401).json({ success: false, message: "Session invalid. Please sign in again." });
  }

  if (doc.status === "not_active") {
    res.clearCookie("token", clearAuthCookieOptions);
    const inactivity = (doc as any).deactivation?.reason === "inactivity";
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_DEACTIVATED",
      message: inactivity
        ? "Your account was deactivated due to inactivity. Use the reactivation link in your email or contact support."
        : "Your account is not active. Contact an administrator.",
    });
  }

  if (doc.status === "deleted" || doc.status === "pending") {
    res.clearCookie("token", clearAuthCookieOptions);
    return res.status(403).json({ success: false, message: "Your account cannot access this resource." });
  }

  if (!isOperationalAccountStatus(doc.status)) {
    res.clearCookie("token", clearAuthCookieOptions);
    return res.status(403).json({ success: false, message: "Your account cannot access this resource." });
  }

  next();
};
