import { API_ORIGIN } from "@/lib/apiOrigin";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// Which dashboard the visitor is already signed in to, if any.
const fetchDashboardPath = async (): Promise<string | null> => {
  const checks = [
    { url: `${API_ORIGIN}/api/pro/isEmployerLogged`, path: "/employer-dashboard" },
    { url: `${API_ORIGIN}/api/pro/isWorkerLogged`, path: "/worker-dashboard" },
  ];
  for (const { url, path } of checks) {
    try {
      await axios.get(url, { withCredentials: true });
      return path;
    } catch {
      // not signed in with this role
    }
  }
  return null;
};

// gcTime 0 so a logout is picked up the next time a public page mounts.
export const useDashboardPath = () =>
  useQuery({
    queryKey: ["dashboardPath"],
    queryFn: fetchDashboardPath,
    retry: false,
    gcTime: 0,
  });
