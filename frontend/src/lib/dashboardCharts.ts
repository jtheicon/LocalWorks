// Data behind the admin dashboard charts (components/admin/AdminAnalytics.tsx), shared with
// the PDF report so the downloaded charts match what the dashboard shows.
import axios from "axios";
import type { ReportChart } from "./reportExport";

export interface SectorRow {
  sector: string;
  jobPosts: number;
  openJobs: number;
  openPositions: number;
  workers: number;
  applications: number;
  placements: number;
}

export interface AnalyticsData {
  totals: {
    openJobs: number; openPositions: number; activeWorkers: number; activeEmployers: number;
    applications: number; placements: number; placementRate: number;
  };
  bySector: SectorRow[];
  monthly: { month: string; jobsPosted: number; applications: number; newUsers: number }[];
  applicationOutcomes: { status: string; count: number }[];
  verification: { total: number; autoApproved: number; flagged: number; unavailable: number };
  accounts: Record<
    "workers" | "employers",
    {
      platformActive: number;
      inactivityMonitoring: number;
      pending: number;
      deactivated: number;
      autoDeactivated: number;
    }
  >;
}

export const ANALYTICS_QUERY_KEY = ["adminAnalytics"];

export const fetchAdminAnalytics = async (): Promise<AnalyticsData> =>
  (await axios.get("http://localhost:8920/api/admin/analytics", { withCredentials: true })).data;

// Light-mode values of the dashboard's --series-1..3 colors.
const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a"];

const SECTOR_LIMIT = 8;

// Top sectors by job posts; the rest fold into "Other" so the chart stays readable.
export const sectorChartData = (bySector: SectorRow[]) => {
  const posted = bySector.filter((s) => s.jobPosts > 0);
  const chart = posted.slice(0, SECTOR_LIMIT).map((s) => ({ name: s.sector, jobPosts: s.jobPosts, openJobs: s.openJobs }));
  const rest = posted.slice(SECTOR_LIMIT);
  if (rest.length) {
    chart.push({
      name: `Other (${rest.length})`,
      jobPosts: rest.reduce((n, s) => n + s.jobPosts, 0),
      openJobs: rest.reduce((n, s) => n + s.openJobs, 0),
    });
  }
  return chart;
};

export const supplyDemandData = (bySector: SectorRow[]) =>
  [...bySector]
    .filter((s) => s.openPositions > 0 || s.workers > 0)
    .sort((a, b) => b.openPositions + b.workers - (a.openPositions + a.workers))
    .slice(0, 6)
    .map((s) => ({ name: s.sector, openPositions: s.openPositions, workers: s.workers }));

export const autoApprovalRate = (data: AnalyticsData) =>
  data.verification.total ? Math.round((data.verification.autoApproved / data.verification.total) * 100) : 0;

// The dashboard's KPI tiles, as summary rows.
export const dashboardSummary = (data: AnalyticsData): [string, string | number][] => [
  ["Open Jobs", `${data.totals.openJobs} (${data.totals.openPositions} positions to fill)`],
  ["Active Workers", data.totals.activeWorkers],
  ["Active Employers", data.totals.activeEmployers],
  ["Placements", `${data.totals.placements} (${data.totals.placementRate}% of ${data.totals.applications} applications)`],
  ["AI Auto-approved", `${autoApprovalRate(data)}% of ${data.verification.total} checks`],
];

// The four dashboard charts, in the same order and with the same titles.
export const dashboardReportCharts = (data: AnalyticsData): ReportChart[] => {
  const sectors = sectorChartData(data.bySector);
  const supply = supplyDemandData(data.bySector);

  return [
    {
      title: "Job postings by sector",
      subtitle: "All job posts (excluding declined), by job category",
      type: "bar",
      categories: sectors.map((s) => s.name),
      series: [{ name: "Job posts", color: SERIES_COLORS[0], values: sectors.map((s) => s.jobPosts) }],
    },
    {
      title: "Labor supply vs. demand",
      subtitle: "Open positions compared with active workers in the same sector",
      type: "bar",
      categories: supply.map((s) => s.name),
      series: [
        { name: "Open positions", color: SERIES_COLORS[0], values: supply.map((s) => s.openPositions) },
        { name: "Active workers", color: SERIES_COLORS[1], values: supply.map((s) => s.workers) },
      ],
    },
    {
      title: "Monthly activity",
      subtitle: "Last 6 months",
      type: "line",
      categories: data.monthly.map((m) => m.month),
      series: [
        { name: "Jobs posted", color: SERIES_COLORS[0], values: data.monthly.map((m) => m.jobsPosted) },
        { name: "Applications", color: SERIES_COLORS[1], values: data.monthly.map((m) => m.applications) },
        { name: "New users", color: SERIES_COLORS[2], values: data.monthly.map((m) => m.newUsers) },
      ],
    },
    {
      title: "Application outcomes",
      subtitle: `${data.totals.applications} applications in total`,
      type: "bar",
      categories: data.applicationOutcomes.map((o) => o.status),
      series: [{ name: "Applications", color: SERIES_COLORS[0], values: data.applicationOutcomes.map((o) => o.count) }],
    },
  ];
};
