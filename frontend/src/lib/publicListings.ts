import axios from "axios";
import { API_ORIGIN } from "@/lib/apiOrigin";

export const publicWorkersQueryKey = ["public-workers"] as const;
export const publicJobsQueryKey = ["public-jobs"] as const;

export const PUBLIC_LIST_STALE_MS = 2 * 60 * 1000;

export async function fetchPublicWorkers() {
  const { data } = await axios.get(`${API_ORIGIN}/api/auth/workers`);
  return data;
}

export async function fetchPublicJobs() {
  const { data } = await axios.get(`${API_ORIGIN}/api/auth/jobs`);
  return data;
}
