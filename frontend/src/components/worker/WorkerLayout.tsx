import { Outlet } from "react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { socket } from "@/socket";
import { API_ORIGIN } from "@/lib/apiOrigin";

interface UserNotification {
  _id: string;
  type: "job_posted" | "application" | "verification" | "contact" | "report";
  title: string;
  description: string;
  read: boolean;
  category: "job" | "contact" | "account";
  audience: "all" | "workers" | "employers" | "specific";
  targetUsers?: string[];
  details?: string;
  createdAt: string;
}

export default function WorkerLayout() {
  const queryClient = useQueryClient();

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await axios.get(`${API_ORIGIN}/api/pro/worker/profile`, {
        withCredentials: true,
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket error:", err);
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
    };
  }, []);

  useEffect(() => {
    const id = profileData?.WorkerProf?._id;
    if (!id) return;

    socket.auth = { workerId: id };

    if (socket.connected) {
      socket.disconnect();
    }

    socket.connect();
  }, [profileData?.WorkerProf?._id]);

  useEffect(() => {
    const handleNotification = (notification: UserNotification) => {
      toast(notification.title, {
        description: notification.description,
      });

      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["workerNotifications"] });
    };

    socket.on("notification:worker:new", handleNotification);

    return () => {
      socket.off("notification:worker:new", handleNotification);
    };
  }, [queryClient]);

  return <Outlet />;
}