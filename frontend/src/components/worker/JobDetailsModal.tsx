import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Building2,
  Clock,
  PhilippinePeso,
  Briefcase,
  Users,
  Calendar,
  CheckCircle
} from "lucide-react";
import { Flag } from "lucide-react";
import { useState } from "react";
import ReportEmployerModal from "./ReportEmployerModal";
import { isJobApplyExpired } from "@/lib/workerJobApply";

interface Job {
  info: {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    type: string;
    posted: {
      _id: string;
      email: string;
    };
    description: string;
    tags: string[];
    requirements: string[];
    benefits: string[];
    schedule: string;
    startDate: string;
    positions: number;
    applyBefore: string;
    email: string;
    phone: string;
  },
  IsApplied: boolean
}

interface JobDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  onApply?: () => void;
}

// Mock extended job data
const getExtendedJobDetails = (job: Job) => ({
  ...job
});

const JobDetailsModal = ({
  open,
  onOpenChange,
  job,
  onApply,
}: JobDetailsModalProps) => {
  const [reportOpen, setReportOpen] = useState(false);

  if (!job) return null;

  const extendedJob = getExtendedJobDetails(job);
  const isExpired = isJobApplyExpired(extendedJob.info.applyBefore);
  const isFull = (extendedJob.info.positions ?? 0) < 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto gap-5">
        <DialogTitle className="sr-only">Job Details</DialogTitle>

        {/* Header */}
        <div className="space-y-4 pr-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h2 className="text-2xl font-bold leading-tight">{extendedJob.info.title}</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4 shrink-0" />
                <span>{extendedJob.info.company}</span>
              </div>
            </div>
            <Badge variant={extendedJob.info.type === "Full-Time" ? "default" : "secondary"} className="shrink-0">
              {extendedJob.info.type}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              {extendedJob.info.location}
            </div>
            <div className="flex items-center gap-2">
              <PhilippinePeso className="w-4 h-4 shrink-0" />
              {extendedJob.info.salary}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              Posted: {extendedJob.info.posted.email}
            </div>
          </div>
        </div>

        <Separator />

        {/* Description */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Job Description
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{extendedJob.info.description}</p>
        </div>

        <Separator />

        {/* Requirements */}
        <div>
          <h3 className="font-semibold mb-3">Requirements</h3>
          <ul className="space-y-2">
            {extendedJob.info.requirements.map((req, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Benefits */}
        <div>
          <h3 className="font-semibold mb-3">Benefits</h3>
          <ul className="space-y-2">
            {extendedJob.info.benefits.map((benefit, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Job Details Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Schedule</p>
              <p className="font-medium">{extendedJob.info.schedule}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Start Date</p>
              <p className="font-medium">{extendedJob.info.startDate}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Positions Available</p>
              <p className="font-medium">{extendedJob.info.positions}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Apply Before</p>
              <p className="font-medium">{extendedJob.info.applyBefore}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Skills/Tags */}
        <div>
          <h3 className="font-semibold mb-3">Skills & Tags</h3>
          <div className="flex flex-wrap gap-2">
            {extendedJob.info.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Apply Button */}
        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="destructive"
            size="lg"
            className="w-full gap-2"
            onClick={() => setReportOpen(true)}
          >
            <Flag className="w-4 h-4" />
            Report Employer
          </Button>

          {extendedJob.IsApplied ? (
            <Button disabled size="lg" className="w-full gap-2">
              <CheckCircle className="w-4 h-4" />
              Already Applied
            </Button>
          ) : isExpired || isFull ? (
            <Button disabled size="lg" variant="outline" className="w-full">
              {isExpired ? "Expired" : "Closed - No Positions Available"}
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={onApply}
            >
              Apply Now
            </Button>
          )}
        </div>
      </DialogContent>

      <ReportEmployerModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        employerId={extendedJob.info.posted._id}
        jobId={extendedJob.info.id}
      />
    </Dialog>
  );
};

export default JobDetailsModal;
