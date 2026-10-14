import { Outlet } from "react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { socket } from "@/socket";

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
    let active = true;

    const init = async () => {
      try {
        const res = await axios.get(
          "http://localhost:8920/api/pro/worker/profile",
          { withCredentials: true }
        );

        const id = res.data.WorkerProf._id;

        socket.auth = { workerId: id };

        if (socket.connected) {
          socket.disconnect();
        }

        socket.connect();

        console.log("Connecting with workerId:", id);
      } catch (err) {
        console.error("Failed to fetch worker profile");
      }
    };

    init();

    return () => {
      active = false;
      socket.off("notification:worker:new");
    };
  }, []);

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