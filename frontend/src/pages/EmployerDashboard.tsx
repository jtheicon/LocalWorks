import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Contacts from "@/components/employer/Contacts";
import { Button } from "@/components/ui/button";
import { Users, Search, Plus, MessageSquare, Briefcase } from "lucide-react";
import DashboardHeader from "@/components/employer/DashboardHeader";
import CompanyProfile from "@/components/employer/CompanyProfile";
import WorkerApplications from "@/components/employer/WorkerApplications";
import BrowseWorkers from "@/components/employer/BrowseWorkers";
import PostJobModal from "@/components/employer/PostJobModal";
import MyJobPosts from "@/components/employer/MyJobPosts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import axios from "axios";
import EmployerNotifications from "@/components/employer/EmployerNotifications";
import { Flag } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Company Profile Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <Button onClick={() => setPostJobOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Post a Job
            </Button>
          </div>
          <CompanyProfile />
        </div>

        {/* Tabs for Applications, Browse Workers, and Contacts */}
        <Tabs defaultValue="applications" className="w-full">
          <TabsList className="mb-6 h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="applications" className="gap-2">
              <Users className="w-4 h-4" />
              Applications
            </TabsTrigger>

            <TabsTrigger value="jobPosts" className="gap-2">
              <Briefcase className="w-4 h-4" />
              My Job Posts
            </TabsTrigger>

            <TabsTrigger value="browse" className="gap-2">
              <Search className="w-4 h-4" />
              Browse Workers
            </TabsTrigger>

            <TabsTrigger value="contacts" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Contacts
            </TabsTrigger>

            <TabsTrigger value="reports" className="gap-2">
              <Flag className="w-4 h-4" />
              Reports
            </TabsTrigger>

            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />

              <span className="hidden sm:inline">
                Notifications
              </span>

              {unreadCount > 0 && (
                <span className="ml-1 text-xs rounded-full bg-red-500 text-white px-2">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger value="workerAssignments" className="gap-2">
              <Flag className="w-4 h-4" />
              Worker Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <WorkerApplications />
          </TabsContent>

          <TabsContent value="jobPosts">
            <MyJobPosts />
          </TabsContent>

          <TabsContent value="browse">
            <BrowseWorkers />
          </TabsContent>

          <TabsContent value="contacts">
            <Contacts />
          </TabsContent>

          <TabsContent value="reports">
            <Reports />
          </TabsContent>

          <TabsContent value="notifications">
            <EmployerNotifications
              notifications={notifications}
              markAsReadMutation={markAsReadMutation}
              deleteMutation={deleteMutation}
              markAllAsReadMutation={markAllAsReadMutation}
            />
          </TabsContent>

          <TabsContent value="workerAssignments">
            <WorkerAssignments />
          </TabsContent>
        </Tabs>
      </main>

      {/* Post Job Modal */}
      <PostJobModal open={postJobOpen} onOpenChange={setPostJobOpen} />
    </div>
  );
};

export default EmployerDashboard;
