import { lazy, Suspense, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useJobsStore } from "@/lib/jobsStore";
import { useReviewsStore } from "@/lib/reviewsStore";
import { exportToCSV } from "@/lib/csvExport";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminReportsSkeleton from "@/components/admin/AdminReportsSkeleton";
import AllPostedJobs from "@/components/admin/AllPostedJobs";
import AdminProfiles from "@/components/admin/AdminProfiles";
import AdminNotifications from "@/components/admin/AdminNotifications";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  ADMIN_API,
  adminQueryKeys,
  invalidateAdminLifecycleData,
  fetchAdminReports,
  ADMIN_REPORTS_STALE_MS,
} from "@/lib/adminConnect";

const AdminReports = lazy(() => import("@/components/admin/AdminReports"));

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const tab = (location.state as { tab?: string } | null)?.tab;
    if (tab) setActiveTab(tab);
  }, [location.state]);
  const jobs = useJobsStore((s) => s.jobs);
  const removeJob = useJobsStore((s) => s.removeJob);
  const updateJobStatus = useJobsStore((s) => s.updateJobStatus);
  const reviews = useReviewsStore((s) => s.reviews);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    queryClient.invalidateQueries({
      queryKey: adminQueryKeys.dashboard,
      refetchType: "active",
    });
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.analytics });

    if (tab === "dashboard") {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.cleanupPreview });
    }
    if (tab === "profiles") {
      invalidateAdminLifecycleData(queryClient);
    }
    if (tab === "notifications") {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.notifications });
    }
    if (tab === "reports") {
      void queryClient.prefetchQuery({
        queryKey: adminQueryKeys.reports,
        queryFn: fetchAdminReports,
        staleTime: ADMIN_REPORTS_STALE_MS,
      });
    }
  };

  const Dashboard = async () => {
    const result = await axios.get(`${ADMIN_API}/dashboard`, { withCredentials: true })
    return result.data
  }
  
  const styleCenter = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "40px"
  }

  const { data, isLoading, error } = useQuery({
    queryKey: adminQueryKeys.dashboard,
    queryFn: Dashboard,
  })

  if (isLoading) return <div style={styleCenter}>Loading...</div>
  if (error) {
    return (
      <div style={styleCenter} className="flex flex-col gap-2 text-sm">
        <p className="text-destructive">Could not load admin dashboard.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
          Back to admin sign in
        </Button>
      </div>
    );
  }

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
      return (
        <Suspense fallback={<AdminReportsSkeleton />}>
          <AdminReports jobs={JOBS} />
        </Suspense>
      );
    }

    return (
      <main className="app-dashboard-main app-dashboard-stack">
        <div>
          <h2 className="app-page-title">Platform Overview</h2>
          <p className="app-page-description">
            High-level statistics across sectors. Individual jobs and accounts are managed in the Posted Jobs and Profiles tabs.
          </p>
        </div>

        <AdminAnalytics />
      </main>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader />

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
