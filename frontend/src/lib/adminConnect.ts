import type { QueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_ORIGIN } from "./apiOrigin";

axios.defaults.withCredentials = true;

/** Shared admin API root (REST + socket). */
export const ADMIN_ORIGIN = API_ORIGIN;
export const ADMIN_API = `${ADMIN_ORIGIN}/api/admin`;

export const adminAssetUrl = (path: string) =>
  path.startsWith("http") ? path : `${ADMIN_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

/** React Query keys used across admin tabs. */
export const adminQueryKeys = {
  adminSession: ["adminSession"] as const,
  dashboard: ["adminDashboard"] as const,
  analytics: ["adminAnalytics"] as const,
  cleanupPreview: ["cleanupPreview"] as const,
  lifecycle: ["AdminUsersLifecycle"] as const,
  lifecycleUser: ["AdminUserLifecycle"] as const,
  reactivation: ["adminReactivationRequests"] as const,
  profiles: ["AdminProfilesInfo"] as const,
  notifications: ["adminNotifications"] as const,
  reports: ["Reports"] as const,
  applicationHealth: ["ApplicationHealth"] as const,
};

export const ADMIN_REPORTS_STALE_MS = 2 * 60 * 1000;

export async function fetchAdminReports() {
  const res = await axios.get(`${ADMIN_API}/reports`, { withCredentials: true });
  return res.data;
}

/** Inactivity monitoring, account health, user/reactivation tabs. */
export const invalidateAdminLifecycleData = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.lifecycle });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.lifecycleUser });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.reactivation });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.cleanupPreview });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.analytics });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.profiles });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard });
};

/** Jobs, reports, notifications — refresh overview when platform activity changes. */
export const invalidateAdminPlatformData = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.analytics });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.reports });
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.applicationHealth });
};

export const invalidateAllAdminConnectedData = (queryClient: QueryClient) => {
  invalidateAdminLifecycleData(queryClient);
  invalidateAdminPlatformData(queryClient);
  void queryClient.invalidateQueries({ queryKey: adminQueryKeys.notifications });
};
