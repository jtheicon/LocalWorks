import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, FileDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Job } from "@/lib/jobsStore";
import { exportReport, hasReportData, type ExportFormat, type SystemReport } from "@/lib/reportExport";
import { ANALYTICS_QUERY_KEY, dashboardReportCharts, dashboardSummary, fetchAdminAnalytics } from "@/lib/dashboardCharts";
import { toast } from "sonner";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import ReportDetailsModal from "./ReportDetailsModal";
import {
  ADMIN_API,
  adminQueryKeys,
  fetchAdminReports,
  ADMIN_REPORTS_STALE_MS,
} from "@/lib/adminConnect";
import AdminReportsSkeleton from "@/components/admin/AdminReportsSkeleton";


const BAR_COLORS = [
  "hsl(24, 85%, 50%)",
  "hsl(40, 70%, 55%)",
  "hsl(174, 42%, 45%)",
  "hsl(0, 70%, 55%)",
  "hsl(45, 80%, 50%)",
];

interface AdminReportsProps {
  jobs: Job[];
}

const categoryTable = [
  { name: "Hospitality", activeJobs: 15, avgApplicants: 22, acceptanceRate: 90, verifiedWorkers: 5 },
  { name: "Warehouse", activeJobs: 11, avgApplicants: 27, acceptanceRate: 90, verifiedWorkers: 11 },
  { name: "Construction", activeJobs: 10, avgApplicants: 35, acceptanceRate: 85, verifiedWorkers: 36 },
  { name: "Security", activeJobs: 9, avgApplicants: 20, acceptanceRate: 80, verifiedWorkers: 10 },
  { name: "Warehouse", activeJobs: 3, avgApplicants: 24, acceptanceRate: 70, verifiedWorkers: 12 },
  { name: "Driving", activeJobs: 4, avgApplicants: 14, acceptanceRate: 90, verifiedWorkers: 8 },
  { name: "Cleaning", activeJobs: 7, avgApplicants: 18, acceptanceRate: 85, verifiedWorkers: 15 },
];

