import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, FileText, BarChart3, Bell, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo.avif";
import axios from "axios";

axios.defaults.withCredentials = true

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "jobs", label: "Posted Jobs", icon: Briefcase },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "notifications", label: "Notification", icon: Bell },
  { id: "profiles", label: "Profiles", icon: Users },
];

const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await axios.post("http://localhost:8920/api/pro/logout", {}, { withCredentials: true })
      .then(function (response) {
        if (response.data) {
          navigate("/admin")
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
  };

  return (
    <aside className="w-56 min-h-screen bg-sidebar-background border-r border-sidebar-border flex flex-col">
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
              className={`w-full justify-start gap-3 h-10 text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 h-10 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
