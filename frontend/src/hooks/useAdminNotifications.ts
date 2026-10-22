import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_API, adminQueryKeys } from "@/lib/adminConnect";

axios.defaults.withCredentials = true;

export type AdminNotification = {
  _id: string;
  type: "job_posted" | "verification" | "application" | "report";
  title: string;
  description: string;
  time: string;
  read: boolean;
  category: "job" | "account" | "report";
  details?: string;
};

const normId = (id: string | { toString(): string }) => String(id);

const patchReadState = (
  list: AdminNotification[] | undefined,
  id: string,
  read: boolean,
): AdminNotification[] =>
  list?.map((n) => (normId(n._id) === normId(id) ? { ...n, read } : n)) ?? [];

const mergeNotification = (
  list: AdminNotification[] | undefined,
  updated: AdminNotification,
): AdminNotification[] => {
  if (!list) return [updated];
  const id = normId(updated._id);
  const idx = list.findIndex((n) => normId(n._id) === id);
  if (idx === -1) return [updated, ...list];
  const next = [...list];
  next[idx] = { ...next[idx], ...updated, read: Boolean(updated.read) };
  return next;
};

export const useAdminNotifications = () => {
  const queryClient = useQueryClient();

  const query = useQuery<AdminNotification[]>({
    queryKey: adminQueryKeys.notifications,
    queryFn: async () => {
      const res = await axios.get(`${ADMIN_API}/admin-notifications`, { withCredentials: true });
      const rows = res.data.notifications as AdminNotification[];
      return rows.map((n) => ({ ...n, _id: normId(n._id), read: Boolean(n.read) }));
    },
  });

  const setReadMutation = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      const res = await axios.patch(
        `${ADMIN_API}/admin-notifications/${normId(id)}`,
        { read },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        },
      );
      const n = res.data.notification as AdminNotification;
      return { ...n, _id: normId(n._id), read: Boolean(n.read) };
    },
    onMutate: async ({ id, read }) => {
      await queryClient.cancelQueries({ queryKey: adminQueryKeys.notifications });
      const previous = queryClient.getQueryData<AdminNotification[]>(adminQueryKeys.notifications);
      queryClient.setQueryData<AdminNotification[]>(adminQueryKeys.notifications, (old) =>
        patchReadState(old, id, read),
      );
      return { previous };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<AdminNotification[]>(adminQueryKeys.notifications, (old) =>
        mergeNotification(old, updated),
      );
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminQueryKeys.notifications, context.previous);
      }
    },
  });

  const setBulkReadMutation = useMutation({
    mutationFn: async ({ scope, read }: { scope: string; read: boolean }) => {
      const res = await axios.patch(
        `${ADMIN_API}/admin-notifications/mark-read`,
        { scope, read },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        },
      );
      return res.data as { modified?: number };
    },
    onMutate: async ({ scope, read }) => {
      await queryClient.cancelQueries({ queryKey: adminQueryKeys.notifications });
      const previous = queryClient.getQueryData<AdminNotification[]>(adminQueryKeys.notifications);
      queryClient.setQueryData<AdminNotification[]>(adminQueryKeys.notifications, (old) => {
        if (!old) return old;
        return old.map((n) => {
          if (scope === "unread" && n.read) return n;
          if (scope === "job" && n.category !== "job") return n;
          if (scope === "account" && n.category !== "account") return n;
          if (scope === "report" && n.category !== "report") return n;
          return { ...n, read };
        });
      });
      return { previous };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.notifications });
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminQueryKeys.notifications, context.previous);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${ADMIN_API}/admin-notifications/delete/${normId(id)}`, {
        withCredentials: true,
      });
      return normId(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: adminQueryKeys.notifications });
      const previous = queryClient.getQueryData<AdminNotification[]>(adminQueryKeys.notifications);
      queryClient.setQueryData<AdminNotification[]>(
        adminQueryKeys.notifications,
        (old) => old?.filter((n) => normId(n._id) !== normId(id)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminQueryKeys.notifications, context.previous);
      }
    },
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    setRead: (id: string, read: boolean) => setReadMutation.mutate({ id, read }),
    setAllRead: (scope = "all", read = true) => setBulkReadMutation.mutate({ scope, read }),
    remove: (id: string) => deleteMutation.mutate(id),
    isUpdating: setReadMutation.isPending || setBulkReadMutation.isPending,
  };
};
