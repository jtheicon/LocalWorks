import { useState, useEffect } from "react";
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
import { Search, MapPin, DollarSign, Clock, Building2, Filter, CheckCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import JobDetailsModal from "./JobDetailsModal";
import { useJobsStore, Job } from "@/lib/jobsStore";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
axios.defaults.withCredentials = true;


const UTC_Converter = (createdAt) => {
  const splitDateAndTime = createdAt.split("T")
  const date = splitDateAndTime[0].split("-")
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  
  return months[Number(date[1])] + " " + date[1+1] + ", " + date[0]
}


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


  // Match score:
  const MATCH_THRESHOLD = 40;


  // A function for returning the jobs:
  const Jobs = async () => {
    const { data } = await axios.get("http://localhost:8920/api/pro/viewJobs", {
      withCredentials: true
    })

    return data
  }

  // A function for returning the user information:
  const UserProfile = async () => {
    const { data } = await axios.get("http://localhost:8920/api/pro/worker/profile", {
      withCredentials: true
    })

    return data
  }

  // Display all jobs:
  // # ----------------------------------------------------------------------- #
  // # - The purpose of this useQuery function is to display all the jobs    - #
  // # ----------------------------------------------------------------------- #
  const { data, error, isLoading } = useQuery({
    queryKey: ['job'],
    queryFn: Jobs
  })




  // Display user information for job matching based on the user skill:
  // # ----------------------------------------------------------------------- #
  // # - The purpose of this useQuery function is to display user info       - #
  // # ----------------------------------------------------------------------- #
  const { data: userData, error: userError, isLoading: userLoading } = useQuery({
    queryKey: ['userQueryKey'],
    queryFn: UserProfile
  })



  // Load the jobs and user information:
  if (isLoading || userLoading) return <div>Loading...</div>;
  if (error || userError) return <div>An error occured</div>;

  // Store the jobs inside the AllJobs variable:
  const AllJobs = data.jobs
  if (!AllJobs.length) return <div>{data.message}</div>

  // Store the jobs inside the AllJobs variable:
  const UserInfo = userData?.WorkerProf


  // The remaining code:
  // # ----------------------------------------------------------------------- #
  // # -                                                                     - #
  // # ----------------------------------------------------------------------- #
  const normalize = (str) =>
  (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ""); // collapse all separators

  const calculateMatchScore = (userSkills, jobTags) => {
    const user = (userSkills || []).map(normalize);
    const required = (jobTags || []).map(normalize);

    const matched = required.filter(skill => user.includes(skill));

    const score = required.length
      ? (matched.length / required.length) * 100
      : 0;

    return {
      score: Math.round(score),
      matchedSkills: matched,
      missingSkills: required.filter(skill => !user.includes(skill))
    };
  };

  const enrichedJobs = (AllJobs || []).map(job => {
    const result = calculateMatchScore(
      userData?.WorkerProf?.skills || [],
      job?.info?.tags || []
    );

    return {
      ...job,
      matchScore: result.score,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills
    };
  });

  const sortedJobs = [...enrichedJobs].sort(
    (a, b) => (b.matchScore || 0) - (a.matchScore || 0)
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

  const recommendedJobs = filteredJobs.filter(
    (job) => (job.matchScore || 0) >= 50
  );


  const displayedRecommended = showAllRecommended
    ? recommendedJobs
    : recommendedJobs.slice(0, 2);



  // Functions:
  // # ----------------------------------------------------------------------- #
  // # -                                                                     - #
  // # ----------------------------------------------------------------------- #
  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    setDetailsModalOpen(true);
  };

  const handleApplyClick = (job: any) => {
    setJobToApply(job);

    const score = job.matchScore || 0;

    if (score >= 70) {
      setConfirmApplyOpen(true);
    } 
    else if (score >= MATCH_THRESHOLD) {
      setConfirmApplyOpen(true);
    } 
    else {
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
    return axios.post("http://localhost:8920/api/pro/createApplication", {
      job: jobToApply.info._id,
      location: jobToApply.info.location,
    });
  };

  const handleConfirmApply = async () => {
    if (!jobToApply) return;

    try {
      const response = await addApplication(jobToApply);

      toast.success(`Application submitted for ${jobToApply.info.title}!`, {
        description: `Your application to ${jobToApply.info.company} has been sent.`,
      });

      await queryClient.invalidateQueries({ queryKey: ["job"] });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Application failed";

      toast.error(message);
    }

    setConfirmApplyOpen(false);
    setJobToApply(null);
  };

  return (
    <div>
      {/* Search Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Find Your Next Job</h2>
        <p className="text-muted-foreground mb-6">Browse available job openings in your area</p>
        
        <form className="flex gap-2 max-w-2xl">
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

      {/* Results Count */}
      <p className="text-sm text-muted-foreground mb-4">
        Showing {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
      </p>

      {/* Job Listings */}
      <div className="grid gap-4">
        {/* Recommended Jobs */}
        {recommendedJobs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Recommended For You</h3>
                <p className="text-sm text-muted-foreground">
                  Jobs matching your skills above 50%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedRecommended.map((job: any) => (
                <Card
                  key={`recommended-${job.info._id}`}
                  className="hover:shadow-md transition-shadow flex flex-col"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg line-clamp-1">
                          {job.info.title}
                        </CardTitle>

                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Building2 className="w-4 h-4" />
                          {job.info.company}
                        </CardDescription>
                      </div>

                      <Badge>
                        {job.matchScore}% Match
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.info.location}
                      </span>

                      <span>
                        {job.info.salary}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {(job.info.tags || []).slice(0, 3).map((tag: any) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-6 mt-auto">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewDetails(job)}
                      >
                        View
                      </Button>

                      {job.IsApplied ? (
                        <Button disabled size="sm" className="flex-1">
                          Applied
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleApplyClick(job)}
                        >
                          Apply
                        </Button>
                      )}

                                            {job.Accepted ? (
                        <Button disabled size="sm" className="flex-1">
                          You have been accepted at this job
                        </Button>
                      ) : (
                        <div></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {recommendedJobs.length > 2 && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setShowAllRecommended(!showAllRecommended)}
            >
              {showAllRecommended
                ? "Show Less"
                : `View ${recommendedJobs.length - 2} More Jobs`}
            </Button>
          </div>
        )}

        
        {filteredJobs.map((job: any) => {
          return (
            <Card key={job.info._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl mb-1">
                      {job.info.title}
                    </CardTitle>

                    <CardDescription className="flex items-center gap-2 text-base">
                      <Building2 className="w-4 h-4" />
                      {job.info.company}
                    </CardDescription>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge>
                      {(job.matchScore || 0)}% Match
                    </Badge>

                    <Badge variant={job.info.type === "Full-Time" ? "default" : "secondary"}>
                      {job.info.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{job.info.description}</p>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.info.location}
                  </span>
                  <span className="flex items-center gap-1">
                    {job.info.salary}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Posted: {UTC_Converter(job.info.createdAt)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(job.info.tags || []).map((tag: any) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    className="gap-2"
                    onClick={() => handleViewDetails(job)}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                  {job.IsApplied ? (
                    <Button disabled className="gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Applied
                    </Button>
                  ) : (
                    <Button onClick={() => handleApplyClick(job)}>Apply Now</Button>
                  )}
                                    {job.Accepted ? (
                    <Button disabled className="gap-2">
                      <CheckCircle className="w-4 h-4" />
                      You have been accepted at this job
                    </Button>
                  ) : (
                    <div></div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredJobs.length === 0 && (
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
              Your skills do not strongly match this job. Are you sure you want to continue applying?
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
