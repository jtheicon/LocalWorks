import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Bell, User, FileText, UserCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditProfileModal from "./EditProfileModal";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

axios.defaults.withCredentials = true

interface EmployerNotification {
  _id: string;
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
}

interface EmployerHeaderProps {
  notifications: EmployerNotification[];
  onViewNotifications?: () => void;
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

const EmployerHeader = ({ notifications, onViewNotifications }: EmployerHeaderProps) => {
  const navigate = useNavigate();
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const employer = async () => {
    const result = await axios.get("http://localhost:8920/api/pro/employer/information")
    return result.data
  }

  const { data } = useQuery({
    queryKey: ['employer'],
    queryFn: employer
  })

  const profile = data?.EmployerProf?.profile;
  const email = data?.EmployerProf?.email;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search" className="pl-9 h-9 bg-muted/50 border-none" />
      </div>

      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                {unreadCount}
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="px-4 py-3 border-b border-border">
              <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            </div>
            <ScrollArea className="h-72">
              <div className="divide-y divide-border">
                {notifications.map((n) => (
                  <button
                    key={n._id}
                    onClick={onViewNotifications}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                      <div className={!n.read ? '' : 'ml-4'}>
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">{formatUTC(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none flex items-center gap-2">
            <Avatar className="h-9 w-9">
              {profile && (
                <AvatarImage
                  src={`http://localhost:8920/uploads/profile/${profile}`}
                  alt="Employer"
                />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {email
                  ? email.split("@")[0].slice(0, 2).toUpperCase()
                  : <UserCircle className="h-5 w-5" />
                }
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline text-sm text-muted-foreground">{email}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/employer-profile")} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditProfileOpen(true)} className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4" />
              Edit Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditProfileModal open={editProfileOpen} onOpenChange={setEditProfileOpen} />
    </header>
  );
};

export default EmployerHeader;
