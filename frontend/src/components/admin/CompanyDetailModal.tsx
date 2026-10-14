import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Eye,
} from "lucide-react";
import { Job } from "@/lib/jobsStore";
import { useState } from "react";
import JobDetailModal from "./JobDetailModal";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

interface CompanyDetailModalProps {
  company: string;
  jobs: Job[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: string;
  onDelete: (id: string) => void;
}

const CompanyDetailModal = ({
  company,
  jobs,
  open,
  onOpenChange,
  status,
  onDelete,
}: CompanyDetailModalProps) => {
  const [jobDetailOpen, setJobDetailOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const filteredJobs =
    status === "all"
      ? jobs
      : jobs.filter(job => job.status === status);

  if (!company) return null;

  const industry = jobs[0]?.tags?.[0] || "General";
  const contactEmail = jobs.find((j) => j.contactEmail)?.contactEmail;
  const contactPhone = jobs.find((j) => j.contactPhone)?.contactPhone;

  const fetchApplicants = async (company: string) => {
    const result = await axios.get(
      `http://localhost:8920/api/admin/applications/${company}`
    );
    return result.data;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["applicants", company],
    queryFn: () => fetchApplicants(company),
    enabled: !!company,
  });


  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
            Accepted
          </Badge>
        );
      case "DECLINED":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
            Declined
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
            Pending
          </Badge>
        );
    }
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setJobDetailOpen(false);
    setSelectedJob(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <div className="bg-primary h-24 relative" />

          <div className="flex flex-col items-center -mt-10 relative z-10">
            <div className="w-20 h-20 rounded-full bg-muted border-4 border-background flex items-center justify-center shadow-md">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>

            <div className="text-center mt-2 space-y-1">
              <div className="flex items-center justify-center gap-3">
                <h3 className="font-bold text-lg">{company}</h3>
                <span className="text-sm text-muted-foreground">
                  {industry}
                </span>
              </div>

              <p className="text-sm text-muted-foreground">
                {filteredJobs.length} job{filteredJobs.length > 1 ? "s" : ""} posted
              </p>

              {contactEmail && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {contactEmail}
                </p>
              )}

              {contactPhone && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {contactPhone}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              {contactEmail && (
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Mail className="w-4 h-4" />
                </Button>
              )}

              {contactPhone && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-destructive border-destructive/30"
                >
                  <Phone className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <Separator className="mx-6 mt-4" />

          <ScrollArea className="max-h-[40vh] px-6 pb-6">
            <div className="flex gap-6 mt-4">
              <div className="flex-1 space-y-3">
                <h4 className="font-bold text-sm">Jobs Posted</h4>

                <div className="space-y-2">
                  {filteredJobs.map((job) => (
                    <div
                      key={job._id}
                      className="flex items-center justify-between bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedJob(job);
                        setJobDetailOpen(true);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {job.title}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>

                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {job.salary}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(job.status)}
                        <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-48 shrink-0">
                <div className="bg-muted/60 rounded-lg p-4 space-y-3">
                  <h4 className="font-bold text-sm">Applicants</h4>

                  <div className="space-y-2">
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground">
                        Loading...
                      </p>
                    ) : error ? (
                      <p className="text-sm text-destructive">
                        Error loading applicants
                      </p>
                    ) : data?.applications?.length ? (
                      <>
                        {data.applications
                          .slice(0, 5)
                          .map((app: any) => (
                            <div
                              key={app._id}
                              className="text-sm font-medium"
                            >
                              {app.worker?.name || "Unknown"}
                            </div>
                          ))}

                        {data.applications.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            +{data.applications.length - 5} more
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No applicants found
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <JobDetailModal
        job={selectedJob}
        open={jobDetailOpen}
        onOpenChange={(open) => {
          setJobDetailOpen(open);
          if (!open) setSelectedJob(null);
        }}
        onDelete={handleDelete}
      />
    </>
  );
};

export default CompanyDetailModal;