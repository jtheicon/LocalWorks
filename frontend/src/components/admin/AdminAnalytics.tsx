import { useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bot, CheckCircle2, AlertTriangle, CircleSlash, UserX, Loader2 } from "lucide-react";
import { toast } from "sonner";

axios.defaults.withCredentials = true;

const API = "http://localhost:8920/api/admin";

interface SectorRow {
  sector: string;
  jobPosts: number;
  openJobs: number;
  openPositions: number;
  workers: number;
  applications: number;
  placements: number;
}

interface AnalyticsData {
  totals: {
    openJobs: number; openPositions: number; activeWorkers: number; activeEmployers: number;
    applications: number; placements: number; placementRate: number;
  };
  bySector: SectorRow[];
  monthly: { month: string; jobsPosted: number; applications: number; newUsers: number }[];
  applicationOutcomes: { status: string; count: number }[];
  verification: { total: number; autoApproved: number; flagged: number; unavailable: number };
  accounts: Record<"workers" | "employers", { active: number; pending: number; inactive: number; autoDeactivated: number }>;
}

interface CleanupPreview {
  inactivityMonths: number;
  lastRun: { at: string; deactivated: number } | null;
  candidates: { _id: string; role: string; name: string; email: string; lastActiveAt: string }[];
}

// Categorical slots from the validated reference palette (light / dark steps).
// Series 1-2 pass every CVD/contrast check together in both modes; slot 3 is the
// next validated slot in the same fixed order.
const VIZ_STYLE = `
.viz-root {
  --series-1: #2a78d6;
  --series-2: #eb6834;
  --series-3: #1baf7a;
}
.dark .viz-root {
  --series-1: #3987e5;
  --series-2: #d95926;
  --series-3: #199e70;
}`;

const SECTOR_LIMIT = 8;

const axisTick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const gridStroke = "hsl(var(--border))";

/* -------------------------------------------------------------------------- */
/*                                Small pieces                                */
/* -------------------------------------------------------------------------- */

const ChartCard = ({ title, subtitle, children, className = "" }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) => (
  <Card className={`border-none shadow-sm ${className}`}>
    <CardContent className="p-5">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="mb-4 text-xs text-muted-foreground">{subtitle}</p>}
      {children}
    </CardContent>
  </Card>
);

const StatTile = ({ label, value, note }: { label: string; value: string | number; note?: string }) => (
  <Card className="border-none shadow-sm">
    <CardContent className="p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </CardContent>
  </Card>
);

// Tooltip text stays in text colors; the swatch carries series identity.
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// Direct label at the end of each line (series names are also in the legend).
const endLabel = (name: string, lastIndex: number) => (props: any) =>
  props.index === lastIndex ? (
    <text x={props.x + 6} y={props.y} dy={4} fontSize={11} fill="hsl(var(--muted-foreground))">{name}</text>
  ) : null;

const truncate = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