const AdminReports = ({ jobs }: AdminReportsProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("worker");
  const [reportDetails, setReportDetails] = useState(false);
  const [Worker, SetWorker] = useState(null)
  const [Employer, SetEmployer] = useState(null)
  const [Type, SetType] = useState(null)
  const [Description, SetDescription] = useState(null)
  const [Status, SetStatus] = useState(null)
  const [SubmitEvidence, SetSubmitEvidence] = useState([])
  const [Sender, SetSender] = useState(null)
  const [ID, SetID] = useState(null)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)

  const updateReportStatus = async (_id: string, status: string) => {
    try {
      await axios.patch(
        `${ADMIN_API}/update/report`,
        {
          _id,
          status,
        },
        {
          withCredentials: true,
        }
      );

      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.reports,
      });

      toast.success("Report status updated");
    } catch (error) {
      toast.error("Failed to update report status");
    }
  };


  const { data, isPending, isError, refetch } = useQuery({
    queryKey: adminQueryKeys.reports,
    queryFn: fetchAdminReports,
    staleTime: ADMIN_REPORTS_STALE_MS,
  });

  const jobsByIndustry = data?.jobsByIndustry ?? [];
  const workerGrowth = data?.workerGrowth ?? [];
  const jobPerformance = data?.jobPerformance ?? [];
  const categoryTable = data?.categoryTable ?? [];
  const reportedWorkers = data?.ReportedWorkers ?? [];
  const healthMetrics = data?.applicationHealth ?? {
    verificationRate: 0,
    averageMatchTime: 0,
    averageResponseTime: 0,
    platformUptime: 0,
  };

  const reportsReady = !isPending && Boolean(data);

  const buildReport = (last30Days: boolean): SystemReport => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const inRange = (date?: string) => !last30Days || (!!date && new Date(date) >= since);

    const rangeJobs = jobs.filter((job) => inRange(job.createdAt));
    const rangeIncidents = (data?.ReportedWorkers ?? []).filter((r: any) => inRange(r.createdAt));
    const count = (status: string) => rangeJobs.filter((j) => j.status === status).length;

    return {
      title: last30Days ? "System Report - Last 30 Days" : "System Report - All Time",
      subtitle: last30Days
        ? `Covering ${since.toLocaleDateString()} to ${new Date().toLocaleDateString()}`
        : undefined,
      summary: [
        ["Total Jobs Posted", rangeJobs.length],
        ["Accepted", count("ACCEPTED")],
        ["Pending", count("PENDING")],
        ["Rejected", count("DECLINED")],
        ["Fill Rate", `${rangeJobs.length ? Math.round((count("ACCEPTED") / rangeJobs.length) * 100) : 0}%`],
        ["Incident Reports", rangeIncidents.length],
        ["Verification Rate", `${healthMetrics.verificationRate}%`],
        ["Average Match Time", `${healthMetrics.averageMatchTime} hrs`],
        ["Average Response Time", `${healthMetrics.averageResponseTime} mins`],
        ["Platform Uptime", `${healthMetrics.platformUptime}%`],
      ],
      sections: [
        {
          title: "Posted Jobs",
          rows: rangeJobs.map(({ _id, title, company, location, salary, type, posted, status, createdAt }) => ({
            _id,
            title,
            company,
            location,
            salary,
            type,
            postedBy: posted?.email ?? "",
            status: status || "pending",
            datePosted: createdAt ? new Date(createdAt).toLocaleDateString() : "",
          })),
        },
        {
          title: "Category Data",
          rows: categoryTable.map((c: any) => ({
            category: c.name,
            activeJobs: c.activeJobs,
            totalApplications: c.totalApplications,
            acceptanceRate: `${c.acceptanceRate}%`,
          })),
        },
        {
          title: "Incident Reports",
          rows: rangeIncidents.map((r: any) => ({
            type: r.reportType,
            description: r.description,
            worker: r.workerId?.email ?? "",
            employer: r.employerId?.email ?? "",
            sentBy: r.sentBy ?? "",
            status: r.status,
            date: new Date(r.createdAt).toLocaleDateString(),
          })),
        },
      ],
    };
  };

  const handleExport = async (format: ExportFormat, last30Days: boolean) => {
    const report = buildReport(last30Days);
    if (!hasReportData(report)) {
      toast.info("No data to export for this period.");
      return;
    }
    if (format === "csv" && report.sections[0].rows.length === 0) {
      toast.info("No jobs to export for this period. Try Excel or PDF for the full report.");
      return;
    }

    setExporting(format);
    try {
      if (format === "pdf") {
        // Same data and charts as the Dashboard tab (cached if the dashboard was already opened).
        const analytics = await queryClient.fetchQuery({
          queryKey: ANALYTICS_QUERY_KEY,
          queryFn: fetchAdminAnalytics,
        });
        report.summary = [...dashboardSummary(analytics), ...(report.summary ?? [])];
        report.charts = { title: "Platform Overview (Dashboard)", items: dashboardReportCharts(analytics) };
      }

      await exportReport(report, last30Days ? "system-report-last-30-days" : "system-report", format);
      toast.success(`${format === "excel" ? "Excel" : format.toUpperCase()} report exported successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export report.");
    } finally {
      setExporting(null);
    }
  };

  const exportOptions: { format: ExportFormat; label: string; icon: typeof FileText }[] = [
    { format: "pdf", label: "Printable PDF", icon: FileText },
    { format: "excel", label: "Excel (.xlsx)", icon: FileSpreadsheet },
    { format: "csv", label: "CSV (jobs only)", icon: FileDown },
  ];

  return (
    <main className="p-6 space-y-6">
      {isError && (
        <p className="text-sm text-destructive">Could not load reports. Try Refresh on User management or re-open this tab.</p>
      )}

      {!reportsReady && <AdminReportsSkeleton />}

      {/* Header */}
      <div className={`flex items-center justify-between ${!reportsReady ? "hidden" : ""}`}>
        <div>
          <h2 className="text-xl font-bold text-foreground">Detailed Reports & Analytics</h2>
          <p className="text-sm text-muted-foreground">Analyze application performance and trends</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-2 text-sm" disabled={exporting !== null}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? "Exporting..." : "Export Report"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {[false, true].map((last30Days, i) => (
              <div key={String(last30Days)}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {last30Days ? "Last 30 Days" : "All Time"}
                </DropdownMenuLabel>
                {exportOptions.map(({ format, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={format}
                    onSelect={() => handleExport(format, last30Days)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className={!reportsReady ? "hidden" : ""}>
        <TabsList className="bg-transparent gap-1 p-0 h-auto border-b border-border rounded-none w-full justify-start">
          {[
            { value: "worker", label: "Worker Performance" },
            { value: "job", label: "Job Performance" },
            { value: "category", label: "Category Detailed Data" },
            { value: "reports", label: "Reports" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent hover:bg-transparent hover:text-foreground hover:border-border data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:hover:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:font-semibold px-4 pb-2 text-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content based on tab */}
      {reportsReady && activeTab === "worker" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Worker Growth Chart */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <h3 className="text-base font-semibold text-foreground">Worker Growth</h3>
              <p className="text-xs text-muted-foreground mb-4">Worker Registration Trends</p>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={workerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="newWorkers" name="New Workers" stroke="hsl(24, 85%, 50%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(24, 85%, 50%)" }} />
                  <Line type="monotone" dataKey="activeWorkers" name="Active Workers" stroke="hsl(174, 42%, 45%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(174, 42%, 45%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Payment Summary */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-base font-semibold text-foreground">Payment Summary</h3>
                <p className="text-xs text-muted-foreground mb-4">Completed Placements by Category</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={jobsByIndustry} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {jobsByIndustry.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Overall Application Health */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-5 space-y-3">
                <h3 className="text-base font-semibold text-foreground">Overall Application Health</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Verification Rate:</span>
                    <span className="font-semibold text-foreground">{healthMetrics.verificationRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Average Match Time:</span>
                    <span className="font-semibold text-foreground">{healthMetrics.averageMatchTime} Hrs</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Average Response Time:</span>
                    <span className="font-semibold text-foreground">{healthMetrics.averageResponseTime} Mins</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Platform Uptime:</span>
                    <span className="font-semibold text-foreground">{healthMetrics.platformUptime}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Table - full width below */}
          <div className="lg:col-span-2">
            <CategoryTable data={categoryTable} />
          </div>
        </div>
      )}

      {reportsReady && activeTab === "job" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <h3 className="text-base font-semibold text-foreground">Job Posting Trends</h3>
              <p className="text-xs text-muted-foreground mb-4">Monthly job activity overview</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={jobPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="posted" name="Posted" stroke="hsl(24, 85%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="filled" name="Filled" stroke="hsl(174, 42%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="expired" name="Expired" stroke="hsl(0, 70%, 55%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-5 space-y-3">
                <h3 className="text-base font-semibold text-foreground">Job Stats Summary</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Jobs Posted:</span>
                    <span className="font-semibold text-foreground">{jobs.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Accepted:</span>
                    <span className="font-semibold text-foreground">{jobs.filter(j => j.status === "ACCEPTED").length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pending:</span>
                    <span className="font-semibold text-foreground">{jobs.filter(j => j.status === "PENDING").length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rejected:</span>
                    <span className="font-semibold text-foreground">{jobs.filter(j => j.status === "DECLINED").length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Fill Rate:</span>
                    <span className="font-semibold text-foreground">
                      {jobs.length > 0 ? Math.round((jobs.filter(j => j.status === "ACCEPTED").length / jobs.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <CategoryTable data={categoryTable} />
          </div>
        </div>
      )}

      {reportsReady && activeTab === "category" && (
        <div className="space-y-4">
          <CategoryTable data={categoryTable} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-base font-semibold text-foreground">Placements by Category</h3>
                <p className="text-xs text-muted-foreground mb-4">Completed placements breakdown</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={jobsByIndustry} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {jobsByIndustry.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-5 space-y-3">
                <h3 className="text-base font-semibold text-foreground">Category Health</h3>
                <div className="space-y-2">
                  {categoryTable.slice(0, 5).map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{cat.name}:</span>
                      <span className="font-semibold text-foreground">{cat.acceptanceRate}% acceptance</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {reportsReady && activeTab === "reports" && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-base font-semibold mb-4">Reports</h3>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {reportedWorkers.map((report: any) => (
                  <TableRow key={report._id}>
                    <TableCell>{report.reportType}</TableCell>
                    <TableCell>{report.description}</TableCell>
                    <TableCell>
                      {new Date(report.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={report.status}
                        onValueChange={(value) => updateReportStatus(report._id, value)}
                      >
                        <SelectTrigger className="w-[170px]">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button onClick={() => {
                        setReportDetails(true)
                        SetWorker(report.workerId?.email ?? "")
                        SetEmployer(report.employerId?.email ?? "")
                        SetDescription(report.description)
                        SetType(report.reportType)
                        SetStatus(report.status)
                        SetSender(report.sentBy)
                        SetSubmitEvidence(report.submitEvidence)
                        SetID(report._id)
                      }}>View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>

          
      <ReportDetailsModal
        open={reportDetails}
        onOpenChange={setReportDetails}
        Worker={Worker}
        Employer={Employer}
        Description={Description}
        Type={Type}
        SubmitEvidence={SubmitEvidence}
        Sender={Sender}
        Status={Status}
        SetStatus={SetStatus}
        ID={ID}
        RefetchData={refetch}
      />      
        </Card>
      )}
    </main>
  );
};

// Extracted category table component
const CategoryTable = ({ data }: { data: typeof categoryTable }) => (
  <Card className="border-none shadow-sm">
    <CardContent className="p-5">
      <h3 className="text-base font-semibold text-foreground mb-1">Category Detailed Data</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
          <TableRow className="border-muted">
            <TableHead className="text-xs font-semibold">Category Name</TableHead>
            <TableHead className="text-xs font-semibold text-center">Active Jobs</TableHead>
            <TableHead className="text-xs font-semibold text-center">Total Applications</TableHead>
            <TableHead className="text-xs font-semibold text-center">Acceptance Rate (%)</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i} className="border-muted/50">
              <TableCell className="text-sm font-medium">{row.name}</TableCell>
              <TableCell className="text-sm text-center">{row.activeJobs}</TableCell>
              <TableCell className="text-sm text-center">{row.totalApplications}</TableCell>
              <TableCell className="text-sm text-center">
                {row.acceptanceRate}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

export default AdminReports;
