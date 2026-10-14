import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Star,
  Briefcase,
  Check,
  X,
  Clock,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import WorkerProfileModal from "./WorkerProfileModal";
import EmployerConversationModal from "./EmployerConversationModal";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

axios.defaults.withCredentials = true;

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */
interface Application {
  _id: string;
  worker: {
    _id: string;
    name: string;
    yearsOfExperience: string;
    rating: string;
    skills: string[];
    photo: string;
  };
  job: {
    _id: string;
    title: string;
    location: string;
    createdAt: string;
  };
  status:
    | "Pending Review"
    | "Interview Scheduled"
    | "Accepted"
    | "Not Selected"
    | "Withdrawed";
}

/* -------------------------------------------------------------------------- */
/*                                Helper Utils                                */
/* -------------------------------------------------------------------------- */
const formatDate = (createdAt: string) => {
  return new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Accepted":
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          Accepted
        </Badge>
      );
    case "Not Selected":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
          Rejected
        </Badge>
      );
    case "Interview Scheduled":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          Interview Scheduled
        </Badge>
      );
    default:
      return (
        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          Pending
        </Badge>
      );
  }
};

/* -------------------------------------------------------------------------- */
/*                            WorkerApplications                              */
/* -------------------------------------------------------------------------- */
const WorkerApplications = () => {
  const queryClient = useQueryClient();
  const [dateInput, setDateInput] = useState("");
  const [SubmitReason, SetSubmitReason] = useState(false);
  const [StateReason, SetStateReason] = useState("");
  const [workerId, setWorkerId] = useState("")
  const [jobId, setJobId] = useState("")
  const [applicationId, setApplicationId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "accept" | "interview" | "reject";
    application: Application | null;
  }>({
    open: false,
    type: "accept",
    application: null,
  });

  const [profileModal, setProfileModal] = useState<{
    open: boolean;
    application: Application | null;
  }>({
    open: false,
    application: null,
  });

  /* ----------------------------- Fetch Data ------------------------------ */
  const fetchApplications = async () => {
    const { data } = await axios.get(
      "http://localhost:8920/api/pro/viewApplications/employer"
    );
    return data;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ViewApplicationsEmployer"],
    queryFn: fetchApplications,
  });

  /* ----------------------------- Mutation -------------------------------- */
  const updateApplicationMutation = useMutation({
    mutationFn: async ({
      _id,
      status,
      timeline,
      interviewDate,
      application,
    }: {
      _id: string;
      status: string;
      timeline: string;
      interviewDate?: string;
      application: Application;
    }) => {
      if (status === "Interview Scheduled" && interviewDate) {
        await axios.put("http://localhost:8920/api/pro/date", {
          _id,
          interviewDate,
        });
      }

      await axios.put(
        "http://localhost:8920/api/pro/update/application",
        { _id, status, timeline }
      );
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["ViewApplicationsEmployer"],
      });

      queryClient.invalidateQueries({
        queryKey: ["CompanyInfo"],
      });

      setConfirmDialog({
        open: false,
        type: "accept",
        application: null,
      });

      setDateInput("");

      const { application, status } = variables;

      if (status === "Accepted") {
        toast.success(`${application.worker.name} has been accepted!`, {
          description: `They will be notified about the ${application.job.title} position.`,
        });
      } else if (status === "Interview Scheduled") {
        toast.success(
          `${application.worker.name} has been scheduled for an interview!`,
          {
            description: `They will be notified about the ${application.job.title} interview schedule.`,
          }
        );
      } else {
        toast.info(
          `${application.worker.name}'s application has been declined.`
        );
      }
    },

    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ??
        "Failed to update application status."
      );
    },
  });

  if (isLoading) return <div>Loading...</div>;

  if (error) {
    const err = error as any;
    return (
      <div>
        Error: {err?.response?.data?.message || err.message}
      </div>
    );
  }

  const { Applications } = data;

  /* ----------------------------- Filters --------------------------------- */
  const pendingApplications = Applications.filter(
    (app: Application) => app.status === "Pending Review"
  );

  const scheduledInterviews = Applications.filter(
    (app: Application) => app.status === "Interview Scheduled"
  );

  const processedApplications = Applications.filter(
    (app: Application) =>
      ["Accepted", "Not Selected"].includes(app.status)
  );

  /* ----------------------------- Handlers -------------------------------- */
  const handleConfirmAction = async () => {
    if (!confirmDialog.application) return;

    const { type, application } = confirmDialog;

    if (type === "accept") {
      updateApplicationMutation.mutate({
        _id: application._id,
        status: "Accepted",
        timeline: "Final Decision",
        application
      });
    } else if (type === "interview") {
      if (!dateInput) {
        toast.info("Please enter the interview date.");
        return;
      }

      updateApplicationMutation.mutate({
        _id: application._id,
        status: "Interview Scheduled",
        timeline: "Interview",
        interviewDate: dateInput,
        application,
      });

    } else {
      SetSubmitReason(true)

      if (title.length && description.length) {

        await axios.post("http://localhost:8920/api/pro/application/reason", { 
          workerId: application.worker._id, 
          jobId: application.job._id, 
          applicationId: application._id, 
          title, 
          description
         }, { withCredentials: true })
          .then(function (response) {
            if (response.data.success) {
              updateApplicationMutation.mutate({
                _id: application._id,
                status: "Not Selected",
                timeline: "Final Decision",
                application
              });

              toast.success("Successfully uploaded the reason.")

              setTitle("")
              setDescription("")
              SetSubmitReason(false)
            }
          })
          .catch(function (error) {
            toast.error("Failed to upload the reason")
          })
      }
      // updateApplicationMutation.mutate({
      //   _id: application._id,
      //   status: "Not Selected",
      //   timeline: "Final Decision",
      //   application
      // });

    }
  };

  const styleDate = {
    border: "none",
    boxShadow: "0.1rem 0.1rem 0.1rem rgba(0, 0, 0, 0.1)",
    padding: "0.3rem",
    borderRadius: "15px",
  };

  /* -------------------------------------------------------------------------- */
  /*                                   Render                                   */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Pending Applicants */}
      <ApplicationSection
        title="Pending Applicants"
        icon={<Clock className="w-5 h-5 text-yellow-500" />}
        applications={pendingApplications}
        onView={(application) =>
          setProfileModal({ open: true, application })
        }
        onAccept={(application) =>
          setConfirmDialog({ open: true, type: "accept", application })
        }
        onInterview={(application) =>
          setConfirmDialog({ open: true, type: "interview", application })
        }
        onReject={(application) =>
          setConfirmDialog({ open: true, type: "reject", application })
        }
      />

      {/* Scheduled Interviews */}
      <ApplicationSection
        title="Scheduled Interviews"
        icon={<Clock className="w-5 h-5 text-blue-500" />}
        applications={scheduledInterviews}
        onView={(application) =>
          setProfileModal({ open: true, application })
        }
        onAccept={(application) =>
          setConfirmDialog({ open: true, type: "accept", application })
        }
        onReject={(application) =>
          setConfirmDialog({ open: true, type: "reject", application })
        }
      />

      {/* Previous Applicants */}
      <ApplicationSection
        title="Previous Applicants"
        icon={<Briefcase className="w-5 h-5 text-gray-500" />}
        applications={processedApplications}
        onView={(application) =>
          setProfileModal({ open: true, application })
        }
        isReadonly
      />

      {/* Worker Profile Modal */}
      <WorkerProfileModal
        open={profileModal.open}
        onOpenChange={(open) =>
          setProfileModal((prev) => ({ ...prev, open }))
        }
        worker={profileModal.application}
        onAccept={() =>
          profileModal.application &&
          setConfirmDialog({
            open: true,
            type: "accept",
            application: profileModal.application,
          })
        }
        onReject={() =>
          profileModal.application &&
          setConfirmDialog({
            open: true,
            type: "reject",
            application: profileModal.application,
          })
        }
        showActions={
          profileModal.application?.status === "Pending Review"
        }
      />

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === "accept"
                ? "Accept Application"
                : confirmDialog.type === "interview"
                ? "Schedule Interview"
                : "Reject Application"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === "interview" ? (
                <>
                  <label htmlFor="interviewDate">
                    Please set an interview date:
                  </label>
                  <input
                    style={styleDate}
                    type="date"
                    id="interviewDate"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                  />
                </>
              ) : confirmDialog.type === "accept" ? (
                <>
                  Are you sure you want to accept{" "}
                  <strong>
                    {confirmDialog.application?.worker.name}
                  </strong>{" "}
                  for the{" "}
                  <strong>
                    {confirmDialog.application?.job.title}
                  </strong>{" "}
                  position?
                </>
              ) : (
                <>
                  Are you sure you want to reject{" "}
                  <strong>
                    {confirmDialog.application?.worker.name}
                  </strong>
                  's application for the{" "}
                  <strong>
                    {confirmDialog.application?.job.title}
                  </strong>{" "}
                  position?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                if (confirmDialog.type === "interview") {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const selected = new Date(dateInput);
                  selected.setHours(0, 0, 0, 0);

                  if (selected < today) {
                    e.preventDefault(); // Don't let the dialog fade/close
                    toast.error("Interview date cannot be before today.");
                    return;
                  }
                }

                handleConfirmAction();
              }}
              disabled={updateApplicationMutation.isPending}
              className={
                confirmDialog.type === "reject"
                  ? "bg-destructive hover:bg-destructive/90"
                  : ""
              }
            >
              {updateApplicationMutation.isPending
                ? "Processing..."
                : confirmDialog.type === "accept"
                ? "Accept"
                : confirmDialog.type === "interview"
                ? "Schedule"
                : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={SubmitReason}
        onOpenChange={SetSubmitReason}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="font-600">Please State the reason:</div>
            </DialogTitle>
          </DialogHeader>

          {/* Guide: https://support.granicus.com/s/article/text-fields?language=en_US */}
          <Input placeholder="Enter the title" onChange={(Event) => setTitle(Event.target.value)} />
          <Textarea placeholder="Please state your reason." onChange={(Event) => setDescription(Event.target.value)}></Textarea>

          <Button className="w-full" onClick={handleConfirmAction}>Submit Reason</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                        Reusable Application Section                        */
/* -------------------------------------------------------------------------- */
interface ApplicationSectionProps {
  title: string;
  icon: React.ReactNode;
  applications: Application[];
  onView: (application: Application) => void;
  onAccept?: (application: Application) => void;
  onInterview?: (application: Application) => void;
  onReject?: (application: Application) => void;
  isReadonly?: boolean;
}

const ApplicationSection = ({
  title,
  icon,
  applications,
  onView,
  onAccept,
  onInterview,
  onReject,
  isReadonly = false,
}: ApplicationSectionProps) => {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [ReasonsList, SetReasonsList] = useState(null);
  const [detailsEmployerModalOpen, setDetailsEmployerModalOpen] = useState(false);

  
  const [employerConversation, setEmployerConversation] = useState<Application | null>(null);

  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [applicationToWithdraw, setApplicationToWithdraw] = useState(null);

  const handleViewEmployerConversation = async (application) => {
    await axios.get("http://localhost:8920/api/pro/responses/" + application._id)
      .then(function (response) {
        setEmployerConversation(application);
        SetReasonsList(response.data.EmployerResponses);
        setDetailsEmployerModalOpen(true);
      })
  };

  
  const handleWithdrawClick = (application) => {
    setApplicationToWithdraw(application);
    setWithdrawDialogOpen(true);
    setDetailsModalOpen(false);
    setDetailsEmployerModalOpen(false);
  };


  return (
      <div>
    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
      {icon}
      {title} ({applications.length})
    </h2>

    {applications.length === 0 ? (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No applicants available.
        </p>
      </Card>
    ) : (
      <div className="grid gap-4 md:grid-cols-2">
        {applications.map((application) => (
          <Card
            key={application._id}
            className={`hover:shadow-md transition-shadow ${
              isReadonly ? "opacity-80" : ""
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={`http://localhost:8920${application.worker.photo}`} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(application.worker.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {application.worker.name}
                  </CardTitle>
                  <CardDescription>
                    {application.job.title}
                  </CardDescription>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">
                      {application.worker.rating}
                    </span>
                  </div>
                </div>
                {getStatusBadge(application.status)}
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  {application.job.title}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {application.job.location}
                </div>
                <div className="text-muted-foreground">
                  {application.worker.yearsOfExperience} experience • Applied{" "}
                  {formatDate(application.job.createdAt)}
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {application.worker.skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => onView(application)}
                >
                  <Eye className="w-4 h-4" />
                  View Profile
                </Button>

                {application.status === "Not Selected" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleViewEmployerConversation(application)}
                  >
                    <Eye className="w-4 h-4" />
                    View Reason
                  </Button>
                ) : (
                  <div></div>
                )}

                {!isReadonly && (
                  <>
                    {onAccept && (
                      <Button
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => onAccept(application)}
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </Button>
                    )}
                    {onInterview && (
                      <Button
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => onInterview(application)}
                      >
                        <Clock className="w-4 h-4" />
                        Interview
                      </Button>
                    )}
                    {onReject && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => {
                          onReject(application)
                        }}
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )}

    <EmployerConversationModal
      open={detailsEmployerModalOpen}
      onOpenChange={setDetailsEmployerModalOpen}
      application={employerConversation}
      SetReasonsList={SetReasonsList}
      ReasonsList={ReasonsList}
      onWithdraw={() => employerConversation && handleWithdrawClick(employerConversation)}
    />
  </div>
  )
};

export default WorkerApplications;