const AdminAnalytics = () => {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["adminAnalytics"],
    queryFn: async () => (await axios.get(`${API}/analytics`)).data,
  });

  const { data: cleanup } = useQuery<CleanupPreview>({
    queryKey: ["cleanupPreview"],
    queryFn: async () => (await axios.get(`${API}/cleanup/preview`)).data,
  });

  const runCleanup = useMutation({
    mutationFn: async () => (await axios.post(`${API}/cleanup/run`)).data,
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["cleanupPreview"] });
      queryClient.invalidateQueries({ queryKey: ["adminAnalytics"] });
    },
    onError: () => toast.error("Failed to run account cleanup"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  if (error || !data) return <p className="text-sm text-destructive">Failed to load analytics.</p>;

  const { totals, bySector, monthly, applicationOutcomes, verification, accounts } = data;

  // Top sectors by job posts; the rest fold into "Other" so the chart stays readable.
  const postedSectors = bySector.filter((s) => s.jobPosts > 0);
  const sectorChart = postedSectors.slice(0, SECTOR_LIMIT).map((s) => ({ name: s.sector, jobPosts: s.jobPosts, openJobs: s.openJobs }));
  const rest = postedSectors.slice(SECTOR_LIMIT);
  if (rest.length) {
    sectorChart.push({
      name: `Other (${rest.length})`,
      jobPosts: rest.reduce((n, s) => n + s.jobPosts, 0),
      openJobs: rest.reduce((n, s) => n + s.openJobs, 0),
    });
  }

  const supplyDemand = [...bySector]
    .filter((s) => s.openPositions > 0 || s.workers > 0)
    .sort((a, b) => b.openPositions + b.workers - (a.openPositions + a.workers))
    .slice(0, 6)
    .map((s) => ({ name: s.sector, openPositions: s.openPositions, workers: s.workers }));

  const autoRate = verification.total ? Math.round((verification.autoApproved / verification.total) * 100) : 0;
  const lastIndex = monthly.length - 1;
  const candidates = cleanup?.candidates ?? [];

  return (
    <div className="viz-root space-y-6">
      <style>{VIZ_STYLE}</style>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Open jobs" value={totals.openJobs} note={`${totals.openPositions} positions to fill`} />
        <StatTile label="Active workers" value={totals.activeWorkers} />
        <StatTile label="Active employers" value={totals.activeEmployers} />
        <StatTile label="Placements" value={totals.placements} note={`${totals.placementRate}% of ${totals.applications} applications`} />
        <StatTile label="AI auto-approved" value={`${autoRate}%`} note={`of ${verification.total} automated checks`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Job postings by sector" subtitle="All job posts (excluding declined), by job category">
          {sectorChart.length ? (
            <ResponsiveContainer width="100%" height={Math.max(180, sectorChart.length * 34 + 30)}>
              <BarChart data={sectorChart} layout="vertical" margin={{ left: 8, right: 16 }} barSize={14}>
                <CartesianGrid stroke={gridStroke} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={axisTick} tickFormatter={(v) => truncate(v)} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="jobPosts" name="Job posts" fill="var(--series-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No job posts yet.</p>
          )}
        </ChartCard>

        <ChartCard title="Labor supply vs. demand" subtitle="Open positions compared with active workers in the same sector">
          {supplyDemand.length ? (
            <ResponsiveContainer width="100%" height={Math.max(200, supplyDemand.length * 48 + 50)}>
              <BarChart data={supplyDemand} layout="vertical" margin={{ left: 8, right: 16 }} barSize={12} barGap={2}>
                <CartesianGrid stroke={gridStroke} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={axisTick} tickFormatter={(v) => truncate(v)} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                <Bar dataKey="openPositions" name="Open positions" fill="var(--series-1)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="workers" name="Active workers" fill="var(--series-2)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No sector data yet.</p>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <ChartCard title="Monthly activity" subtitle="Last 6 months">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthly} margin={{ top: 8, right: 90, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
              <Line type="monotone" dataKey="jobsPosted" name="Jobs posted" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} label={endLabel("Jobs posted", lastIndex)} />
              <Line type="monotone" dataKey="applications" name="Applications" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} label={endLabel("Applications", lastIndex)} />
              <Line type="monotone" dataKey="newUsers" name="New users" stroke="var(--series-3)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} label={endLabel("New users", lastIndex)} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Application outcomes" subtitle={`${totals.applications} applications in total`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={applicationOutcomes} layout="vertical" margin={{ left: 8, right: 16 }} barSize={14}>
              <CartesianGrid stroke={gridStroke} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="status" width={118} tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="count" name="Applications" fill="var(--series-1)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Automated verification" subtitle="Registrations and job posts checked by AI">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Auto-approved:</span>
              <span className="font-semibold text-foreground">{verification.autoApproved}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-muted-foreground">Flagged for admin review:</span>
              <span className="font-semibold text-foreground">{verification.flagged}</span>
            </div>
            <div className="flex items-center gap-2">
              <CircleSlash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">AI unavailable (sent to review):</span>
              <span className="font-semibold text-foreground">{verification.unavailable}</span>
            </div>
            <p className="flex items-start gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Admins only review items the AI could not approve. See each profile or job for the AI's reasons.
            </p>
          </div>
        </ChartCard>

        <ChartCard title="Account health" subtitle={`Accounts inactive for ${cleanup?.inactivityMonths ?? 6}+ months are deactivated automatically every day`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Accounts</TableHead>
                <TableHead className="text-right text-xs">Active</TableHead>
                <TableHead className="text-right text-xs">Pending</TableHead>
                <TableHead className="text-right text-xs">Inactive</TableHead>
                <TableHead className="text-right text-xs">Auto-deactivated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(["workers", "employers"] as const).map((role) => (
                <TableRow key={role}>
                  <TableCell className="text-sm capitalize">{role}</TableCell>
                  <TableCell className="text-right text-sm">{accounts[role].active}</TableCell>
                  <TableCell className="text-right text-sm">{accounts[role].pending}</TableCell>
                  <TableCell className="text-right text-sm">{accounts[role].inactive}</TableCell>
                  <TableCell className="text-right text-sm">{accounts[role].autoDeactivated}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="text-xs text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">{candidates.length}</span> account(s) currently eligible for deactivation
              </p>
              <p>
                Last run: {cleanup?.lastRun ? `${new Date(cleanup.lastRun.at).toLocaleString()} (${cleanup.lastRun.deactivated} deactivated)` : "not yet since server start"}
              </p>
            </div>
            <Button size="sm" variant="outline" className="gap-2" disabled={runCleanup.isPending} onClick={() => setConfirmOpen(true)}>
              {runCleanup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
              Run cleanup now
            </Button>
          </div>
        </ChartCard>
      </div>

      {/* Table view of the sector data (exact values behind the sector charts) */}
      <ChartCard title="Sector breakdown" subtitle="Exact values behind the sector charts">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Sector</TableHead>
                <TableHead className="text-right text-xs">Job posts</TableHead>
                <TableHead className="text-right text-xs">Open jobs</TableHead>
                <TableHead className="text-right text-xs">Open positions</TableHead>
                <TableHead className="text-right text-xs">Active workers</TableHead>
                <TableHead className="text-right text-xs">Applications</TableHead>
                <TableHead className="text-right text-xs">Placements</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bySector.map((s) => (
                <TableRow key={s.sector}>
                  <TableCell className="text-sm font-medium">{s.sector}</TableCell>
                  <TableCell className="text-right text-sm">{s.jobPosts}</TableCell>
                  <TableCell className="text-right text-sm">{s.openJobs}</TableCell>
                  <TableCell className="text-right text-sm">{s.openPositions}</TableCell>
                  <TableCell className="text-right text-sm">{s.workers}</TableCell>
                  <TableCell className="text-right text-sm">{s.applications}</TableCell>
                  <TableCell className="text-right text-sm">{s.placements}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ChartCard>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate inactive accounts?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {candidates.length
                    ? `${candidates.length} account(s) have been inactive for ${cleanup?.inactivityMonths ?? 6}+ months. They will be hidden from listings and emailed. They can reactivate by logging in.`
                    : "No accounts are currently inactive long enough to be deactivated."}
                </p>
                {candidates.length > 0 && (
                  <ul className="max-h-40 overflow-y-auto rounded border border-border p-2 text-xs">
                    {candidates.map((c) => (
                      <li key={c._id}>
                        {c.name} ({c.role}) - last active {new Date(c.lastActiveAt).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!candidates.length} onClick={() => runCleanup.mutate()}>
              Deactivate {candidates.length || ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAnalytics;
