import { useState, useEffect } from "react";
import { MessageCircle, MoreHorizontal } from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

interface Notification {
  _id: string;
  type: "message";
  title: string;
  description: string;
  details?: string;
  createdAt: string;
  read: boolean;
}

const formatUTC = (utc: string) => {
  if (!utc) return "";

  return new Date(utc).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const WorkerNotifications = () => {
  const queryClient = useQueryClient();

  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);

  const fetchNotifications = async () => {
    const result = await axios.get(
      "http://localhost:8920/api/pro/notifications",
      {
        withCredentials: true,
      }
    );

    return result.data.notifications;
  };

  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery<Notification[]>({
    queryKey: ["workerNotifications"],
    queryFn: fetchNotifications,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (_id: string) => {
      return await axios.patch(
        `http://localhost:8920/api/pro/markAsRead/${_id}`,
        {
          withCredentials: true,
        }
      );
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workerNotifications"],
      });

      toast.success("Marked as read");
    },

    onError: () => {
      toast.error("Failed to mark as read");
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (_id: string) => {
      return await axios.delete(
        `http://localhost:8920/api/pro/deleteNotif/${_id}`,
        {
          withCredentials: true,
        }
      );
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workerNotifications"],
      });

      toast.success("Notification deleted");
    },

    onError: () => {
      toast.error("Failed to delete notification");
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await axios.patch(
        "http://localhost:8920/api/pro/markAllAsRead",
        {},
        {
          withCredentials: true,
        }
      );
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workerNotifications"],
      });

      toast.success("All notifications marked as read");
    },

    onError: () => {
      toast.error("Failed to mark all notifications as read");
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Failed to load notifications</div>;
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.read !== b.read) {
      return Number(a.read) - Number(b.read); // unread first
    }

    return (
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
    );
  });

  return (
    <main className="flex-1 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold">
          Message Notifications
        </h2>

        <p className="text-sm text-muted-foreground">
          New messages from employers
        </p>
      </div>

      <div className="flex items-center gap-2">
        {unreadCount > 0 && (
          <>
            <Badge variant="secondary">
              {unreadCount} unread notification
              {unreadCount > 1 ? "s" : ""}
            </Badge>

            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
            >
              Mark All as Read
            </Button>
          </>
        )}
</div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-3">
          {!sortedNotifications.length ? <div>You currently don't have any notifications yet.</div> : sortedNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                notification.read
                  ? "bg-muted/40"
                  : "bg-card"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>

              <div className="flex-1">
                <p
                  className={`text-sm ${
                    !notification.read
                      ? "font-bold"
                      : "font-medium"
                  }`}
                >
                  {notification.title}
                </p>

                <p className="text-xs text-muted-foreground">
                  {notification.description}
                </p>

                <p className="text-[11px] text-muted-foreground">
                  {formatUTC(notification.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!notification.read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      markAsReadMutation.mutate(
                        notification._id
                      )
                    }
                  >
                    Mark as Read
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setSelectedNotification(notification)
                  }
                >
                  View
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    {!notification.read && (
                      <DropdownMenuItem
                        onClick={() =>
                          markAsReadMutation.mutate(
                            notification._id
                          )
                        }
                      >
                        Mark as Read
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() =>
                        setSelectedNotification(
                          notification
                        )
                      }
                    >
                      View Details
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() =>
                        deleteNotificationMutation.mutate(
                          notification._id
                        )
                      }
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Dialog
        open={!!selectedNotification}
        onOpenChange={() =>
          setSelectedNotification(null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedNotification?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {selectedNotification?.details}
            </p>

            <p className="text-xs text-muted-foreground">
              {selectedNotification?.createdAt
                ? formatUTC(
                    selectedNotification.createdAt
                  )
                : ""}
            </p>

            {selectedNotification &&
              !selectedNotification.read && (
                <Button
                  onClick={() => {
                    markAsReadMutation.mutate(
                      selectedNotification._id
                    );

                    setSelectedNotification(null);
                  }}
                >
                  Mark as Read
                </Button>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default WorkerNotifications;