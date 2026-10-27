import { API_ORIGIN } from "@/lib/apiOrigin";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Briefcase, Search, MessageSquare, Flag, Bell, ClipboardList, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import logo from "@/assets/logo.avif";
import axios from "axios";

axios.defaults.withCredentials = true

interface EmployerSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadCount?: number;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "applications", label: "Applications", icon: Users },
  { id: "jobPosts", label: "My Job Posts", icon: Briefcase },
  { id: "browse", label: "Browse Workers", icon: Search },
  { id: "contacts", label: "Contacts", icon: MessageSquare },
  { id: "workerAssignments", label: "Worker Assignments", icon: ClipboardList },
  { id: "reports", label: "Reports", icon: Flag },
  { id: "notifications", label: "Notification", icon: Bell },
];

const EmployerSidebar = ({ activeTab, onTabChange, unreadCount = 0 }: EmployerSidebarProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    await axios.post(`${API_ORIGIN}/api/pro/logout`, {}, { withCredentials: true })
      .then(function (response) {
        if (response.data) {
          // Replace the history entry and drop the cached session so Back can't reopen the dashboard.
          navigate("/", { replace: true })
          queryClient.clear()
          toast.success(response.data.message, {
            description: "Sign In Again to use this Application"
          })
        }
      })
      .catch(function (error) {
        if (error.response) {
          toast.info(error.response.data.message)
        }
      })
      .finally(function () {
        setSigningOut(false);
        setSignOutOpen(false);
      })
  };

  return (
    <aside className="w-56 h-screen sticky top-0 shrink-0 overflow-y-auto bg-sidebar-background border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg ring-4 ring-primary/20">
          <img src={logo} alt="LocalWorks" className="w-12 h-12 rounded-full object-cover" />
        </div>
        <span className="text-sm font-bold text-primary">LocalWorks</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative w-full justify-start gap-3 h-10 text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-md before:absolute before:-left-3 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.id === "notifications" && unreadCount > 0 && (
                <span className="ml-auto text-xs rounded-full bg-red-500 text-white px-2">
                  {unreadCount}
                </span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={() => setSignOutOpen(true)}
          className="w-full justify-start gap-3 h-10 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will leave your employer dashboard and need to sign in again to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={signingOut}
              onClick={(e) => {
                e.preventDefault();
                void handleLogout();
              }}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
};

export default EmployerSidebar;
