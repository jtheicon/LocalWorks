import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Building2, MapPin, Calendar, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import ApplicationDetailsModal from "./ApplicationDetailsModal";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import EmployerConversationModal from "./EmployerConversationModal";
import WorkerPageHeader from "@/components/worker/WorkerPageHeader";

interface Application {
  id: number;
  jobTitle: string;
  company: string;
  location: string;
  appliedDate: string;
  status: string;
  salary: string;
  interviewDate?: string;
}

const initialApplications: Application[] = [
  {
    id: 1,
    jobTitle: "Construction Worker",
    company: "BuildRight Construction",
    location: "Downtown, Metro City",
    appliedDate: "Jan 28, 2026",
    status: "pending",
    salary: "₱600-800/day",
  },
  {
    id: 2,
    jobTitle: "Warehouse Associate",
    company: "MegaStore Distribution",
    location: "Industrial Zone",
    appliedDate: "Jan 25, 2026",
    status: "interview",
    salary: "₱550-600/day",
    interviewDate: "Feb 3, 2026",
  },
  {
    id: 3,
    jobTitle: "Delivery Driver",
    company: "FastTrack Logistics",
    location: "Eastside District",
    appliedDate: "Jan 20, 2026",
    status: "accepted",
    salary: "₱500-650/day",
  },
  {
    id: 4,
    jobTitle: "Security Guard",
    company: "SafeWatch Security",
    location: "Multiple Sites",
    appliedDate: "Jan 15, 2026",
    status: "rejected",
    salary: "₱450-600/day",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Pending Review":
      return <Badge variant="secondary">Pending Review</Badge>;
    case "Interview Scheduled":
      return <Badge className="bg-blue-500 hover:bg-blue-600">Interview Scheduled</Badge>;
    case "Accepted":
      return <Badge className="bg-green-500 hover:bg-green-600">Accepted</Badge>;
    case "Not Selected":
      return <Badge variant="destructive">Not Selected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const UTC_Converter = (createdAt) => {
  const splitDateAndTime = createdAt.split("T")
  const date = splitDateAndTime[0].split("-")
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  
  return months[Number(date[1])] + " " + date[1+1] + ", " + date[0]
}

const MyApplications = () => {
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [employerConversation, setEmployerConversation] = useState<Application | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [ReasonsList, SetReasonsList] = useState(null);
  const [detailsEmployerModalOpen, setDetailsEmployerModalOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [applicationToWithdraw, setApplicationToWithdraw] = useState(null);

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application);
    setDetailsModalOpen(true);
  };

  const handleViewEmployerConversation = async (application) => {
    await axios.get("http://localhost:8920/api/pro/responses/" + application._id)
      .then(function (response) {
        setEmployerConversation(application);
        SetReasonsList(response.data.EmployerResponses);
        setDetailsEmployerModalOpen(true);
      })
  };

  const handleWithdrawClick = (application: Application) => {
    setApplicationToWithdraw(application);
    setWithdrawDialogOpen(true);
    setDetailsModalOpen(false);
    setDetailsEmployerModalOpen(false);
  };

  const WithdrawApplication = async (id: any) => {
    await axios.put("http://localhost:8920/api/pro/withdrawApplication", {
      _id: id
    }, { withCredentials: true })
      .then(function (response) {
        if (response.data) {
          refetch()
          setApplications(prev => prev.filter(app => app.id !== applicationToWithdraw._id));
          toast.success("Application withdrawn", {
            description: `Your application to ${applicationToWithdraw.job.company} has been withdrawn.`,
          });
        }
      })
      .catch(function (error) {
        if (error.response) {
          toast.error(error.response.data.message)
        }
      })
  }

  const handleConfirmWithdraw = () => {
    if (applicationToWithdraw) {
      WithdrawApplication(applicationToWithdraw._id)
    }
    setWithdrawDialogOpen(false);
    setApplicationToWithdraw(null);
  };

  const Applications = async () => {
    const { data } = await axios.get("http://localhost:8920/api/pro/viewApplications", { withCredentials: true })
    return data
  }

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['ViewApplications'],
    queryFn: Applications
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  const ViewApplications = data.Applications

  if (!ViewApplications.length) return <div>{data.message}</div>

  return (
    <div>
      <WorkerPageHeader
        title="My applications"
        description="Track each application from submission to interview or decision."
      />

      <div className="grid gap-4">
        {ViewApplications.map((application) => (
          <Card key={application._id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl mb-1">{application.job.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-base">
                    <Building2 className="w-4 h-4" />
                    {application.job.company}
                  </CardDescription>
                </div>
                {getStatusBadge(application.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {application.job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Applied: {UTC_Converter(application.createdAt)}
                </span>
                <span className="font-medium text-foreground">
                  {application.job.salary}
                </span>
              </div>

              {application.status === "Interview Scheduled" && application.interviewDate && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                  <p className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Clock className="w-4 h-4" />
                    Interview scheduled for {application.interviewDate}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => handleViewDetails(application)}
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </Button>
                {application.status === "Not Selected" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => handleViewEmployerConversation(application)}
                  >
                    <Eye className="w-4 h-4" />
                    View Reason
                  </Button>
                )}

                {application.status === "Pending Review" && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleWithdrawClick(application)}
                  >
                    Withdraw
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {applications.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">You haven't applied to any jobs yet.</p>
          <Button variant="link">Browse available jobs</Button>
        </div>
      )}

      {/* Application Details Modal */}
      <ApplicationDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        application={selectedApplication}
        onWithdraw={() => selectedApplication && handleWithdrawClick(selectedApplication)}
      />

      <EmployerConversationModal
        open={detailsEmployerModalOpen}
        onOpenChange={setDetailsEmployerModalOpen}
        application={employerConversation}
        SetReasonsList={SetReasonsList}
        ReasonsList={ReasonsList}
        onWithdraw={() => employerConversation && handleWithdrawClick(employerConversation)}
      />

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw your application for <strong>{applicationToWithdraw?.job.title}</strong> at <strong>{applicationToWithdraw?.job.company}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmWithdraw}
              className="bg-destructive hover:bg-destructive/90"
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyApplications;
