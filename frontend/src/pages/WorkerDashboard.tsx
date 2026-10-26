import { lazy, Suspense, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Briefcase, User, FileText, UserCircle, Star, Phone, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EditProfileModal from "@/components/worker/EditProfileModal";
import WriteReviewModal from "@/components/WriteReviewModal";
import JobListingsSkeleton from "@/components/worker/JobListingsSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import logo from "@/assets/logo.avif";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import axios from "axios";
import { API_ORIGIN } from "@/lib/apiOrigin";
import { canWorkerApply } from "@/lib/workerJobApply";
import TabCountBadge from "@/components/worker/TabCountBadge";

const JobListings = lazy(() => import("@/components/worker/JobListings"));
const MyApplications = lazy(() => import("@/components/worker/MyApplications"));
const Contacts = lazy(() => import("@/components/worker/Contacts"));
const Reports = lazy(() => import("@/components/worker/Reports"));
const WorkerNotifications = lazy(() => import("@/components/worker/WorkerNotifications"));
const WorkerAssignment = lazy(() => import("@/components/worker/WorkerAssignments"));
const WorkerProfile = lazy(() => import("@/components/worker/WorkerProfile"));

axios.defaults.withCredentials = true;

const fetchWorkerJobs = async () => {
  const { data } = await axios.get(`${API_ORIGIN}/api/pro/viewJobs`, { withCredentials: true });
  return data;
};

const fetchWorkerApplications = async () => {
  const { data } = await axios.get(`${API_ORIGIN}/api/pro/viewApplications`, { withCredentials: true });
  return data;
};

const fetchWorkerContacts = async () => {
  const { data } = await axios.get(`${API_ORIGIN}/api/pro/contacts`, { withCredentials: true });
  return data;
};

const fetchWorkerReports = async () => {
  const { data } = await axios.get(`${API_ORIGIN}/api/pro/reports`, { withCredentials: true });
  return data;
};

const fetchWorkerAssignments = async () => {
  const { data } = await axios.get(`${API_ORIGIN}/api/pro/worker-assignments`, { withCredentials: true });
  return data;
};

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("jobs");
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await axios.post(`${API_ORIGIN}/api/pro/logout`, {}, { withCredentials: true });
      navigate("/");
    } finally {
      setSigningOut(false);
      setSignOutOpen(false);
    }
  };

  const isWorkerLogged = async () => {
    const result = await axios.get(`${API_ORIGIN}/api/pro/isWorkerLogged`, { withCredentials: true });
    return result.data;
  };

  const viewProfile = async () => {
    const result = await axios.get(`${API_ORIGIN}/api/pro/worker/profile`, { withCredentials: true });
    return result.data;
  };

  const fetchNotifications = async () => {
    const result = await axios.get(`${API_ORIGIN}/api/pro/notifications`, { withCredentials: true });
    return result.data.notifications;
  };

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: ["job"],
      queryFn: fetchWorkerJobs,
      staleTime: 60_000,
    });
  }, [queryClient]);

  const { data: jobsData } = useQuery({
    queryKey: ["job"],
    queryFn: fetchWorkerJobs,
    staleTime: 60_000,
  });

  const { data: applicationsPayload } = useQuery({
    queryKey: ["ViewApplications"],
    queryFn: fetchWorkerApplications,
    staleTime: 30_000,
  });

  const { data: contactsPayload } = useQuery({
    queryKey: ["contacts"],
    queryFn: fetchWorkerContacts,
    staleTime: 30_000,
  });

  const { data: reportsPayload } = useQuery({
    queryKey: ["workerReports"],
    queryFn: fetchWorkerReports,
    staleTime: 30_000,
  });

  const { data: assignmentsPayload } = useQuery({
    queryKey: ["workerAssignments"],
    queryFn: fetchWorkerAssignments,
    staleTime: 30_000,
  });

  const openJobsCount =
    (jobsData?.jobs ?? []).filter((job: Parameters<typeof canWorkerApply>[0]) => canWorkerApply(job)).length;
  const applicationCount = applicationsPayload?.Applications?.length ?? 0;
  const contactCount = contactsPayload?.contacts?.length ?? 0;
  const reportCount = reportsPayload?.reports?.length ?? 0;
  const assignmentCount = assignmentsPayload?.workerAssignments?.length ?? 0;

  const { data: notifications = [] } = useQuery({
    queryKey: ["workerNotifications"],
    queryFn: fetchNotifications,
    staleTime: 30_000,
  });

  const unreadCount = notifications.filter(
    (n: any) => !n.read
  ).length;

  const { isError: authError } = useQuery({
    queryKey: ["isWorkerLogged"],
    queryFn: isWorkerLogged,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: viewProfile,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!authError) return;
    navigate("/", { replace: true });
    toast.info("Please Login as Worker to use the Worker Dashboard.");
  }, [authError, navigate]);

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
        <div className="app-shell-width py-3 flex items-center justify-between">
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
                    src={`${API_ORIGIN}/uploads/profile/${profileData?.WorkerProf?.photo}`}
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
                  {profileData?.WorkerProf?.name}
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
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setSignOutOpen(true);
                }}
                className="cursor-pointer text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="app-dashboard-main pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="app-dashboard-stack w-full max-w-[1600px] mx-auto">
          <TabsList className="w-full h-auto flex flex-wrap justify-start gap-1.5 p-1">
            <TabsTrigger value="jobs" className="group gap-2">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Find Jobs</span>
              <TabCountBadge count={openJobsCount} />
            </TabsTrigger>

            <TabsTrigger value="applications" className="group gap-2">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">My Applications</span>
              <TabCountBadge count={applicationCount} />
            </TabsTrigger>

            <TabsTrigger value="contacts" className="group gap-2">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Contacts</span>
              <TabCountBadge count={contactCount} />
            </TabsTrigger>

            <TabsTrigger value="reports" className="group gap-2">
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
              <TabCountBadge count={reportCount} />
            </TabsTrigger>

            <TabsTrigger value="notifications" className="group gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
              <TabCountBadge count={unreadCount} />
            </TabsTrigger>

            <TabsTrigger value="workerAssignments" className="group gap-2">
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Worker Assignments</span>
              <TabCountBadge count={assignmentCount} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            {activeTab === "jobs" && (
              <Suspense fallback={<JobListingsSkeleton />}>
                <JobListings />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="applications">
            {activeTab === "applications" && (
              <Suspense fallback={<JobListingsSkeleton />}>
                <MyApplications />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="contacts">
            {activeTab === "contacts" && (
              <Suspense fallback={<JobListingsSkeleton />}>
                <Contacts />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="reports">
            {activeTab === "reports" && (
              <Suspense fallback={<JobListingsSkeleton />}>
                <Reports />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="notifications">
            {activeTab === "notifications" && (
              <Suspense fallback={<JobListingsSkeleton />}>
                <WorkerNotifications />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="profile">
            {activeTab === "profile" && (
              <Suspense fallback={<JobListingsSkeleton />}>
                <WorkerProfile onEdit={() => setEditProfileOpen(true)} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="workerAssignments">
            {activeTab === "workerAssignments" && (
              <Suspense fallback={<JobListingsSkeleton />}>
                <WorkerAssignment />
              </Suspense>
            )}
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

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will leave your worker dashboard and need to sign in again to continue.
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
    </div>
  );
};

export default WorkerDashboard;
