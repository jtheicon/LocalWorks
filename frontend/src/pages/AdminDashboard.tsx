import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useJobsStore } from "@/lib/jobsStore";
import { useReviewsStore } from "@/lib/reviewsStore";
import { exportToCSV } from "@/lib/csvExport";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import StatsCards from "@/components/admin/StatsCards";
import AdminCharts from "@/components/admin/AdminCharts";
import AdminReports from "@/components/admin/AdminReports";
import PostedJobsTable from "@/components/admin/PostedJobsTable";
import AllPostedJobs from "@/components/admin/AllPostedJobs";
import CategoryDetails from "@/components/admin/CategoryDetails";
import AdminProfiles from "@/components/admin/AdminProfiles";
import AdminNotifications from "@/components/admin/AdminNotifications";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";

axios.defaults.withCredentials = true

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const jobs = useJobsStore((s) => s.jobs);
  const removeJob = useJobsStore((s) => s.removeJob);
  const updateJobStatus = useJobsStore((s) => s.updateJobStatus);
  const reviews = useReviewsStore((s) => s.reviews);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    queryClient.invalidateQueries({
      queryKey: ['adminDashboard'],
      refetchType: 'active',
    });
  };

  const Dashboard = async () => {
    const result = await axios.get("http://localhost:8920/api/admin/dashboard", { withCredentials: true })
    return result.data
  }
  
  const styleCenter = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "40px"
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: Dashboard,
  })

  if (isLoading) return <div style={styleCenter}>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  const { JOBS, WORKERS, VERIFIED_WORKERS, REPORT_WORKERS } = data 


  const totalJobs = JOBS.length;
  const acceptedJobs = JOBS.filter((j) => j.status === "ACCEPTED").length;
  const pendingJobs = JOBS.filter((j) => j.status === "PENDING").length;
  const rejectedJobs = JOBS.filter((j) => j.status === "DECLINED").length;

  const handleExportJobs = () => {
    exportToCSV(
      jobs.map(({ _id, title, company, location, salary, type, posted, status }) => ({
        _id, title, company, location, salary, type, posted, status: status || "pending",
      })),
      "jobs"
    );
    toast.success("Jobs exported successfully!");
  };

  const handleExportReviews = () => {
    if (reviews.length === 0) {
      toast.info("No reviews to export");
      return;
    }
    exportToCSV(
      reviews.map(({ id, name, role, rating, text, createdAt }) => ({
        id, name, role, rating, text, createdAt,
      })),
      "reviews"
    );
    toast.success("Reviews exported successfully!");
  };

  const handleExportAll = () => {
    handleExportJobs();
    if (reviews.length > 0) handleExportReviews();
  };

  const renderContent = () => {
    if (activeTab === "jobs") {
      return (
        <AllPostedJobs
          jobs={JOBS}
          onUpdateStatus={updateJobStatus}
          onDelete={removeJob}
        />
      );
    }

    if (activeTab === "profiles") {
      return <AdminProfiles />;
    }

    if (activeTab === "notifications") {
      return <AdminNotifications />;
    }

    if (activeTab === "reports") {
      return <AdminReports jobs={JOBS} />;
    }

    return (
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        <div>
          <h2 className="text-xl font-bold text-foreground">Welcome Back!, Admin</h2>
          <p className="text-sm text-muted-foreground">Here's what happening with your reports today</p>
        </div>

        <StatsCards
          totalJobs={totalJobs}
          pendingJobs={pendingJobs}
          acceptedJobs={acceptedJobs}
          rejectedJobs={rejectedJobs}
        />

        <AdminCharts jobs={JOBS} workers={WORKERS} verifiedWorkers={VERIFIED_WORKERS} reportedWorkers={REPORT_WORKERS} />

        <PostedJobsTable
          jobs={JOBS}
          onViewAll={() => setActiveTab("jobs")}
        />

        <CategoryDetails workers={WORKERS} />
      </main>
    );
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />

        <div className="flex-1 flex">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
