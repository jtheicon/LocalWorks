import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Eye, Trash2, Search, Building2 } from "lucide-react";
import { Job } from "@/lib/jobsStore";
import { toast } from "sonner";
import CompanyDetailModal from "./CompanyDetailModal";

interface AllPostedJobsProps {
  jobs: Job[];
  onUpdateStatus: (id: number, status: "accepted" | "rejected") => void;
  onDelete: (id: number) => void;
}

const AllPostedJobs = ({ jobs, onUpdateStatus, onDelete }: AllPostedJobsProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
  "all" | "PENDING" | "ACCEPTED" | "DECLINED"
>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; company: string | null }>({ open: false, company: null });

  // Group jobs by company
  const companies = useMemo(() => {
    const grouped: Record<string, Job[]> = {};

    jobs.forEach((job) => {
      if (!grouped[job.company]) grouped[job.company] = [];
      grouped[job.company].push(job);
    });

    return Object.entries(grouped)
      .map(([company, companyJobs]) => {
        const filteredJobs =
          filter === "all"
            ? companyJobs
            : companyJobs.filter((j) => j.status === filter);

        return [company, filteredJobs] as [string, Job[]];
      })
      .filter(([company, companyJobs]) => {
        const matchesSearch = company
          .toLowerCase()
          .includes(search.toLowerCase());

        return matchesSearch && companyJobs.length > 0;
      })
      .sort((a, b) => {
        const aMax = Math.max(
          ...a[1].map((j) => new Date(j.createdAt).getTime())
        );
        const bMax = Math.max(
          ...b[1].map((j) => new Date(j.createdAt).getTime())
        );

        return sort === "newest" ? bMax - aMax : aMax - bMax;
      });
  }, [jobs, search, filter, sort]);

  const getCompanyStatus = (companyJobs: Job[]) => {
    const pending = companyJobs.filter(j => j.status === "PENDING").length;
    const accepted = companyJobs.filter(j => j.status === "ACCEPTED").length;
    if (pending > 0) return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">{pending} Pending</Badge>;
    if (accepted === companyJobs.length) return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">All Accepted</Badge>;
    return (
      <Badge className="bg-muted text-muted-foreground text-xs">
        {companyJobs.length} Job{companyJobs.length !== 1 ? "s" : ""}
      </Badge>
    );
  }; // this doesn't change even after filtering


  const UTC_Converter = (createdAt) => {
    const splitDateAndTime = createdAt.split("T")
    const date = splitDateAndTime[0].split("-")
    const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    return months[Number(date[1])] + " " + date[1+1] + ", " + date[0]
  }

  return (
    <>
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        <div>
          <h2 className="text-xl font-bold text-foreground">Employer Companies</h2>
          <p className="text-sm text-muted-foreground">View employer companies and manage their job posts.</p>
        </div>

        {/* Search & Filters */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex gap-3 items-center ml-auto">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                    <SelectTrigger className="w-28 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ALL</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="DECLINED">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort:</span>
                  <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                    <SelectTrigger className="w-28 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Card Grid */}
        {companies.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-sm">
            No companies match your search
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map(([company, companyJobs]) => (
              <Card key={company} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="bg-primary h-24 flex items-center justify-center px-4">
                  <h3 className="text-primary-foreground font-semibold text-sm text-center truncate">{company}</h3>
                </div>

                {/* Logo circle overlapping */}
                <div className="relative px-4">
                  <div className="absolute -top-6 left-4 w-12 h-12 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-sm">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                </div>

                {/* Content */}
                <CardContent className="pt-8 pb-3 px-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{company}</p>
                      <p className="text-xs text-muted-foreground">{companyJobs.length} job{companyJobs.length > 1 ? "s" : ""} posted</p>
                    </div>
                    {getCompanyStatus(companyJobs)}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <p className="text-[10px] text-muted-foreground">{UTC_Converter(companyJobs[0]?.createdAt)}</p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => { setSelectedCompany(company); setCompanyModalOpen(true); }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Company Detail Modal */}
      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          jobs={jobs.filter(
            j =>
              j.company === selectedCompany &&
              (filter === "all" || j.status === filter)
          )}
          open={companyModalOpen}
          onOpenChange={setCompanyModalOpen}
          onUpdateStatus={(id, status) => { onUpdateStatus(id, status); toast.success(`Job ${status}`); }}
          status={filter}
          onDelete={(id) => { onDelete(id); toast.success("Job deleted"); }}
        />
      )}
    </>
  );
};

export default AllPostedJobs;
