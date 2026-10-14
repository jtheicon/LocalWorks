import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Briefcase, User, FileText, UserCircle, Star, Phone, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import WorkerProfile from "@/components/worker/WorkerProfile";
import EditProfileModal from "@/components/worker/EditProfileModal";
import JobListings from "@/components/worker/JobListings";
import MyApplications from "@/components/worker/MyApplications";
import WriteReviewModal from "@/components/WriteReviewModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.avif";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Contacts from "@/components/worker/Contacts";
import { Bell } from "lucide-react";
import WorkerNotifications from "@/components/worker/WorkerNotifications";
import axios from "axios";
import WorkerAssignment from "@/components/worker/WorkerAssignments";
import Reports from "@/components/worker/Reports";

axios.defaults.withCredentials = true

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("jobs");

  const handleLogout = async () => {
    await axios.post("http://localhost:8920/api/pro/logout", {}, { withCredentials: true })
    navigate("/");
  };

  const isWorkerLogged = async () => {
    const result = await axios.get("http://localhost:8920/api/pro/isWorkerLogged", { withCredentials: true })
    return result.data
  }

  const viewProfile = async () => {
    const result = await axios.get("http://localhost:8920/api/pro/worker/profile", { withCredentials: true })
    return result.data
  }

  const fetchNotifications = async () => {
    const result = await axios.get(
      "http://localhost:8920/api/pro/notifications"
    );

    return result.data.notifications;
  };

  const { data: notifications = [] } = useQuery({
    queryKey: ["workerNotifications"],
    queryFn: fetchNotifications,
  });

  const unreadCount = notifications.filter(
    (n: any) => !n.read
  ).length;

  const { isLoading, error } = useQuery({
    queryKey: ['isWorkerLogged'],
    queryFn: isWorkerLogged
  })

  const { data } = useQuery({
    queryKey: ['profile'],
    queryFn: viewProfile
  })

  const styleCenter = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "40px"
  }

  if (isLoading) return <div style={styleCenter}>Loading...</div>
  if (error) {
    navigate("/", { replace: true })
    toast.info("Please Login as Worker to use the Worker Dashboard.")
  }

  const handleViewProfile = () => {
    setActiveTab("profile");
  };

  const handleEditProfile = () => {
    setEditProfileOpen(true);
  };

  const handleMyApplications = () => {
    setActiveTab("applications");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              <div className="relative flex flex-col items-center gap-1 cursor-pointer">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={`http://localhost:8920/uploads/profile/${data?.WorkerProf?.photo}`}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <UserCircle className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>

                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}

                <span className="text-xs text-muted-foreground">
                  {data?.WorkerProf?.name}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={handleViewProfile} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleEditProfile} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleMyApplications} className="cursor-pointer">
                <Briefcase className="mr-2 h-4 w-4" />
                My Applications
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setReviewOpen(true)} className="cursor-pointer">
                <Star className="mr-2 h-4 w-4" />
                Write a Review
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-fit">
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Find Jobs</span>
            </TabsTrigger>

            <TabsTrigger value="applications" className="gap-2">
              <Briefcase className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">My Applications</span>
            </TabsTrigger>

            <TabsTrigger value="contacts" className="gap-2">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Contacts</span>
            </TabsTrigger>

            <TabsTrigger value="reports" className="gap-2">
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>

            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>

            <TabsTrigger value="workerAssignments" className="gap-2">
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Worker Assignments</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <JobListings />
          </TabsContent>

          <TabsContent value="applications">
            <MyApplications />
          </TabsContent>

          <TabsContent value="contacts">
            <Contacts />
          </TabsContent>

          <TabsContent value="reports">
            <Reports />
          </TabsContent>

          <TabsContent value="notifications">
            <WorkerNotifications />
          </TabsContent>

          <TabsContent value="profile">
            <WorkerProfile onEdit={() => setEditProfileOpen(true)} />
          </TabsContent>

          <TabsContent value="workerAssignments">
            <WorkerAssignment />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Profile Modal */}
      <EditProfileModal open={editProfileOpen} onOpenChange={setEditProfileOpen} />
      <WriteReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        userName="John Smith"
        userRole="Construction Worker"
      />
    </div>
  );
};

export default WorkerDashboard;
