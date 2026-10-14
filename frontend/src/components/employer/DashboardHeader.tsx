import { LogOut, User, FileText, UserCircle, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.avif";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditProfileModal from "./EditProfileModal";
import { useState } from "react"
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

axios.defaults.withCredentials = true

interface DashboardHeaderProps {
  onViewProfile?: () => void;
  onEditProfile?: () => void;
  onWriteReview?: () => void;
}

const DashboardHeader = () => {
  const navigate = useNavigate();
    
      const [editProfileOpen, setEditProfileOpen] = useState(false);

  const handleLogout = () => {
    navigate("/");
  };

  const EmployerProfilePage = () => {
    navigate("/employer-profile")
  }

  const Logout = async () => {
    await axios.post("http://localhost:8920/api/pro/logout", {}, { withCredentials: true })
      .then(function (response) {
        if (response.data) {
          navigate("/")
        }
      })
      .catch(function (error) {
        if (error.response) {
          alert(error.response.data.message)
        }
      })
  }

  const employer = async () => {
    const result = await axios.get("http://localhost:8920/api/pro/employer/information")
    return result.data
  }

  const fetchNotifications = async () => {
    const res = await axios.get(
      "http://localhost:8920/api/pro/notifications",
      { withCredentials: true }
    );
    return res.data.notifications;
  };

  const { data: notifications = [] } = useQuery({
    queryKey: ["employerNotifications"],
    queryFn: fetchNotifications,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['employer'],
    queryFn: employer
  })

  const profile = data?.EmployerProf?.profile;
  const email = data?.EmployerProf?.email;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center p-1 overflow-hidden">
            <img src={logo} alt="LocalWorks" className="h-full w-full object-cover rounded-full" />
          </div>
          <span className="text-xl font-bold text-foreground">LocalWorks</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <div className="relative flex flex-col items-center gap-1">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  {profile && (
                    <AvatarImage
                      src={`http://localhost:8920/uploads/profile/${profile}`}
                      alt="Employer"
                    />
                  )}

                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {email
                      ? email.split("@")[0].slice(0, 2).toUpperCase()
                      : <UserCircle className="h-6 w-6" />
                    }
                  </AvatarFallback>
                </Avatar>

                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>

              <span className="text-xs text-muted-foreground">
                {email}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={EmployerProfilePage} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditProfileOpen(true)} className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4" />
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => Logout()} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditProfileModal open={editProfileOpen} onOpenChange={setEditProfileOpen} />
    </header>
  );
};

export default DashboardHeader;
