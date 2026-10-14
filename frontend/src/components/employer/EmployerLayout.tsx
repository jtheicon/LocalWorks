import { Outlet } from "react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { socket } from "@/socket";

interface EmployerNotification {
  _id: string;
  type: string;
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
}

export default function EmployerLayout() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log("EmployerLayout mounted");

    const connectSocket = async () => {
      try {
        console.log("Fetching employer profile...");

        const res = await axios.get(
          "http://localhost:8920/api/pro/employer/information",
          { withCredentials: true }
        );

        console.log("Profile response:", res.data);

        const employerId = res.data.EmployerProf._id;

        console.log("Employer ID:", employerId);

        socket.auth = { employerId };

        console.log("Connecting socket...");

        socket.connect();
      } catch (err) {
        console.error("Failed to load employer profile", err);
      }
    };

    connectSocket();
  }, []);

  useEffect(() => {
    const handler = (notification: EmployerNotification) => {
      toast(notification.title, {
        description: notification.description,
      });

      queryClient.setQueryData(
        ["employerNotifications"],
        (old: EmployerNotification[] | undefined) => {
          if (!old) return [notification];

          return [notification, ...old];
        }
      );
    };

    socket.off("notification:employer:new");
    socket.on("notification:employer:new", handler);

    return () => {
      socket.off("notification:employer:new", handler);
    };
  }, [queryClient]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("[EMPLOYER] connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("[EMPLOYER] connect error:", err);
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
    };
  }, []);

  return <Outlet />;
}