import { Outlet } from "react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
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

export default function AdminLayout() {
  const queryClient = useQueryClient();

  // 1. establish socket identity (IMPORTANT)
  useEffect(() => {
    const initAdminSocket = async () => {
      try {
        const res = await axios.get(`${ADMIN_API}/profile`, { withCredentials: true });

        const adminId = res.data.AdminProfile._id;

        socket.disconnect();
        socket.auth = { adminId };
        socket.connect();

        console.log("Admin socket connected with:", adminId);
      } catch (err) {
        console.error("Failed to init admin socket");
      }
    };

    initAdminSocket();
  }, []);

  // 2. connection debugging (optional but useful)
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

  // 3. Realtime: keep dashboard account health, user management, and jobs in sync
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

  return <Outlet />;
}