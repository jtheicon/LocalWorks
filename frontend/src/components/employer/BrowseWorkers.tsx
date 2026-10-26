import { API_ORIGIN } from "@/lib/apiOrigin";
import { useEffect, useState } from "react";
import CredibilityBadge, { useCredibility } from "@/components/CredibilityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Star, Briefcase, Mail, Sparkles, CheckCircle2, Flag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import ModalContact from "./ModalContact";
import ReportWorkerModal from "./ReportWorkerModal";

axios.defaults.withCredentials = true

interface SkillMatch {
  jobSkill: string;
  workerSkill: string;
  method: string;
}

interface WorkerInfo {
  _id: string;
  name: string;
  jobTitle: string;
  photo: string;
  resume?: string;
  location: string;
  yearsOfExperience: string;
  availability: string;
  skills: string[];
  rating: number;
  isVerified?: boolean;
}

interface RecommendedWorker extends WorkerInfo {
  applicationStatus: string | null;
  match: { score: number | null; matched: SkillMatch[]; missing: string[] };
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const truncate = (text: string, max = 15) => (text.length > max ? text.substring(0, max) + "..." : text);

const matchesSearch = (worker: WorkerInfo, term: string) => {
  const t = term.toLowerCase();
  return (
    worker.name.toLowerCase().includes(t) ||
    worker.jobTitle.toLowerCase().includes(t) ||
    worker.skills.some((skill) => skill.toLowerCase().includes(t))
  );
};

interface WorkerCardProps {
  worker: WorkerInfo;
  credibility: any;
  onContact: () => void;
  onReport: () => void;
  recommendation?: { worker: RecommendedWorker; recommendedScore: number };
}

const WorkerCard = ({ worker, credibility, onContact, onReport, recommendation }: WorkerCardProps) => {
  const match = recommendation?.worker.match;
  const score = match?.score ?? 0;
  const strong = recommendation && score >= recommendation.recommendedScore;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={`${API_ORIGIN}${worker.photo}`} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getInitials(worker.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{truncate(worker.name)}</CardTitle>
              {worker.isVerified && <CheckCircle2 className="w-4 h-4 text-primary" />}
            </div>
            <CardDescription className="text-base">{truncate(worker.jobTitle)}</CardDescription>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{worker.rating}</span>
            </div>
            <div className="mt-2">
              <CredibilityBadge credibility={credibility} subject="Worker" />
            </div>
          </div>
          {match && (
            <div
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-center ${
                strong ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
              }`}
            >
              <div className="text-lg font-bold leading-none">{score}%</div>
              <div className="text-[10px] mt-0.5">match</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recommendation && (
          <div className="mb-4 space-y-2 rounded-lg bg-muted/50 p-3 text-xs">
            {recommendation.worker.applicationStatus && (
              <Badge variant="secondary" className="mb-1">
                Already applied · {recommendation.worker.applicationStatus}
              </Badge>
            )}
            {match!.matched.length > 0 && (
              <p>
                <span className="font-medium text-green-600">Has: </span>
                {match!.matched
                  .map((m) => (m.method.startsWith("ai") || m.method === "partial" ? `${m.jobSkill} (via ${m.workerSkill})` : m.jobSkill))
                  .join(", ")}
              </p>
            )}
            {match!.missing.length > 0 && (
              <p>
                <span className="font-medium text-muted-foreground">Missing: </span>
                {match!.missing.join(", ")}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {truncate(worker.location)}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="w-4 h-4" />
            {worker.yearsOfExperience}
          </div>
          <div className="mt-4 mb-6">
            <CardTitle className="text-base mb-3">Availability:</CardTitle>
            <Badge variant="secondary">{worker.availability}</Badge>
          </div>
        </div>

        <div className="mt-4 mb-6">
          <CardTitle className="text-base mb-3">Skills:</CardTitle>
          <div className="flex flex-wrap gap-1">
            {worker.skills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {worker.skills.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{worker.skills.length - 3}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {worker.resume ? (
            <Button
              variant="outline"
              onClick={() => window.open(`${API_ORIGIN}/uploads/resumes/${worker.resume}`, "_blank")}
            >
              View Resume
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">No resume uploaded</p>
          )}
          <Button onClick={onContact} className="flex-1 gap-2" size="sm">
            <Mail className="w-4 h-4" />
            Contact
          </Button>
        </div>

        <div className="flex gap-2 mt-[15px] mb-[36px]">
          <Button variant="destructive" className="w-full gap-2" onClick={onReport}>
            <Flag className="w-4 h-4" />
            Report Worker
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const BrowseWorkers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [modalContact, setModalContact] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [worker, setWorker] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [jobId, setJobId] = useState("");

  // Workers already hired for this employer's jobs
  const { data, isLoading, error } = useQuery({
    queryKey: ['BrowseWorkersAx'],
    queryFn: async () => (await axios.get(`${API_ORIGIN}/api/pro/viewWorkers`, { withCredentials: true })).data
  })

  // Open jobs to recommend workers for
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["postedJobs"],
    queryFn: async () => (await axios.get(`${API_ORIGIN}/api/pro/viewPostedJobs`)).data,
  });
  const openJobs: { _id: string; title: string }[] = (jobsData?.jobs ?? []).filter((j: any) => j.status === "ACCEPTED");

  useEffect(() => {
    if (!jobId && openJobs.length) setJobId(openJobs[0]._id);
  }, [jobId, openJobs]);

  const { data: recommendedData, isFetching: recommendedLoading, error: recommendedError } = useQuery({
    queryKey: ["recommendedWorkers", jobId],
    queryFn: async () => (await axios.get(`${API_ORIGIN}/api/pro/recommendedWorkers/${jobId}`)).data,
    enabled: !!jobId,
  });

  const hiredWorkers: WorkerInfo[] = data?.workers ?? [];
  const recommendedWorkers: RecommendedWorker[] = recommendedData?.workers ?? [];
  const recommendedScore: number = recommendedData?.matching?.recommendedScore ?? 50;
  const aiStatus: string | undefined = recommendedData?.matching?.ai;

  const { data: workerScores = {} } = useCredibility(
    "worker",
    [...new Set([...hiredWorkers, ...recommendedWorkers].map((w) => w._id))]
  )

  const shownHired = hiredWorkers.filter((w) => matchesSearch(w, searchTerm));
  const shownRecommended = recommendedWorkers.filter((w) => matchesSearch(w, searchTerm));

  const cardHandlers = (w: WorkerInfo) => ({
    onContact: () => { setModalContact(true); setWorker(w._id) },
    onReport: () => { setSelectedWorkerId(w._id); setReportOpen(true) },
  });

  return (
    <div>
      {/* Search Section */}
      <div className="mb-6 relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search by name, job title, or skills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="recommended">
        <TabsList className="mb-6">
          <TabsTrigger value="recommended" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Recommended for my jobs
          </TabsTrigger>
          <TabsTrigger value="hired">My Workers</TabsTrigger>
        </TabsList>

        <TabsContent value="recommended">
          {jobsLoading ? (
            <div>Loading...</div>
          ) : !openJobs.length ? (
            <p className="text-muted-foreground">
              You have no open (live) jobs yet. Once a job post is approved, workers matching it will be recommended here.
            </p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <span className="text-sm font-medium">Recommend workers for:</span>
                <Select value={jobId} onValueChange={setJobId}>
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Choose a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {openJobs.map((job) => (
                      <SelectItem key={job._id} value={job._id}>{job.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {recommendedData?.job && (
                <div className="mb-6 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>Skills needed:</span>
                    {recommendedData.job.skills.map((skill: string) => (
                      <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                  <p className="mt-2">
                    Ranked by how many of these skills each worker has
                    {aiStatus === "on" && " · AI-assisted matching (understands synonyms and related trades)"}
                    {aiStatus === "unavailable" && " · AI matching is busy, showing rule-based matches for now"}
                  </p>
                </div>
              )}

              {recommendedLoading ? (
                <div className="text-muted-foreground">Finding matching workers...</div>
              ) : recommendedError ? (
                <div>Error: {(recommendedError as any)?.response?.data?.message || recommendedError.message}</div>
              ) : !shownRecommended.length ? (
                <p className="text-muted-foreground text-center py-12">
                  {searchTerm ? "No recommended workers match your search." : "No workers with matching skills yet."}
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Showing {shownRecommended.length} matching worker{shownRecommended.length !== 1 ? "s" : ""}
                  </p>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {shownRecommended.map((w) => (
                      <WorkerCard
                        key={w._id}
                        worker={w}
                        credibility={workerScores[w._id]}
                        recommendation={{ worker: w, recommendedScore }}
                        {...cardHandlers(w)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="hired">
          {isLoading ? (
            <div>Loading...</div>
          ) : error ? (
            <div>Error: {error.message}</div>
          ) : !hiredWorkers.length ? (
            <p className="text-muted-foreground">No hired workers yet.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Showing {shownHired.length} worker{shownHired.length !== 1 ? "s" : ""}
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {shownHired.map((w) => (
                  <WorkerCard key={w._id} worker={w} credibility={workerScores[w._id]} {...cardHandlers(w)} />
                ))}
              </div>
              {shownHired.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">No workers found matching your search.</p>
                  <Button variant="link" onClick={() => setSearchTerm("")}>Clear search</Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <ModalContact open={modalContact} onOpenChange={setModalContact} worker={worker} />

      <ReportWorkerModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        workerId={selectedWorkerId}
      />
    </div>
  );
};

export default BrowseWorkers;
