import { useState } from "react";
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
import { Search, MapPin, Briefcase, Clock, Building2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoginModal from "@/components/LoginModal";
import SignUpModal from "@/components/SignUpModal";
import AuthPromptModal from "@/components/AuthPromptModal";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

axios.defaults.withCredentials = true

const FindJobs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<number[]>([]);
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const parseSalary = (salary: string) => {
    // handles formats like "50,000", "₱50,000", "50k", "₱600/day", "₱3,500/week", "₱7,500/semi-monthly"
    const match = (salary || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k\b)?/i);
    if (!match) return 0;

    const amount = parseFloat(match[1]) * (match[2] ? 1000 : 1);

    // Normalize to a monthly figure so daily/weekly rates rank fairly against monthly ones.
    if (/\/\s*day|daily/i.test(salary)) return amount * 22;
    if (/\/\s*week|weekly/i.test(salary)) return amount * 4;
    if (/semi[-\s]?monthly/i.test(salary)) return amount * 2;
    return amount;
  };

  const findJobs = async () => {
    const result = await axios.get("http://localhost:8920/api/auth/jobs")
    return result.data
  }

  const isLogged = async () => {
    const result = await axios.get("http://localhost:8920/api/pro/isWorkerLogged", { withCredentials: true })
    if (!result.data) {
      setIsLoggedIn(
        false
      )
    } else {
      setIsLoggedIn(
        true
      )
    }
  }

  isLogged()

  const { data, isLoading, error } = useQuery({
    queryKey: ['findJobs'],
    queryFn: findJobs
  })

  const styleCenter = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "40px"
  }

  if (error) return <div style={styleCenter}>Error: {error.message}</div>
  if (isLoading) return <div style={styleCenter}>Loading...</div>

  const { jobs } = data

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.info.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.info.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.info.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocation = !location || job.info.location.toLowerCase().includes(location.toLowerCase());
    const matchesType = !jobType || jobType === "all" || job.info.type === jobType;
    return matchesSearch && matchesLocation && matchesType;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const positionsA = Number(a.info.positions) || 0;
    const positionsB = Number(b.info.positions) || 0;

    const salaryA = parseSalary(a.info.salary);
    const salaryB = parseSalary(b.info.salary);

    // combine score
    const scoreA = positionsA * 100000 + salaryA;
    const scoreB = positionsB * 100000 + salaryB;

    return scoreB - scoreA;
  });

  const displayedJobs =
  sortedJobs.length > 10 ? sortedJobs.slice(0, 10) : sortedJobs;

  const handleApplyClick = (jobId: number) => {
    if (!isLoggedIn) {
      setSelectedJobId(jobId);
      setAuthPromptOpen(true);
    } else {
      setSelectedJobId(jobId);
      setConfirmApplyOpen(true);
    }
  };

  const handleConfirmApply = async () => {
    if (selectedJobId) {
      setAppliedJobs([...appliedJobs, selectedJobId]);
      const job = jobs.find(j => j.info._id === selectedJobId);
      await axios.post("http://localhost:8920/api/pro/createApplication", { job: job.info._id, location: job.info.location }, { withCredentials: true })
        .then(function (response) {
          if (response.data) {
            toast.success(response.data.info)
          }
        })
        .catch(function (error) {
          if (error.response) {
            toast.error(error.response.data.info)
          }
        })
    }
    setConfirmApplyOpen(false);
    setSelectedJobId(null);
  };

  const handleChooseLogin = () => {
    setAuthPromptOpen(false);
    setLoginOpen(true);
  };

  const handleChooseSignUp = () => {
    setAuthPromptOpen(false);
    setSignUpOpen(true);
  };

  const handleSwitchToSignUp = () => {
    setLoginOpen(false);
    setSignUpOpen(true);
  };

  const handleSwitchToLogin = () => {
    setSignUpOpen(false);
    setLoginOpen(true);
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setLoginOpen(false);
    toast.success("Logged in successfully!");
    // If there was a pending job application, show confirmation
    if (selectedJobId) {
      setConfirmApplyOpen(true);
    }
  };

  const handleSignUpSuccess = () => {
    setIsLoggedIn(true);
    setSignUpOpen(false);
    toast.success("Account created successfully!");
    // If there was a pending job application, show confirmation
    if (selectedJobId) {
      setConfirmApplyOpen(true);
    }
  };

  const selectedJob = jobs.find(j => j.info._id === selectedJobId);

  const UTC_Converter = (createdAt) => {
    const splitDateAndTime = createdAt.split("T")
    const date = splitDateAndTime[0].split("-")
    const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    return months[Number(date[1])] + " " + date[1+1] + ", " + date[0]
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
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

          {/* Search Filters */}
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

      {/* Job Listings */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* If there are more than 10 jobs, then it should only show Top 10 jobs based on salary and positions available */}
          <h1 className="mb-6 text-xl font-bold text-foreground">
            {filteredJobs.length > 10
              ? `Top 10 Jobs based on Salary and Positions Available`
              : `Showing ${filteredJobs.length} jobs`}
          </h1>

          <div className="grid gap-4">
            {!filteredJobs.length ? <div>No Jobs</div> : displayedJobs.map((job) => {
              return (
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
                      {/* {isApplied ? (
                        <Button variant="outline" disabled className="gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Applied
                        </Button>
                      ) : (
                        <Button onClick={() => handleApplyClick(job._id)}>Apply Now</Button>
                      )} */}

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
                        {job.info.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <span className="font-semibold text-primary">{job.info.salary}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No jobs found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />

      {/* Confirm Apply Dialog */}
      <AlertDialog open={confirmApplyOpen} onOpenChange={setConfirmApplyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to apply for <strong>{selectedJob?.info.title}</strong> at <strong>{selectedJob?.info.company}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApply}>Submit Application</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auth Modals */}
      <AuthPromptModal
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        onLogin={handleChooseLogin}
        onSignUp={handleChooseSignUp}
        action="apply"
      />
      <LoginModal 
        open={loginOpen} 
        onOpenChange={setLoginOpen} 
        onSwitchToSignUp={handleSwitchToSignUp}
        onSuccess={handleLoginSuccess}
      />
      <SignUpModal 
        open={signUpOpen} 
        onOpenChange={setSignUpOpen} 
        onSwitchToLogin={handleSwitchToLogin}
        onSuccess={handleSignUpSuccess}
      />
    </div>
  );
};

export default FindJobs;