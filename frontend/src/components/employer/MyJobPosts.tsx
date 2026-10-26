import { API_ORIGIN } from "@/lib/apiOrigin";
import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Pencil, PhilippinePeso, Users } from "lucide-react";
import PostJobModal, { EditableJob } from "@/components/employer/PostJobModal";

axios.defaults.withCredentials = true;

interface PostedJob extends EditableJob {
  status: string;
  createdAt: string;
  verification?: { reasons?: string[] } | null;
}

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACCEPTED: { label: "Live", variant: "default" },
  PENDING: { label: "Being checked", variant: "secondary" },
  DECLINED: { label: "Declined", variant: "destructive" },
};

// The employer's own job posts, each editable (e.g. to fix a typo).
const MyJobPosts = () => {
  const [editing, setEditing] = useState<PostedJob | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["postedJobs"],
    queryFn: async () => {
      const { data } = await axios.get(`${API_ORIGIN}/api/pro/viewPostedJobs`);
      return data;
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occured</div>;

  const jobs: PostedJob[] = (data?.jobs || []).filter((job: PostedJob) => job.status !== "DELETED");
  if (!jobs.length) return <p className="text-muted-foreground">You haven't posted any jobs yet.</p>;

  return (
    <div className="grid gap-4">
      {jobs.map((job) => {
        const status = STATUS[job.status] ?? { label: job.status, variant: "outline" as const };
        return (
          <Card key={job._id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <CardDescription className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <PhilippinePeso className="w-4 h-4" />
                      {job.salary}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {job.positions} position{job.positions !== 1 ? "s" : ""}
                    </span>
                  </CardDescription>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {(job.tags || []).map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>

              {/* Posts the automated check held for an admin stay "Being checked" with its reasons. */}
              {job.status !== "ACCEPTED" && job.verification?.reasons?.length ? (
                <p className="text-sm text-destructive mb-4">
                  Why it was held: {job.verification.reasons.join("; ")}
                </p>
              ) : null}

              <Button variant="outline" className="gap-2" onClick={() => setEditing(job)}>
                <Pencil className="w-4 h-4" />
                Edit
              </Button>
            </CardContent>
          </Card>
        );
      })}

      <PostJobModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        job={editing}
      />
    </div>
  );
};

export default MyJobPosts;
