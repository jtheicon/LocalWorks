import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Search, MapPin, PhilippinePeso, Clock, Building2, Filter, Eye } from "lucide-react";
import { toast } from "sonner";
import JobDetailsModal from "./JobDetailsModal";
import { useJobsStore, Job } from "@/lib/jobsStore";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CredibilityBadge, { useCredibility } from "@/components/CredibilityBadge";
import JobListingsSkeleton from "@/components/worker/JobListingsSkeleton";
import { API_ORIGIN } from "@/lib/apiOrigin";
import { canWorkerApply, isJobApplyExpired } from "@/lib/workerJobApply";
import WorkerPageHeader from "@/components/worker/WorkerPageHeader";
axios.defaults.withCredentials = true;


const UTC_Converter = (createdAt) => {
  const splitDateAndTime = createdAt.split("T")
  const date = splitDateAndTime[0].split("-")
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  
  return months[Number(date[1])] + " " + date[1+1] + ", " + date[0]
}

const isDemoListing = (job: { info?: { title?: string; company?: string } }) =>
  /\[DEMO SEED\]/i.test(job.info?.title ?? "") || /demo seed/i.test(job.info?.company ?? "");

const JobsSectionHeader = ({
  id,
  title,
  description,
  count,
}: {
  id: string;
  title: string;
  description: string;
  count?: number;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-3 mb-4">
    <div>
      <h2 id={id} className="text-lg font-semibold text-foreground sm:text-xl">
        {title}
      </h2>
      <p className="app-muted-text mt-1">{description}</p>
    </div>
    {count != null ? (
      <Badge variant="secondary" className="w-fit shrink-0 font-normal">
        {count} {count === 1 ? "listing" : "listings"}
      </Badge>
    ) : null}
  </div>
);

type JobRow = {
  info: {
    _id: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    type: string;
    description?: string;
    tags?: string[];
    createdAt: string;
    applyBefore?: string;
    positions?: number;
    posted?: { _id: string };
  };
  IsApplied?: boolean;
  Accepted?: boolean;
  matchScore: number | null;
  matchedSkills: { jobSkill: string; workerSkill: string }[];
};

const JobListingCard = ({
  job,
  employerScores,
  matchLabel,
  matchTooltip,
  onView,
  onApply,
}: {
  job: JobRow;
  employerScores: Record<string, unknown>;
  matchLabel: (job: JobRow) => string;
  matchTooltip: (job: JobRow) => string | undefined;
  onView: () => void;
  onApply: () => void;
}) => {
  const employerId = job.info.posted?._id;
  let primaryAction: "apply" | "applied" | "hired" | "closed" | "expired" = "apply";
  if (job.Accepted) primaryAction = "hired";
  else if (job.IsApplied) primaryAction = "applied";
  else if (isJobApplyExpired(job.info.applyBefore)) primaryAction = "expired";
  else if (!canWorkerApply(job)) primaryAction = "closed";

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col h-full">
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-lg line-clamp-2">{job.info.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{job.info.company}</span>
            </CardDescription>
          </div>
          <Badge variant="outline" title={matchTooltip(job)} className="shrink-0 text-xs">
            {matchLabel(job)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={job.info.type === "Full-Time" ? "default" : "secondary"} className="text-xs font-normal">
            {job.info.type}
          </Badge>
          {isDemoListing(job) ? (
            <Badge variant="outline" className="text-xs font-normal border-amber-500/40 text-amber-800 bg-amber-50">
              Sample job (demo)
            </Badge>
          ) : null}
          {job.Accepted ? (
            <Badge className="text-xs font-normal bg-green-500/10 text-green-700 border-green-500/20">Hired</Badge>
          ) : job.IsApplied ? (
            <Badge variant="secondary" className="text-xs font-normal">Application sent</Badge>
          ) : null}
        </div>
        {employerId ? (
          <CredibilityBadge credibility={employerScores[employerId]} subject="Employer" />
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col flex-1 pt-0">
        {job.info.description ? (
          <p className="app-muted-text line-clamp-2 mb-3">{job.info.description}</p>
        ) : null}

        <div className="flex flex-col gap-1.5 app-muted-text mb-3 text-sm">
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" />
            {job.info.location}
          </span>
          <span className="flex items-center gap-2">
            <PhilippinePeso className="w-4 h-4 shrink-0" />
            {job.info.salary}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            Posted {UTC_Converter(job.info.createdAt)}
          </span>
        </div>

        {(job.info.tags?.length ?? 0) > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(job.info.tags ?? []).slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
            {(job.info.tags?.length ?? 0) > 4 ? (
              <Badge variant="outline" className="text-xs font-normal">
                +{job.info.tags!.length - 4}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-2 mt-auto pt-2">
          <Button variant="secondary" size="sm" className="flex-1 gap-1.5" onClick={onView}>
            <Eye className="w-4 h-4" />
            View details
          </Button>
          {primaryAction === "apply" ? (
            <Button size="sm" className="flex-1" onClick={onApply}>
              Apply
            </Button>
          ) : (
            <Button size="sm" className="flex-1" disabled variant={primaryAction === "hired" ? "secondary" : "outline"}>
              {primaryAction === "hired"
                ? "Hired"
                : primaryAction === "applied"
                  ? "Applied"
                  : primaryAction === "expired"
                    ? "Expired"
                    : "Closed"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const JobListings = () => {
  const queryClient = useQueryClient()
  const jobs = useJobsStore((state) => state.jobs);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);
  const [jobToApply, setJobToApply] = useState(null);
  const [lowMatchWarningOpen, setLowMatchWarningOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedMatchFilter, setSelectedMatchFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [selectedAppliedFilter, setSelectedAppliedFilter] = useState("all");
  const [showAllRecommended, setShowAllRecommended] = useState(false);


  // A function for returning the jobs:
  const Jobs = async () => {
    const { data } = await axios.get(`${API_ORIGIN}/api/pro/viewJobs`, {
      withCredentials: true,
    });

    return data;
  };

  // Display all jobs:
  // # ----------------------------------------------------------------------- #
  // # - The purpose of this useQuery function is to display all the jobs    - #
  // # ----------------------------------------------------------------------- #
  const { data, error, isPending } = useQuery({
    queryKey: ["job"],
    queryFn: Jobs,
    staleTime: 60_000,
  });




  // Employer credibility for every listed job (one batched request).
  const { data: employerScores = {} } = useCredibility(
    "employer",
    (data?.jobs || []).map((job: any) => job?.info?.posted?._id)
  )



  const AllJobs = data?.jobs ?? [];
  const recommendedScore = data?.matching?.recommendedScore ?? 50;
  const aiMatching = data?.matching?.ai === "on";

  // Jobs the worker was already hired for aren't openings for them anymore.
  const enrichedJobs = AllJobs.filter((job) => !job.Accepted).map((job) => ({
    ...job,
    matchScore: job.match?.score ?? null,
    matchedSkills: job.match?.matched || [],
    missingSkills: job.match?.missing || [],
  }));

  const matchLabel = (job: any) =>
    job.matchScore === null ? "No skills listed" : `${job.matchScore}% Match`;

  const matchTooltip = (job: any) =>
    job.matchedSkills.length
      ? "Matched: " + job.matchedSkills.map((m: any) => m.jobSkill === m.workerSkill ? m.jobSkill : `${m.jobSkill} (your ${m.workerSkill})`).join(", ")
      : undefined;

  const employerScore = (job: any) => employerScores[job?.info?.posted?._id]?.score ?? 0;

  const sortedJobs = [...enrichedJobs].sort(
    (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0) || employerScore(b) - employerScore(a),
  );

  const filteredJobs = sortedJobs.filter((job: any) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      job.info.title?.toLowerCase().includes(search) ||
      job.info.company?.toLowerCase().includes(search) ||
      job.info.location?.toLowerCase().includes(search) ||
      (job.info.tags || []).some((tag: string) =>
        tag.toLowerCase().includes(search)
      );

    const matchesScore =
      selectedMatchFilter === "all" ||
      (selectedMatchFilter === "90" && job.matchScore >= 90) ||
      (selectedMatchFilter === "70" && job.matchScore >= 70) ||
      (selectedMatchFilter === "50" && job.matchScore >= 50);

    const matchesType =
      selectedTypeFilter === "all" ||
      job.info.type === selectedTypeFilter;

    const matchesApplied =
      selectedAppliedFilter === "all" ||
      (selectedAppliedFilter === "applied" && job.IsApplied) ||
      (selectedAppliedFilter === "not-applied" && !job.IsApplied);

    return (
      matchesSearch &&
      matchesScore &&
      matchesType &&
      matchesApplied
    );
  });

  // Recommendations are for jobs still worth applying to, so applied ones are left out.
  const recommendedJobs = filteredJobs.filter(
    (job) => !job.IsApplied && (job.matchScore ?? 0) >= recommendedScore
  );


  const displayedRecommended = showAllRecommended
    ? recommendedJobs
    : recommendedJobs.slice(0, 2);

  const recommendedIdSet = new Set(recommendedJobs.map((job) => String(job.info._id)));
  const browseJobs = filteredJobs.filter((job) => !recommendedIdSet.has(String(job.info._id)));

  // Functions:
  // # ----------------------------------------------------------------------- #
  // # -                                                                     - #
  // # ----------------------------------------------------------------------- #
  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    setDetailsModalOpen(true);
  };

  const handleApplyClick = (job: any) => {
    if (isJobApplyExpired(job.info?.applyBefore)) {
      toast.error("This job is already expired. Please try another job.");
      return;
    }
    if ((job.info?.positions ?? 0) < 1) {
      toast.error("Job not available");
      return;
    }

    setJobToApply(job);

    // Jobs without listed skills can't be judged, so they skip the warning.
    if (job.matchScore === null || job.matchScore >= recommendedScore) {
      setConfirmApplyOpen(true);
    } else {
      setLowMatchWarningOpen(true);
    }
  };

  const handleApplyFromModal = () => {
    if (selectedJob) {
      setDetailsModalOpen(false);
      setJobToApply(selectedJob);
      setConfirmApplyOpen(true);
    }
  };

  const addApplication = async (jobToApply: any) => {
    return axios.post(`${API_ORIGIN}/api/pro/createApplication`, {
      job: jobToApply.info._id,
      location: jobToApply.info.location,
    }, { withCredentials: true });
  };

  const handleConfirmApply = async () => {
    if (!jobToApply) return;

    try {
      const response = await addApplication(jobToApply);

      toast.success(`Application submitted for ${jobToApply.info.title}!`, {
        description: `Your application to ${jobToApply.info.company} has been sent.`,
      });

      await queryClient.invalidateQueries({ queryKey: ["job"] });
      await queryClient.invalidateQueries({ queryKey: ["ViewApplications"] });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.info ||
        "Application failed";

      toast.error(message);
    }

    setConfirmApplyOpen(false);
    setJobToApply(null);
  };

  const renderJobCard = (job: JobRow, keyPrefix: string) => (
    <JobListingCard
      key={`${keyPrefix}-${job.info._id}`}
      job={job}
      employerScores={employerScores}
      matchLabel={matchLabel}
      matchTooltip={matchTooltip}
      onView={() => handleViewDetails(job as Job)}
      onApply={() => handleApplyClick(job)}
    />
  );

  return (
    <div>
      {/* Search Section */}
      <div className="mb-4 md:mb-5">
        <WorkerPageHeader
          title="Find your next job"
          description="Browse open roles in your area. Apply when a post matches your skills and schedule."
        />

        <form className="flex w-full max-w-3xl gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search jobs, companies, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </form>
      </div>

      {filterOpen && (
        <div className="mt-4 flex flex-wrap gap-4 p-4 border rounded-lg">
          
          <div className="relative">
            <select
              value={selectedMatchFilter}
              onChange={(e) => setSelectedMatchFilter(e.target.value)}
              className="border rounded-md px-3 py-2 pr-10 appearance-none cursor-pointer"
            >
              <option value="all">All Match Scores</option>
              <option value="90">90%+</option>
              <option value="70">70%+</option>
              <option value="50">50%+</option>
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              ▼
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="border rounded-md px-3 py-2 pr-10 appearance-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Remote">Remote</option>
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              ▼
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedAppliedFilter}
              onChange={(e) => setSelectedAppliedFilter(e.target.value)}
              className="border rounded-md px-3 py-2 pr-10 appearance-none cursor-pointer"
            >
              <option value="all">All Applications</option>
              <option value="applied">Applied</option>
              <option value="not-applied">Not Applied</option>
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              ▼
            </div>
          </div>

        </div>
      )}

      {error && !isPending && (
        <p className="text-sm text-destructive mb-4">Could not load jobs. Please refresh the page.</p>
      )}

      {!isPending && data && AllJobs.length === 0 && (
        <p className="text-muted-foreground mb-4">{data.message ?? "No jobs available right now."}</p>
      )}

      {/* Results Count */}
      {!isPending && AllJobs.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
        </p>
      )}

      {isPending && <JobListingsSkeleton />}

      {/* Job Listings */}
      {!isPending && filteredJobs.length > 0 && (
        <div className="space-y-10">
          {recommendedJobs.length > 0 ? (
            <section aria-labelledby="jobs-recommended-heading">
              <JobsSectionHeader
                id="jobs-recommended-heading"
                title="Recommended for you"
                description={`Strong skill match (${recommendedScore}% or higher), not applied yet${
                  aiMatching ? " · AI-assisted matching" : ""
                }.`}
                count={recommendedJobs.length}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayedRecommended.map((job) => renderJobCard(job, "recommended"))}
              </div>
              {recommendedJobs.length > 2 ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllRecommended(!showAllRecommended)}
                  >
                    {showAllRecommended
                      ? "Show fewer recommendations"
                      : `Show ${recommendedJobs.length - 2} more recommendations`}
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}

          {browseJobs.length > 0 ? (
            <section aria-labelledby="jobs-browse-heading">
              <JobsSectionHeader
                id="jobs-browse-heading"
                title={recommendedJobs.length > 0 ? "More open jobs" : "All open jobs"}
                description={
                  recommendedJobs.length > 0
                    ? "Other roles that match your search and filters. Recommended listings above are not repeated here."
                    : "Every open role that matches your search and filters."
                }
                count={browseJobs.length}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {browseJobs.map((job) => renderJobCard(job, "browse"))}
              </div>
            </section>
          ) : recommendedJobs.length > 0 ? (
            <p className="app-muted-text text-sm border-t border-border pt-6">
              No other listings match your filters. Adjust search or filters to see more roles.
            </p>
          ) : null}
        </div>
      )}

      {!isPending && AllJobs.length > 0 && filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No jobs found matching your search.</p>
          <Button variant="link" onClick={() => { setSearchTerm(""); }}>
            Clear search
          </Button>
        </div>
      )}

      {/* Job Details Modal */}
      <JobDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        job={selectedJob}
        onApply={handleApplyFromModal}
      />

      {/* Confirm Apply Dialog */}
      <AlertDialog open={confirmApplyOpen} onOpenChange={setConfirmApplyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to apply for <strong>{jobToApply?.info.title}</strong> at <strong>{jobToApply?.info.company}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApply}>Submit Application</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={lowMatchWarningOpen} onOpenChange={setLowMatchWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Low Match Warning</AlertDialogTitle>
            <AlertDialogDescription>
              Your skills do not strongly match this job ({jobToApply?.matchScore ?? 0}% match).
              {jobToApply?.missingSkills?.length > 0 && (
                <> Skills you don't list: <strong>{jobToApply.missingSkills.join(", ")}</strong>.</>
              )}{" "}
              Are you sure you want to continue applying?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setLowMatchWarningOpen(false);
              setJobToApply(null);
            }}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() => {
                setLowMatchWarningOpen(false);
                setConfirmApplyOpen(true);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JobListings;
