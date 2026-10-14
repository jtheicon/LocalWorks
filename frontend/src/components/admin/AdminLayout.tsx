import { Outlet } from "react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { socket } from "@/socket";

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
        const res = await axios.get(
          "http://localhost:8920/api/admin/profile",
          { withCredentials: true }
        );

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

  // 3. notification listener
  useEffect(() => {
    const handleNewNotification = (notification: Notification) => {
      queryClient.setQueryData(
        ["adminNotifications"],
        (old: Notification[] = []) => [
          notification,
          ...old.filter(n => n._id !== notification._id),
        ]
      );

      toast.success(notification.title);
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [queryClient]);

  return <Outlet />;
}