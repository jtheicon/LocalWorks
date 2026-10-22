import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Mail, MailOpen, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useNavigate } from "react-router-dom";

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

const AdminHeader = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    setRead,
    setAllRead,
    remove,
    isUpdating,
  } = useAdminNotifications();

  return (
    <header className="z-40 flex h-16 shrink-0 items-center justify-end border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-primary p-0 text-[10px] text-primary-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0">
            <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
                <p className="text-xs text-muted-foreground">
                  {isLoading ? "Loading…" : `${unreadCount} unread`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={isUpdating || unreadCount === 0}
                  onClick={() => setAllRead("unread", true)}
                >
                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              </div>
            </div>

            {isError && (
              <p className="px-4 py-3 text-xs text-destructive">Could not load notifications.</p>
            )}

            <ScrollArea className="h-80">
              <div className="divide-y divide-border">
                {!isLoading && notifications.length === 0 && (
                  <p className="px-4 py-8 text-center text-xs text-muted-foreground">No notifications yet.</p>
                )}
                {notifications.map((n) => (
                  <div
                    key={n._id}
                    className={`px-4 py-3 ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read ? (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      ) : (
                        <div className="mt-1.5 h-2 w-2 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm text-foreground ${!n.read ? "font-semibold" : "font-medium"}`}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.description}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground/70">{formatUTC(n.time)}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px]"
                            disabled={isUpdating}
                            onClick={() => setRead(n._id, !n.read)}
                          >
                            {n.read ? (
                              <>
                                <Mail className="mr-1 h-3 w-3" />
                                Mark unread
                              </>
                            ) : (
                              <>
                                <MailOpen className="mr-1 h-3 w-3" />
                                Mark read
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-destructive hover:text-destructive"
                            disabled={isUpdating}
                            onClick={() => remove(n._id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t border-border px-4 py-2">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => navigate("/admin-dashboard", { state: { tab: "notifications" } })}
              >
                Open all notifications
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
};

export default AdminHeader;
