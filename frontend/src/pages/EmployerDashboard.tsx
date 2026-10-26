import { useState } from "react";
import Contacts from "@/components/employer/Contacts";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import EmployerSidebar from "@/components/employer/EmployerSidebar";
import EmployerHeader from "@/components/employer/EmployerHeader";
import EmployerOverview from "@/components/employer/EmployerOverview";
import WorkerApplications from "@/components/employer/WorkerApplications";
import BrowseWorkers from "@/components/employer/BrowseWorkers";
import PostJobModal from "@/components/employer/PostJobModal";
import MyJobPosts from "@/components/employer/MyJobPosts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import EmployerNotifications from "@/components/employer/EmployerNotifications";
import Reports from "@/components/employer/Reports";
import WorkerAssignments from "@/components/employer/WorkerAssignments";

axios.defaults.withCredentials = true

const EmployerDashboard = () => {
  const queryClient = useQueryClient();

  const fetchNotifications = async () => {
    const result = await axios.get(
      "http://localhost:8920/api/pro/notifications",
      {
        withCredentials: true,
      }
    );

    return result.data.notifications;
  };

  const { data: notifications = [] } = useQuery({
    queryKey: ["employerNotifications"],
    queryFn: fetchNotifications,
  });

  const unreadCount = notifications.filter(
    (n: any) => !n.read
  ).length;


  const markAsReadMutation = useMutation({
    mutationFn: async (_id: string) => {
      return axios.patch(
        `http://localhost:8920/api/pro/markAsRead/${_id}`,
        {},
        {
          withCredentials: true,
        }
      );
    },

    onMutate: async (_id) => {
      await queryClient.cancelQueries({
        queryKey: ["employerNotifications"],
      });

      const previous = queryClient.getQueryData([
        "employerNotifications",
      ]);

      queryClient.setQueryData(
        ["employerNotifications"],
        (old: any[]) => {
          if (!old) return [];

          return old.map((n) =>
            n._id === _id
              ? { ...n, read: true }
              : n
          );
        }
      );

      return { previous };
    },


    onError: (_err, _id, context) => {
      queryClient.setQueryData(
        ["employerNotifications"],
        context?.previous
      );

      toast.error("Failed to mark as read");
    },


    onSuccess: () => {
      toast.success("Marked as read");
    },


    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["employerNotifications"],
      });
    },
  });


  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return axios.patch(
        "http://localhost:8920/api/pro/markAllAsRead",
        {},
        { withCredentials: true }
      );
    },

    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["employerNotifications"],
      });

      queryClient.setQueryData(
        ["employerNotifications"],
        (old:any[]) =>
          old?.map(n => ({
            ...n,
            read:true
          }))
      );
    },

    onSuccess: () => {
      toast.success("All notifications marked as read");
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey:["employerNotifications"]
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async(id:string)=>{
      return axios.delete(
        `http://localhost:8920/api/pro/deleteNotif/${id}`,
        {
          withCredentials:true
        }
      )
    },

    onSuccess:()=>{
      queryClient.invalidateQueries({
        queryKey:["employerNotifications"]
      });

      toast.success("Deleted");
    }
  });

  const navigate = useNavigate()
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const isEmployerLogged = async () => {
    const result = await axios.get("http://localhost:8920/api/pro/isEmployerLogged", { withCredentials: true })
    return result.data
  }

  const { isLoading, error } = useQuery({
    queryKey: ['isEmployerLogged'],
    queryFn: isEmployerLogged
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
    toast.info("Please Login as Employer to use the Employer Dashboard.")
  }

  const sectionTitles: Record<string, { title: string; description: string }> = {
    applications: { title: "Applications", description: "Review and manage applications from workers." },
    jobPosts: { title: "My Job Posts", description: "View and manage the jobs you have posted." },
    browse: { title: "Browse Workers", description: "Find workers that match your needs." },
    contacts: { title: "Contacts", description: "Conversations with workers you have connected with." },
    workerAssignments: { title: "Worker Assignments", description: "Track tasks assigned to your workers." },
    reports: { title: "Reports", description: "Reports you have submitted about workers." },
    notifications: { title: "Notifications", description: "Updates about your jobs and applications." },
  };

  const renderSection = () => {
    switch (activeTab) {
      case "applications":
        return <WorkerApplications />;
      case "jobPosts":
        return <MyJobPosts />;
      case "browse":
        return <BrowseWorkers />;
      case "contacts":
        return <Contacts />;
      case "workerAssignments":
        return <WorkerAssignments />;
      case "reports":
        return <Reports />;
      case "notifications":
        return (
          <EmployerNotifications
            notifications={notifications}
            markAsReadMutation={markAsReadMutation}
            deleteMutation={deleteMutation}
            markAllAsReadMutation={markAllAsReadMutation}
          />
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
    if (activeTab === "dashboard") {
      return (
        <EmployerOverview
          notifications={notifications}
          onNavigate={setActiveTab}
          onPostJob={() => setPostJobOpen(true)}
        />
      );
    }

    const section = sectionTitles[activeTab];

    return (
      <main className="app-dashboard-main overflow-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="app-page-title">{section?.title}</h2>
            <p className="app-page-description">{section?.description}</p>
          </div>
          {activeTab === "jobPosts" && (
            <Button onClick={() => setPostJobOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Post a Job
            </Button>
          )}
        </div>

        {renderSection()}
      </main>
    );
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <EmployerSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadCount={unreadCount}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <EmployerHeader
          notifications={notifications}
          onViewNotifications={() => setActiveTab("notifications")}
        />

        <div className="flex-1 flex">
          {renderContent()}
        </div>
      </div>

      {/* Post Job Modal */}
      <PostJobModal open={postJobOpen} onOpenChange={setPostJobOpen} />
    </div>
  );
};

export default EmployerDashboard;
