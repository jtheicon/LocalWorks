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
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import axios from "axios";

interface Application {
  _id: string;
  worker: string;
  job: {
    _id: string;
    title: string;
    company: string;
    posted: string;
    location: string;
    appliedDate: string;
    description: string;
    email: string;
    phone: string;
    salary: string;
  }
  status: string;
  interviewDate?: string;
  createdAt: string;
}

interface ApplicationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  ReasonsList;
  SetTitle;
  SetDescription;
  SetReasonsList;
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
    { date: UTC_Converter(application.createdAt), event: "Application Submitted", completed: true },
    { date: "In Progress", event: "Application Review", completed: application.status !== "Pending Review" },
    { date: application.interviewDate || "N/A", event: "Interview Scheduled", completed: application.status === "Accepted" || application.status === "Not Selected" },
    { date: application.status === "Accepted" || application.status === "Not Selected" ? application.status : "Pending", event: "Final Decision", completed: application.status === "Accepted" || application.status === "Not Selected" },
  ],
  contactEmail: "hr@" + application.job.company.toLowerCase().replace(/\s+/g, "") + ".com",
  contactPhone: "+63 912 345 6789",
});

const EmployerConversationModal = ({
  open,
  onOpenChange,
  application,
  SetReasonsList,
  ReasonsList,
  onWithdraw,
}: ApplicationDetailsModalProps) => {
  if (!application) return null;

  const extendedApp = getExtendedApplicationDetails(application);
  const statusInfo = getStatusInfo(application.status);

  const [title, setTitle] = useState(null)
  const [description, setDescription] = useState(null)

  const submitResponse = async () => {
    await axios.post("http://localhost:8920/api/pro/application/reason", {
      title,
      description,
      jobId: extendedApp.job._id,
      employerId: extendedApp.job.posted,
      applicationId: extendedApp._id,
     }, {
      withCredentials: true
    })
      .then(async function (response) {
        await axios.get("http://localhost:8920/api/pro/responses/" + extendedApp._id)
          .then(function (response) {
            SetReasonsList(response.data.EmployerResponses);
            setTitle("")
            setDescription("")
          })
      })
      .catch(function (error) {
        alert(error.response.data.success)
      })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Employer Information Details</DialogTitle>
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
              {extendedApp.job.location}
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

        <Separator />

        {/* Employer Responses */}
        <div className="">

          {/* Source: https://tailwindcss.com/docs/width */}
          {/* Source: https://www.geeksforgeeks.org/css/tailwind-css-fixed-width-not-working-with-other-element-in-flex/
                      https://tailwindcss.com/docs/max-width
                      https://tailwindcss.com/docs/padding
                      https://tailwindcss.com/docs/border-width
                      https://tailwindcss.com/docs/flex-direction
                      https://tailwindcss.com/docs/width
                      https://tailwindcss.com/docs/height
                      https://tailwindcss.com/docs/installation/using-vite */}
          <div>
            {ReasonsList.map((response) => {
              if (response.sentBy === "employer") {
                return (
                  <div className="mb-8">
                    <div className="flex">
                      <div >
                        <img src={`http://localhost:8920/uploads/profile/${response.employerId.profile}`} alt="Profile" className="h-20 w-20" />
                      </div>
                      <div className="flex flex-col ml-3">
                        <span className="font-bold">Employer Email: {response.employerId.email}</span>
                        <span className="flex-col">{response.employerId.company}</span>
                      </div>
                    </div>
                    <div className="pr-19 mt-3">
                      <h1 className="text-xl font-bold">{response.title}</h1>
                      <span>{response.description}</span>
                    </div>
                  </div>
                )
              } else {
                return (
                  <div className="mb-8">
                    <div className="flex flex-row-reverse">
                      <div >
                        <img src={`http://localhost:8920/uploads/profile/${response.workerId.photo === null ? "default.png" : response.workerId.photo}`} alt="Profile" className="h-20 w-20" />
                      </div>
                      <div className="flex flex-col mr-3">
                        <span className="font-bold">Worker Email: {response.workerId.email}</span>
                        <span className="flex-col">{response.workerId.skill}</span>
                      </div>
                    </div>
                    <div className="pl-19 flex flex-col mt-3">
                      <h1 className="text-xl font-bold text-right">{response.title}</h1>
                      <span className="text-right">{response.description}</span>
                    </div>
                  </div>
                )
              }
            })}
            <div className="relative">
              <input type="text" className="w-full mt-6 p-2 border-2 border-solid" placeholder="Enter a title." value={title} onChange={(Event) => setTitle(Event.target.value)} />
              <textarea name="response" id="response" placeholder="Enter a repsonse." className="w-full mt-2 mb-12 p-2 border-2 border-solid" value={description} onChange={(Event) => setDescription(Event.target.value)} />
              <button className="absolute right-0 bottom-0 bg-[#505050] text-white py-2 px-3" onClick={submitResponse}>Submit response</button>
            </div>
          </div>
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

export default EmployerConversationModal;
