import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Phone,
  Mail,
  Briefcase,
  FileText,
  Pencil,
  UserCircle,
  Banknote,
  Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_ORIGIN } from "@/lib/apiOrigin";
import { workerAccountStatusLabel, type WorkerAccountInsight } from "@/lib/workerAccountStatus";
import WorkerPageHeader from "@/components/worker/WorkerPageHeader";

axios.defaults.withCredentials = true;

interface WorkerProfileProps {
  onEdit: () => void;
}

const displayText = (value: unknown, empty = "Not set") => {
  const text = String(value ?? "").trim();
  if (!text || text.toUpperCase() === "N/A") return empty;
  return text;
};

const ProfileField = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) => (
  <div className="flex gap-3 min-w-0">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="app-body-text break-words">{value}</p>
    </div>
  </div>
);

const MetricTile = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-semibold text-foreground tabular-nums">{value}</p>
  </div>
);

const WorkerProfile = ({ onEdit }: WorkerProfileProps) => {
  const viewProfile = async () => {
    const { data } = await axios.get(`${API_ORIGIN}/api/pro/worker/profile`, {
      withCredentials: true,
    });
    return data;
  };

  const { data, error, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: viewProfile,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <WorkerPageHeader title="Your profile" description="Loading your information…" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Could not load your profile. Try refreshing the page.
      </div>
    );
  }

  const { WorkerProf, accountInsight, Applications, Interviews } = data as {
    WorkerProf: Record<string, unknown> & { name: string; skills: string[]; photo?: string; resume?: string };
    accountInsight?: WorkerAccountInsight;
    Applications: number;
    Interviews: number;
  };

  const standing = accountInsight ? workerAccountStatusLabel(accountInsight) : null;
  const initials = WorkerProf.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();

  const about = displayText(WorkerProf.about_me, "You have not added a short bio yet. Use Edit profile to tell employers about yourself.");
  const hasResume = Boolean(WorkerProf.resume);

  return (
    <div className="app-dashboard-stack w-full">
      <WorkerPageHeader
        title="Your profile"
        description="What employers see when you apply. Keep this up to date so they can reach you and understand your skills."
      />

      {/* Identity */}
      <Card>
        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={`${API_ORIGIN}/uploads/profile/${WorkerProf.photo}`} alt="" />
              <AvatarFallback className="bg-primary text-lg text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{WorkerProf.name}</h2>
                  <p className="text-sm text-muted-foreground">{displayText(WorkerProf.jobTitle, "Job title not set")}</p>
                  {standing && (
                    <Badge variant="outline" className={`mt-2 ${standing.className}`}>
                      {standing.label}
                    </Badge>
                  )}
                </div>
                <Button type="button" variant="outline" className="shrink-0 gap-2" onClick={onEdit}>
                  <Pencil className="h-4 w-4" />
                  Edit profile
                </Button>
              </div>

              {standing && (
                <p className="text-sm text-muted-foreground leading-relaxed">{standing.detail}</p>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-5 sm:grid-cols-2">
            <ProfileField icon={Mail} label="Email" value={displayText(WorkerProf.email)} />
            <ProfileField icon={Phone} label="Phone" value={displayText(WorkerProf.phoneNumber)} />
            <ProfileField icon={MapPin} label="Location" value={displayText(WorkerProf.location)} />
            <ProfileField
              icon={Briefcase}
              label="Experience"
              value={displayText(WorkerProf.yearsOfExperience, "Not specified")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Activity + preferences — separate numeric vs text so the layout is scannable */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Application activity</CardTitle>
            <CardDescription>Summary from your LocalWorks applications</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <MetricTile label="Jobs applied" value={Applications ?? 0} />
            <MetricTile label="Interviews" value={Interviews ?? 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Work preferences</CardTitle>
            <CardDescription>What you shared for matching and offers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Availability</p>
                <p className="text-sm font-medium text-foreground">{displayText(WorkerProf.availability)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Banknote className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Expected pay</p>
                <p className="text-sm font-medium text-foreground">{displayText(WorkerProf.expected_salary)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">About you</CardTitle>
          <CardDescription>A short introduction for employers</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="app-muted-text whitespace-pre-wrap">{about}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Skills</CardTitle>
          <CardDescription>Used to match you with job posts</CardDescription>
        </CardHeader>
        <CardContent>
          {WorkerProf.skills?.length ? (
            <div className="flex flex-wrap gap-2">
              {WorkerProf.skills.map((skill) => (
                <Badge key={skill} variant="outline" className="font-normal">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No skills listed yet. Add them in Edit profile.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Resume</CardTitle>
          <CardDescription>PDF uploaded during registration or profile edit</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3 items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {hasResume ? "Resume on file" : "No resume uploaded"}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasResume
                  ? "Open your resume in a new tab to review or share."
                  : "Upload a resume in Edit profile so employers can review your experience."}
              </p>
            </div>
          </div>
          {hasResume ? (
            <Button asChild variant="default" className="shrink-0 gap-2">
              <a
                href={`${API_ORIGIN}/uploads/resumes/${WorkerProf.resume}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-4 w-4" />
                View resume
              </a>
            </Button>
          ) : (
            <Button type="button" variant="outline" className="shrink-0 gap-2" onClick={onEdit}>
              <UserCircle className="h-4 w-4" />
              Add resume
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkerProfile;
