import { lazy, Suspense, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, MapPin, Briefcase, Clock, Building2 } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthPromptModal from "@/components/AuthPromptModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { PublicListingSkeleton } from "@/components/PublicListingSkeleton";
import { API_ORIGIN } from "@/lib/apiOrigin";
import {
  fetchPublicJobs,
  publicJobsQueryKey,
  PUBLIC_LIST_STALE_MS,
} from "@/lib/publicListings";

const LoginModal = lazy(() => import("@/components/LoginModal"));
const SignUpModal = lazy(() => import("@/components/SignUpModal"));

axios.defaults.withCredentials = true;

const parseSalary = (salary: string) => {
  const match = (salary || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k\b)?/i);
  if (!match) return 0;

  const amount = parseFloat(match[1]) * (match[2] ? 1000 : 1);

  if (/\/\s*day|daily/i.test(salary)) return amount * 22;
  if (/\/\s*week|weekly/i.test(salary)) return amount * 4;
  if (/semi[-\s]?monthly/i.test(salary)) return amount * 2;
  return amount;
};

const UTC_Converter = (createdAt: string) => {
  const splitDateAndTime = createdAt.split("T");
  const date = splitDateAndTime[0].split("-");
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return `${months[Number(date[1])]} ${date[1 + 1]}, ${date[0]}`;
};

const FindJobs = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: publicJobsQueryKey,
    queryFn: fetchPublicJobs,
    staleTime: PUBLIC_LIST_STALE_MS,
  });

  const { data: isLoggedIn = false } = useQuery({
    queryKey: ["worker-session"],
    queryFn: async () => {
      const result = await axios.get(`${API_ORIGIN}/api/pro/isWorkerLogged`, {
        withCredentials: true,
      });
      return Boolean(result.data);
    },
    staleTime: 60_000,
  });

  const jobs = data?.jobs ?? [];

  const filteredJobs = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const loc = location.toLowerCase();
    return jobs.filter((job: any) => {
      const matchesSearch =
        job.info.title.toLowerCase().includes(q) ||
        job.info.company.toLowerCase().includes(q) ||
        job.info.tags.some((tag: string) => tag.toLowerCase().includes(q));
      const matchesLocation = !location || job.info.location.toLowerCase().includes(loc);
      const matchesType = !jobType || jobType === "all" || job.info.type === jobType;
      return matchesSearch && matchesLocation && matchesType;
    });
  }, [jobs, searchTerm, location, jobType]);

  const displayedJobs = useMemo(() => {
    const sorted = [...filteredJobs].sort((a: any, b: any) => {
      const positionsA = Number(a.info.positions) || 0;
      const positionsB = Number(b.info.positions) || 0;
      const salaryA = parseSalary(a.info.salary);
      const salaryB = parseSalary(b.info.salary);
      const scoreA = positionsA * 100000 + salaryA;
      const scoreB = positionsB * 100000 + salaryB;
      return scoreB - scoreA;
    });
    return sorted.length > 10 ? sorted.slice(0, 10) : sorted;
  }, [filteredJobs]);

  const selectedJob = jobs.find((j: any) => j.info._id === selectedJobId);

  const handleApplyClick = (jobId: string) => {
    setSelectedJobId(jobId);
    if (!isLoggedIn) {
      setAuthPromptOpen(true);
    } else {
      setConfirmApplyOpen(true);
    }
  };

  const handleConfirmApply = async () => {
    if (!selectedJobId) return;
    const job = jobs.find((j: any) => j.info._id === selectedJobId);
    if (!job) return;

    try {
      const response = await axios.post(
        `${API_ORIGIN}/api/pro/createApplication`,
        { job: job.info._id, location: job.info.location },
        { withCredentials: true },
      );
      if (response.data) {
        toast.success(response.data.info);
      }
      await queryClient.invalidateQueries({ queryKey: publicJobsQueryKey });
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.info);
      }
    }

    setConfirmApplyOpen(false);
    setSelectedJobId(null);
  };

  const handleLoginSuccess = () => {
    setLoginOpen(false);
    queryClient.invalidateQueries({ queryKey: ["worker-session"] });
    toast.success("Logged in successfully!");
    if (selectedJobId) {
      setConfirmApplyOpen(true);
    }
  };

  const handleSignUpSuccess = () => {
    setSignUpOpen(false);
    queryClient.invalidateQueries({ queryKey: ["worker-session"] });
    toast.success("Account created successfully!");
    if (selectedJobId) {
      setConfirmApplyOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="bg-gradient-to-br from-primary/5 via-background to-accent/10 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Find Your Next <span className="text-primary">Opportunity</span>
            </h1>
            <p className="text-muted-foreground">
              Browse available jobs from local employers in your area
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-xl shadow-lg p-4 border">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs or skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Job Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Full-Time">Full-time</SelectItem>
                    <SelectItem value="Part-Time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          {isError && (
            <p className="text-destructive mb-4">Could not load jobs. Please refresh the page.</p>
          )}

          {!isPending && (
            <h2 className="mb-6 text-xl font-bold text-foreground">
              {filteredJobs.length > 10
                ? "Top 10 Jobs based on Salary and Positions Available"
                : `Showing ${filteredJobs.length} jobs`}
            </h2>
          )}

          {isPending ? (
            <PublicListingSkeleton variant="jobs" />
          ) : (
            <div className="grid gap-4">
              {displayedJobs.map((job: any) => (
                <Card key={job.info._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl">{job.info.title}</CardTitle>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                          <Building2 className="w-4 h-4" />
                          <span>{job.info.company}</span>
                        </div>
                      </div>
                      <Button onClick={() => handleApplyClick(job.info._id)}>Apply Now</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{job.info.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.info.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {job.info.type}
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {job.info.positions} Positions
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Posted: {UTC_Converter(job.info.createdAt)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap gap-2">
                        {job.info.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <span className="font-semibold text-primary">{job.info.salary}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isPending && filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No jobs found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />

      <AlertDialog open={confirmApplyOpen} onOpenChange={setConfirmApplyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to apply for <strong>{selectedJob?.info.title}</strong> at{" "}
              <strong>{selectedJob?.info.company}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApply}>Submit Application</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuthPromptModal
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        onLogin={() => {
          setAuthPromptOpen(false);
          setLoginOpen(true);
        }}
        onSignUp={() => {
          setAuthPromptOpen(false);
          setSignUpOpen(true);
        }}
        action="apply"
      />
      {(loginOpen || signUpOpen) && (
        <Suspense fallback={null}>
          {loginOpen && (
            <LoginModal
              open={loginOpen}
              onOpenChange={setLoginOpen}
              onSwitchToSignUp={() => {
                setLoginOpen(false);
                setSignUpOpen(true);
              }}
              onSuccess={handleLoginSuccess}
            />
          )}
          {signUpOpen && (
            <SignUpModal
              open={signUpOpen}
              onOpenChange={setSignUpOpen}
              onSwitchToLogin={() => {
                setSignUpOpen(false);
                setLoginOpen(true);
              }}
              onSuccess={handleSignUpSuccess}
            />
          )}
        </Suspense>
      )}
    </div>
  );
};

export default FindJobs;
