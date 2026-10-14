import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/lib/usersStore";
import { Phone, MapPin, Mail, FileText, Briefcase, User, Calendar } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

axios.defaults.withCredentials = true;

interface UserProfileModalProps {
  user: UserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (id: number, status: UserProfile["status"]) => void;
  onDelete: (id: number) => void;
}

const UTC_Converter = (createdAt) => {
  const splitDateAndTime = createdAt.split("T");
  const date = splitDateAndTime[0].split("-");
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return months[Number(date[1])] + " " + date[1 + 1] + ", " + date[0];
};

const UserProfileModal = ({ user, open, onOpenChange }: UserProfileModalProps) => {
  const queryClient = useQueryClient();

  const VerifyWorker = async (worker: string) => {
    try {
      const response = await axios.post(
        "http://localhost:8920/api/admin/verify/worker",
        { worker },
        { withCredentials: true }
      );

      toast.success(response.data.message, {
        description: "Worker has been verified successfully.",
      });

      onOpenChange(false);

      await queryClient.invalidateQueries({
        queryKey: ["AdminProfilesInfo"],
      });
    } catch (error: any) {
      if (error.response) {
        toast.info(error.response.data.message);
      }
    }
  };

  const UpdateWorkerEmployer = async (_id, status, role) => {
    try {
      const response = await axios.put(
        "http://localhost:8920/api/admin/updateStatus",
        { _id, status, role },
        { withCredentials: true }
      );

      if (response.data) {
        toast.success(response.data.message, {
          description: "You have successfully updated the status of worker/employer",
        });

        onOpenChange(false);

        await queryClient.invalidateQueries({
          queryKey: ["AdminProfilesInfo"],
        });
      }
    } catch (error) {
      if (error.response) {
        toast.info(error.response.data.message);
      }
    }
  };

  const DeleteWorkerEmployer = async (_id, status, role) => {
    try {
      const response = await axios.put(
        "http://localhost:8920/api/admin/deleteUser",
        { _id, status, role },
        { withCredentials: true }
      );

      if (response.data) {
        toast.success(response.data.message, {
          description: "User deleted successfully",
        });

        onOpenChange(false);

        // THIS IS THE IMPORTANT FIX
        await queryClient.invalidateQueries({
          queryKey: ["AdminProfilesInfo"],
        });
      }
    } catch (error) {
      if (error.response) {
        toast.info(error.response.data.message);
      }
    }
  };

  const statusColor = {
    active: "bg-green-500/10 text-green-600 border-green-500/20",
    not_active: "bg-destructive/10 text-destructive border-destructive/20",
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">User Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-border">
              {user.photo ?
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              overflow: "hidden",
                              flex: "0 0 24px",
                              position: "relative",
                              display: "block",
                            }}
                          >
                            <img
                              src={`http://localhost:8920${user.photo}`}
                              alt="User avatar"
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          </div>
                        : <User className="w-8 h-8 text-muted-foreground" />}
            </div>

            <div>
              <h3 className="font-semibold text-foreground">{user.email}</h3>
              <p className="text-sm text-muted-foreground">{user.jobTitle || user.company}</p>

              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {user.role}
                </Badge>
                <Badge className={`text-xs ${statusColor[user.status]}`}>
                  {user.status === "not_active"
                    ? "Not Active"
                    : user.status === "active"
                    ? "Active"
                    : "Pending"}
                </Badge>
              </div>
            </div>
          </div>

          {/* DETAILS (UNCHANGED) */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{user.phone || user.phoneNumber}</span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{user.location}</span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Joined {UTC_Converter(user.createdAt)}</span>
            </div>

            {user.role === "worker" && user.jobTitle && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                <span>{user.jobTitle}</span>
              </div>
            )}

            {user.role === "employer" && user.company && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                <span>
                  {user.company} — {user.industry.title}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>Reports submitted: {user.reportsSubmitted || 0}</span>
            </div>
          </div>

          {/* Uploaded Documents (UNCHANGED) */}
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-sm font-medium text-foreground">Uploaded Documents</p>

            {user.role === "worker" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>CV / Resume</span>
                  </div>
                  {user.resume ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(`http://localhost:8920/uploads/resumes/${user.resume}`, "_blank")
                      }
                    >
                      View Resume
                    </Button>
                  ) : (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                      Missing
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>Profile Photo</span>
                  </div>
                  {user.photo ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                      Uploaded
                    </Badge>
                  ) : (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                      Missing
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {user.role === "employer" && (
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>Business / Company Permit</span>
                </div>
                {user.permit ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(`http://localhost:8920/uploads/permits/${user.permit}`, "_blank")
                    }
                  >
                    View Permit
                  </Button>
                ) : (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                    Missing
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {user.status !== "active" && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => UpdateWorkerEmployer(user._id, "active", user.role)}
              >
                Activate
              </Button>
            )}

            {user.status !== "not_active" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => UpdateWorkerEmployer(user._id, "not_active", user.role)}
              >
                Deactivate
              </Button>
            )}

            <Button
              size="sm"
              variant="destructive"
              onClick={() => DeleteWorkerEmployer(user._id, "deleted", user.role)}
            >
              Delete
            </Button>

            {user.role === "worker" && !user.isVerified && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => VerifyWorker(user._id)}
              >
                Verify Worker
              </Button>
            )}

            {user.role === "worker" && user.isVerified && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                Verified
              </Badge>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;