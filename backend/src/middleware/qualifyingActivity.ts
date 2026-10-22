import { Request, Response, NextFunction } from "express";
import { recordQualifyingActivity } from "../services/activityTracking";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Records qualifying activity on successful mutating API calls (not reads / mark-read). */
export const trackQualifyingActivityOnSuccess = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as { id?: string; role?: string } | undefined;
  if (!user?.id || (user.role !== "worker" && user.role !== "employer")) return next();
  if (!MUTATING.has(req.method)) return next();

  const path = req.originalUrl || req.url;
  const skip =
    /\/notifications\b/i.test(path) ||
    /markAsRead|markAllAsRead|deleteNotif/i.test(path) ||
    /\/contacts\/.*\/read/i.test(path);

  if (skip) return next();

  res.on("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      recordQualifyingActivity(user.id, user.role, true);
    }
  });
  next();
};
