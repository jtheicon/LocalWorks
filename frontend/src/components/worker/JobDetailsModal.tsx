import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Building2, 
  Clock,
  DollarSign,
  Briefcase,
  Users,
  Calendar,
  CheckCircle
} from "lucide-react";
import { Flag } from "lucide-react";
import { useState } from "react";
import ReportEmployerModal from "./ReportEmployerModal";

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
  if (!job) return null;

  const extendedJob = getExtendedJobDetails(job);

  const [reportOpen, setReportOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Job Details</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{extendedJob.info.title}</h2>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Building2 className="w-4 h-4" />
                <span className="text-lg">{extendedJob.info.company}</span>
              </div>
            </div>
            <Badge variant={extendedJob.info.type === "Full-Time" ? "default" : "secondary"}>
              {extendedJob.info.type}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {extendedJob.info.location}
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {extendedJob.info.salary}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Posted: {extendedJob.info.posted.email}
            </div>
          </div>
        </div>

        <Separator />

        {/* Description */}
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Job Description
          </h3>
          <p className="text-muted-foreground">{extendedJob.info.description}</p>
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
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Schedule</p>
              <p className="font-medium">{extendedJob.info.schedule}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Start Date</p>
              <p className="font-medium">{extendedJob.info.startDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Positions Available</p>
              <p className="font-medium">{extendedJob.info.positions}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
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
        <div className="pt-4 space-y-2">

          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={() => setReportOpen(true)}
          >
            <Flag className="w-4 h-4" />
            Report Employer
          </Button>


          {extendedJob.IsApplied ? (
            <Button disabled className="w-full gap-2">
              <CheckCircle className="w-4 h-4" />
              Already Applied
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
