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
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText
} from "lucide-react";

interface Application {
  id: string;
  worker: string;
  job: {
    title: string;
    company: string;
    location: string;
    appliedDate: string;
    description: string;
    email: string;
    phone: string;
    salary: string;
  },
  location: {
    name: string;
  };
  status: string;
  interviewDate?: string;
  createdAt: string;
}

interface ApplicationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onWithdraw?: () => void;
}

const UTC_Converter = (createdAt) => {
  const splitDateAndTime = createdAt.split("T")
  const date = splitDateAndTime[0].split("-")
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  
  return months[Number(date[1])] + " " + date[1+1] + ", " + date[0]
}

const getStatusInfo = (status: string) => {
  switch (status) {
    case "Pending Review":
      return { 
        label: "Pending Review", 
        icon: <Clock className="w-5 h-5" />,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 dark:bg-yellow-950",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        description: "Your application is being reviewed by the employer. You'll be notified once they make a decision."
      };
    case "Interview Scheduled":
      return { 
        label: "Interview Scheduled", 
        icon: <Calendar className="w-5 h-5" />,
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950",
        borderColor: "border-blue-200 dark:border-blue-800",
        description: "Congratulations! The employer wants to interview you. Check the interview details below."
      };
    case "Accepted":
      return { 
        label: "Accepted", 
        icon: <CheckCircle className="w-5 h-5" />,
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950",
        borderColor: "border-green-200 dark:border-green-800",
        description: "Great news! Your application has been accepted. The employer will contact you with next steps."
      };
    case "Not Selected":
      return { 
        label: "Not Selected", 
        icon: <XCircle className="w-5 h-5" />,
        color: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950",
        borderColor: "border-red-200 dark:border-red-800",
        description: "Unfortunately, your application was not selected for this position. Don't give up – keep applying!"
      };
    default:
      return { 
        label: status, 
        icon: <AlertCircle className="w-5 h-5" />,
        color: "text-muted-foreground",
        bgColor: "bg-muted",
        borderColor: "border-border",
        description: "Status information unavailable."
      };
  }
};

// Mock extended application data
const getExtendedApplicationDetails = (application: Application) => ({
  ...application,
  jobType: "Full-time",
  jobDescription: "Looking for dedicated professionals to join our team. This role requires attention to detail and strong work ethic.",
  timeline: [
    { date: application.createdAt, event: "Application Submitted", completed: true },
    { date: "In Progress", event: "Application Review", completed: application.status !== "Pending Review" },
    { date: application.interviewDate || "N/A", event: "Interview Scheduled", completed: application.status === "Accepted" || application.status === "Not Selected" },
    { date: application.status === "Accepted" || application.status === "Not Selected" ? application.status : "Pending", event: "Final Decision", completed: application.status === "Accepted" || application.status === "Not Selected" },
  ],
  contactEmail: "hr@" + application.job.company.toLowerCase().replace(/\s+/g, "") + ".com",
  contactPhone: "+63 912 345 6789",
});

const ApplicationDetailsModal = ({
  open,
  onOpenChange,
  application,
  onWithdraw,
}: ApplicationDetailsModalProps) => {
  if (!application) return null;

  const extendedApp = getExtendedApplicationDetails(application);
  const statusInfo = getStatusInfo(application.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Application Details</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">{extendedApp.job.title}</h2>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <Building2 className="w-4 h-4" />
            <span className="text-lg">{extendedApp.job.company}</span>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {extendedApp.location.name}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Applied: {UTC_Converter(extendedApp.createdAt)}
            </div>
            <span className="font-medium text-foreground">
              {extendedApp.job.salary}
            </span>
          </div>
        </div>

        {/* Status Card */}
        <div className={`rounded-lg p-4 border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
          <div className={`flex items-center gap-2 ${statusInfo.color} font-semibold mb-2`}>
            {statusInfo.icon}
            {statusInfo.label}
          </div>
          <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
          
          {application.status === "interview" && application.interviewDate && (
            <div className="mt-3 p-3 bg-background rounded-md border">
              <p className="text-sm font-medium">Interview Date:</p>
              <p className="text-lg font-semibold text-primary">{application.interviewDate}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Application Timeline */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Application Timeline
          </h3>
          <div className="space-y-4">
            {extendedApp.timeline.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  step.completed 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step.completed ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${step.completed ? "" : "text-muted-foreground"}`}>
                    {step.event}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Job Description */}
        <div>
          <h3 className="font-semibold mb-2">Job Description</h3>
          <p className="text-sm text-muted-foreground">{extendedApp.job.description}</p>
        </div>

        <Separator />

        {/* Contact Information */}
        <div>
          <h3 className="font-semibold mb-3">Employer Contact</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{extendedApp.job.email}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Phone:</span>{" "}
              <span className="font-medium">{extendedApp.job.phone}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {application.status === "pending" && (
          <>
            <Separator />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={onWithdraw}
              >
                Withdraw Application
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationDetailsModal;
