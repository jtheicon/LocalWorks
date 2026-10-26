import { Outlet, useNavigate } from "react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { socket } from "@/socket";
import {
  invalidateAdminLifecycleData,
  invalidateAdminPlatformData,
  ADMIN_API,
  adminQueryKeys,
} from "@/lib/adminConnect";

interface Notification {
  _id: string;
  title: string;
}

const fetchAdminSession = async () => {
  const res = await axios.get(`${ADMIN_API}/profile`, { withCredentials: true });
  return res.data as { AdminProfile: { _id: string } };
};

export default function AdminLayout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: session,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: adminQueryKeys.adminSession,
    queryFn: fetchAdminSession,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!isError) return;
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 401 || status === 403) {
      navigate("/admin", { replace: true });
    }
  }, [isError, error, navigate]);

  useEffect(() => {
    const adminId = session?.AdminProfile?._id;
    if (!adminId) return;

    socket.disconnect();
    socket.auth = { adminId };
    socket.connect();
  }, [session?.AdminProfile?._id]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Admin socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("Admin socket error:", err);
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
    };
  }, []);

  useEffect(() => {
    const onLifecycleUpdated = () => {
      invalidateAdminLifecycleData(queryClient);
    };

    const handleNewNotification = (notification: Notification) => {
      const row = {
        ...notification,
        _id: String(notification._id),
        read: Boolean(notification.read),
      };
      queryClient.setQueryData(
        adminQueryKeys.notifications,
        (old: Notification[] = []) => [
          row,
          ...old.filter((n) => String(n._id) !== row._id),
        ],
      );
      invalidateAdminPlatformData(queryClient);
      invalidateAdminLifecycleData(queryClient);
      toast.success(notification.title);
    };

    socket.on("admin:user-lifecycle:updated", onLifecycleUpdated);
    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("admin:user-lifecycle:updated", onLifecycleUpdated);
      socket.off("notification:new", handleNewNotification);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking admin session…
      </div>
    );
  }

  if (isError || !session) {
    return null;
  }

  return <Outlet />;
}
