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
    const reason = (doc as any).deactivation?.reason;
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_DEACTIVATED",
      message:
        reason === "admin"
          ? "Your account was deactivated by an administrator."
          : "Your account is not active. Contact an administrator.",
    });
  }

  if (doc.status === "deleted") {
    res.clearCookie("token", clearAuthCookieOptions);
    const inactivity = (doc as any).deactivation?.reason === "inactivity";
    return res.status(403).json({
      success: false,
      code: "ACCOUNT_DELETED",
      message: inactivity
        ? "Your account was deleted due to inactivity. Create a new account to sign in again."
        : "Your account has been deleted.",
    });
  }

  if (doc.status === "pending") {
    res.clearCookie("token", clearAuthCookieOptions);
    return res.status(403).json({ success: false, message: "Your account cannot access this resource." });
  }

  if (!isOperationalAccountStatus(doc.status)) {
    res.clearCookie("token", clearAuthCookieOptions);
    return res.status(403).json({ success: false, message: "Your account cannot access this resource." });
  }

  next();
};
