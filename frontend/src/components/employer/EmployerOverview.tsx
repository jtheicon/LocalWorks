import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUp,
  Bell,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  FileText,
  HardHat,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PostJobModal, { EditableJob } from "@/components/employer/PostJobModal";

axios.defaults.withCredentials = true;

interface PostedJob extends EditableJob {
  status: string;
  category?: string;
  createdAt: string;
}

interface Application {
  _id: string;
  worker: { _id: string; name: string; photo: string } | null;
  job: { _id: string; title: string } | null;
  status: "Pending Review" | "Interview Scheduled" | "Accepted" | "Not Selected" | "Withdrawed";
  createdAt: string;
}

interface EmployerNotification {
  _id: string;
  type?: string;
  title: string;
  description: string;
  createdAt: string;
}

interface EmployerOverviewProps {
  notifications: EmployerNotification[];
  onNavigate: (tab: string) => void;
  onPostJob: () => void;
}

const JOB_STATUS: Record<string, { label: string; className: string }> = {
  ACCEPTED: { label: "Live", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  PENDING: { label: "Being checked", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  DECLINED: { label: "Declined", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const APPLICATION_STATUS: Record<string, { label: string; className: string }> = {
  "Pending Review": { label: "Pending", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  "Interview Scheduled": { label: "Interview", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  Accepted: { label: "Hired", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  "Not Selected": { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  Withdrawed: { label: "Withdrawn", className: "bg-muted text-muted-foreground" },
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const isThisWeek = (date?: string) => !!date && Date.now() - new Date(date).getTime() < WEEK_MS;

// Picks an icon/colour for a notification from the words in its title.
const activityStyle = (n: EmployerNotification) => {
  const text = `${n.type ?? ""} ${n.title}`.toLowerCase();
  if (text.includes("message")) return { icon: MessageSquare, className: "bg-blue-500 text-white" };
  if (text.includes("job") || text.includes("post")) return { icon: FileText, className: "bg-purple-500 text-white" };
  if (text.includes("status") || text.includes("accept") || text.includes("interview"))
    return { icon: CheckCircle2, className: "bg-primary text-primary-foreground" };
  if (text.includes("appl")) return { icon: UserCheck, className: "bg-green-500 text-white" };
  return { icon: Bell, className: "bg-muted-foreground text-white" };
};

const ViewAll = ({ onClick }: { onClick: () => void }) => (
  <Button variant="link" size="sm" onClick={onClick} className="h-auto p-0 gap-1 text-primary">
    View all
    <ChevronRight className="w-4 h-4" />
  </Button>
);

const EmployerOverview = ({ notifications, onNavigate, onPostJob }: EmployerOverviewProps) => {
  const [editing, setEditing] = useState<PostedJob | null>(null);

  const { data: company } = useQuery({
    queryKey: ["CompanyInfo"],
    queryFn: async () => (await axios.get("http://localhost:8920/api/pro/company")).data,
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["postedJobs"],
    queryFn: async () => (await axios.get("http://localhost:8920/api/pro/viewPostedJobs")).data,
  });

  const { data: applicationsData, isLoading: applicationsLoading } = useQuery({
    queryKey: ["ViewApplicationsEmployer"],
    queryFn: async () => (await axios.get("http://localhost:8920/api/pro/viewApplications/employer")).data,
  });

  const jobs: PostedJob[] = (jobsData?.jobs ?? []).filter((job: PostedJob) => job.status !== "DELETED");
  const applications: Application[] = applicationsData?.Applications ?? [];

  const byStatus = (status: Application["status"]) => applications.filter((a) => a.status === status);
  const shortlisted = byStatus("Interview Scheduled");
  const hired = byStatus("Accepted");
  const rejected = byStatus("Not Selected");
  const inProgress = applications.filter((a) => a.status === "Pending Review" || a.status === "Interview Scheduled");

  const applicantsPerJob = applications.reduce<Record<string, number>>((acc, a) => {
    if (a.job?._id) acc[a.job._id] = (acc[a.job._id] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    {
      label: "My Job Postings",
      value: jobs.length,
      change: jobs.filter((j) => isThisWeek(j.createdAt)).length,
      changeLabel: "new this week",
      icon: Briefcase,
      card: "bg-primary/5 border-primary/20",
      iconTile: "bg-primary text-primary-foreground",
    },
    {
      label: "Total Applicants",
      value: applications.length,
      change: applications.filter((a) => isThisWeek(a.createdAt)).length,
      changeLabel: "this week",
      icon: Users,
      card: "bg-green-500/5 border-green-500/20",
      iconTile: "bg-green-500 text-white",
    },
    {
      label: "Shortlisted",
      value: shortlisted.length,
      change: shortlisted.filter((a) => isThisWeek(a.createdAt)).length,
      changeLabel: "this week",
      icon: UserCheck,
      card: "bg-purple-500/5 border-purple-500/20",
      iconTile: "bg-purple-500 text-white",
    },
    {
      label: "Positions Filled",
      value: hired.length,
      change: hired.filter((a) => isThisWeek(a.createdAt)).length,
      changeLabel: "this week",
      icon: CheckCircle2,
      card: "bg-blue-500/5 border-blue-500/20",
      iconTile: "bg-blue-500 text-white",
    },
  ];

  const quickActions = [
    { label: "Post a New Job", description: "Create a job listing for local workers", icon: Plus, onClick: onPostJob, primary: true },
    { label: "Find Local Workers", description: "Search skilled workers near you", icon: Search, onClick: () => onNavigate("browse") },
    { label: "View Applicants", description: "Manage and review applications", icon: Users, onClick: () => onNavigate("applications") },
  ];

  // Donut segments for Hiring Progress
  const progress = [
    { label: "Hired", value: hired.length, color: "#22c55e", dot: "bg-green-500" },
    { label: "In Progress", value: inProgress.length, color: "hsl(var(--primary))", dot: "bg-primary" },
    { label: "Rejected", value: rejected.length, color: "#a1a1aa", dot: "bg-zinc-400" },
  ];
  const progressTotal = progress.reduce((sum, p) => sum + p.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <main className="flex-1 p-6 overflow-auto">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="space-y-6 min-w-0">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {greeting()}, {company?.CompanyInformation?.name ?? "there"}!
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Here's an overview of your hiring activity and job postings.
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} className={stat.card}>
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.iconTile}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {jobsLoading || applicationsLoading ? "–" : stat.value}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-green-600 mt-3">
                    <ArrowUp className="w-3 h-3" />+{stat.change} {stat.changeLabel}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* My Job Postings */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg">My Job Postings</CardTitle>
              <ViewAll onClick={() => onNavigate("jobPosts")} />
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : !jobs.length ? (
                <p className="text-sm text-muted-foreground">You haven't posted any jobs yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr className="text-left">
                        <th className="font-medium px-4 py-3">Job Title</th>
                        <th className="font-medium px-4 py-3">Location</th>
                        <th className="font-medium px-4 py-3">Applicants</th>
                        <th className="font-medium px-4 py-3">Status</th>
                        <th className="font-medium px-4 py-3">Posted On</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {jobs.slice(0, 5).map((job) => {
                        const status = JOB_STATUS[job.status] ?? { label: job.status, className: "" };
                        return (
                          <tr key={job._id} className="hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{job.title}</p>
                              <p className="text-xs text-muted-foreground">{job.category || job.type}</p>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                {job.location}
                              </span>
                            </td>
                            <td className="px-4 py-3">{applicantsPerJob[job._id] ?? 0}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={status.className}>{status.label}</Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(job.createdAt)}</td>
                            <td className="px-4 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditing(job)}>Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onNavigate("applications")}>View applicants</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Applicants */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg">Recent Applicants</CardTitle>
                <ViewAll onClick={() => onNavigate("applications")} />
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : !applications.length ? (
                  <p className="text-sm text-muted-foreground">No applications yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {applications.slice(0, 4).map((app) => {
                      const status = APPLICATION_STATUS[app.status] ?? { label: app.status, className: "" };
                      const name = app.worker?.name ?? "Unknown worker";
                      return (
                        <div key={app._id} className="flex items-center gap-3 py-3">
                          <Avatar className="h-9 w-9">
                            {app.worker?.photo && <AvatarImage src={`http://localhost:8920${app.worker.photo}`} />}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{name}</p>
                            <p className="text-xs text-muted-foreground truncate">{app.job?.title ?? "Removed job"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant="outline" className={status.className}>{status.label}</Badge>
                            <p className="text-[11px] text-muted-foreground mt-1">{formatDate(app.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hiring Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Hiring Progress</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-36 h-36 shrink-0">
                  <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                    <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="18" />
                    {progressTotal > 0 &&
                      progress.map((p) => {
                        const length = (p.value / progressTotal) * circumference;
                        const segment = (
                          <circle
                            key={p.label}
                            cx="70"
                            cy="70"
                            r={radius}
                            fill="none"
                            stroke={p.color}
                            strokeWidth="18"
                            strokeDasharray={`${length} ${circumference - length}`}
                            strokeDashoffset={-offset}
                          />
                        );
                        offset += length;
                        return segment;
                      })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-foreground">{hired.length}</span>
                    <span className="text-xs text-muted-foreground">Hired</span>
                  </div>
                </div>
                <div className="flex-1 w-full space-y-3">
                  {progress.map((p) => (
                    <div key={p.label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />
                        {p.label}
                      </span>
                      <span className="font-medium text-foreground">{p.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className={`w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                    action.primary
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                      : "bg-card border-border hover:bg-muted/50"
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      action.primary ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <action.icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold">{action.label}</span>
                    <span className={`block text-xs ${action.primary ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {action.description}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <ViewAll onClick={() => onNavigate("notifications")} />
            </CardHeader>
            <CardContent>
              {!notifications.length ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="space-y-5">
                  {notifications.slice(0, 4).map((n) => {
                    const style = activityStyle(n);
                    return (
                      <div key={n._id} className="flex gap-3">
                        <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${style.className}`}>
                          <style.icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{n.description}</p>
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20 overflow-hidden">
            <CardContent className="p-5 relative">
              <HardHat className="absolute -right-2 -bottom-2 w-24 h-24 text-primary/15" />
              <h3 className="text-lg font-bold text-foreground">Build Your Team</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-[220px]">
                Find skilled and reliable local workers for your projects.
              </p>
              <Button onClick={() => onNavigate("browse")} className="mt-4 gap-2">
                Find Workers
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <PostJobModal open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} job={editing} />
    </main>
  );
};

export default EmployerOverview;
