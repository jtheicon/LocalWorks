import { useEffect, useState, useMemo } from "react";
import { Search, Filter, Building2, UserCircle, Info, FileText, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { socket } from "@/socket";

interface Notification {
  _id: string;
  type: "job_posted" | "verification" | "application" | "report";
  title: string;
  description: string;
  time: string;
  read: boolean;
  category: "job" | "account" | "report";
  details?: string;
}

// Controller: { category }
// createJob: { job }, WorkerRegister: { account }, newApplication: { job }


const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "job_posted":
      return <Building2 className="w-5 h-5 text-primary-foreground" />;
    case "verification":
      return <UserCircle className="w-5 h-5 text-primary-foreground" />;
    case "application":
      return <Info className="w-5 h-5 text-primary-foreground" />;
    case "report":
      return <FileText className="w-5 h-5 text-primary-foreground" />;
  }
};

const getIconBg = (type: Notification["type"]) => {
  switch (type) {
    case "job_posted":
      return "bg-primary";
    case "verification":
      return "bg-accent-foreground/70";
    case "application":
      return "bg-destructive/80";
    case "report":
      return "bg-muted-foreground";
  }
};

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

const AdminNotifications = () => {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const fetchAdminNotifications = async () => {
    const result = await axios.get(
      "http://localhost:8920/api/admin/admin-notifications"
    )

    return result.data.notifications
  }

  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery<Notification[]>({
    queryKey: ["adminNotifications"],
    queryFn: fetchAdminNotifications,
  })

  const filtered = [...notifications]
    .filter((n: Notification) => {
      const matchesSearch =
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.description.toLowerCase().includes(search.toLowerCase());

      if (activeFilter === "unread") return matchesSearch && !n.read;
      if (activeFilter === "job") return matchesSearch && n.category === "job";
      if (activeFilter === "account") return matchesSearch && n.category === "account";
      if (activeFilter === "report") return matchesSearch && n.category === "report";

      return matchesSearch;
    })
    .sort((a, b) => {
      if (a.read === b.read) return 0;
      return a.read ? 1 : -1;
    });

  
  
  const markAsReadMutation = useMutation({
    mutationFn: async (_id: string) => {
      return await axios.patch(
        `http://localhost:8920/api/admin/admin-notifications/${_id}`
      )
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adminNotifications"]
      })

      toast.success("Marked as read")
    },

    onError: () => {
      toast.error("Failed to mark as read")
    }
  })


  const markAllAsReadMutation = useMutation({
    mutationFn: async (scope: string) => {
      return await axios.patch(
        "http://localhost:8920/api/admin/admin-notifications/mark-read",
        { scope }
      );
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adminNotifications"],
      });

      toast.success("Notifications marked as read");
    },

    onError: () => {
      toast.error("Failed to mark notifications as read");
    },
  });


  const deleteNotificationMutation = useMutation({
    mutationFn: async (_id: string) => {
      return await axios.delete(
        `http://localhost:8920/api/admin/admin-notifications/delete/${_id}`
      )
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adminNotifications"]
      })

      setSelectedNotification(null)

      toast.success("Notification deleted")
    },

    onError: () => {
      toast.error("Failed to delete notification")
    }
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Failed to load notifications</div>
  }

  const markAsRead = (_id: string) => {
    markAsReadMutation.mutate(_id)
  }

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate(activeFilter);
  };


  const deleteNotification = (_id: string) => {
    deleteNotificationMutation.mutate(_id)
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <main className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Welcome Back!, Admin</h2>
        <p className="text-sm text-muted-foreground">
          Here's what happening with your reports today
        </p>
      </div>

      {/* Search + Filters + Actions */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-muted/50"
            />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Filter className="w-4 h-4" />
          </Button>

          <Tabs value={activeFilter} onValueChange={setActiveFilter} className="ml-2">
            <TabsList className="bg-transparent gap-1 p-0 h-auto">
              {[
                { value: "all", label: "All" },
                { value: "unread", label: "Unread" },
                { value: "job", label: "Job Updates" },
                { value: "account", label: "Account Updates" },
                { value: "report", label: "Reports" }
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5 text-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-primary hover:text-primary"
              onClick={markAllAsRead}
            >
              Mark as Read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-primary hover:text-primary"
              onClick={() => {
                if (filtered.length > 0) setSelectedNotification(filtered[0]);
              }}
            >
              View Details
            </Button>
          </div>
        </div>

        {unreadCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Notification List */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No notifications found</p>
            </div>
          ) : (
            filtered.map((n: Notification) => (
              <div
                key={n._id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  n.read
                    ? "bg-muted/40 border-border"
                    : "bg-card border-border"
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${getIconBg(
                    n.type
                  )}`}
                >
                  {getNotificationIcon(n.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold text-foreground ${!n.read ? "font-bold" : ""}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {n.description}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    {formatUTC(n.time)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary hover:text-primary"
                      onClick={() => markAsRead(n._id)}
                    >
                      Mark as Read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary hover:text-primary"
                    onClick={() => setSelectedNotification(n)}
                  >
                    View Details
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!n.read && (
                        <DropdownMenuItem onClick={() => markAsRead(n._id)}>
                          Mark as Read
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setSelectedNotification(n)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteNotification(n._id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Notification Settings floating button */}
      <div className="fixed bottom-6 right-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="shadow-lg">
              Notification Settings
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => toast.info("Manage Preferences coming soon")}>
              Manage Preferences
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{selectedNotification?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs capitalize">
                {selectedNotification?.category}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {selectedNotification?.time
                  ? formatUTC(selectedNotification.time)
                  : ""}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {selectedNotification?.details}
            </p>
            {selectedNotification && !selectedNotification.read && (
              <Button
                size="sm"
                onClick={() => {
                  markAsRead(selectedNotification._id);
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

export default AdminNotifications;
