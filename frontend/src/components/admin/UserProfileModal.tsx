import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/lib/usersStore";
import AIVerificationPanel from "./AIVerificationPanel";
import CredibilityBadge, { CredibilityBreakdown, useCredibility } from "@/components/CredibilityBadge";
import { Phone, MapPin, Mail, FileText, Briefcase, User, Calendar } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { socket } from "@/socket";
import { ADMIN_API, adminAssetUrl, adminQueryKeys, invalidateAdminLifecycleData } from "@/lib/adminConnect";
import { resolveAdminUserStatus } from "@/lib/adminUserStatus";
import {
  describeDeletionJobEligibility,
  describeIdleBasis,
  describeNextMilestone,
  describeWarningProgress,
} from "@/lib/adminLifecycleTimeline";

axios.defaults.withCredentials = true;

type AdminLifecycleInsight = {
  status?: string;
  lifecycle?: string;
  automatedLifecycle?: string;
  monthsSinceActivity?: number | null;
  automatedMonthsSinceActivity?: number | null;
  monthsSinceRegistration?: number | null;
  activityBasis?: string;
  lastActiveAt?: string | null;
  lastQualifyingActivityAt?: string | null;
  qualifyingLastActiveAt?: string | null;
  eligibleForAutoDeactivation?: boolean;
  eligibleForAutoDeletion?: boolean;
  inactivityTracked?: boolean;
  inactivityWarningStage?: number;
  lastInactivityNotificationAt?: string | null;
  lastStageDueAt?: string | null;
  deletionDueAt?: string | null;
  nextMilestoneMonths?: number | null;
  nextScheduledAt?: string | null;
  reactivationRequestStatus?: string | null;
  deactivation?: { reason?: string } | null;
};

interface UserProfileModalProps {
  user: UserProfile;
  lifecycle?: AdminLifecycleInsight;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (id: number, status: UserProfile["status"]) => void;
  onDelete: (id: number) => void;
}

const formatJoinedDate = (createdAt: string | Date | null | undefined): string => {
  if (createdAt == null || createdAt === "") return "—";

  const iso =
    createdAt instanceof Date
      ? createdAt.toISOString()
      : typeof createdAt === "string"
        ? createdAt
        : "";

  const datePart = iso.split("T")[0];
  if (!datePart) return "—";

  const [year, month, day] = datePart.split("-");
  const monthIndex = Number(month);
  if (!year || !day || monthIndex < 1 || monthIndex > 12) return "—";

  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[monthIndex]} ${day}, ${year}`;
};

const UserProfileModal = ({ user, lifecycle: lifecycleFallback, open, onOpenChange }: UserProfileModalProps) => {
  const queryClient = useQueryClient();
  const userId = String(user._id ?? user.id ?? "");
  const role = user.role as "worker" | "employer";

  const { data: lifecyclePayload } = useQuery({
    queryKey: [...adminQueryKeys.lifecycleUser, role, userId],
    queryFn: async () => {
      const res = await axios.get(`${ADMIN_API}/users/lifecycle/${role}/${userId}`, {
        withCredentials: true,
      });
      return {
        user: res.data.user as AdminLifecycleInsight,
        policy: res.data.policy as { deactivationMonths?: number } | undefined,
      };
    },
    enabled: open && Boolean(userId) && (role === "worker" || role === "employer"),
    staleTime: 0,
  });

  const liveLifecycle = lifecyclePayload?.user;

  useEffect(() => {
    if (!open) return;
    const onLifecycleUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.lifecycleUser, role, userId] });
    };
    socket.on("admin:user-lifecycle:updated", onLifecycleUpdated);
    return () => {
      socket.off("admin:user-lifecycle:updated", onLifecycleUpdated);
    };
  }, [open, queryClient, role, userId]);

  const lifecycle = liveLifecycle ?? lifecycleFallback;
  const deactivationMonths = lifecyclePayload?.policy?.deactivationMonths ?? 6;

  const unified = resolveAdminUserStatus(
    {
      status: lifecycle?.status ?? user.status,
      lifecycle: lifecycle?.lifecycle,
      monthsSinceActivity: lifecycle?.monthsSinceActivity,
      inactivityWarningStage: lifecycle?.inactivityWarningStage,
      reactivationRequestStatus: lifecycle?.reactivationRequestStatus,
    },
    deactivationMonths,
  );

  const nextMilestoneLine = lifecycle
    ? describeNextMilestone(lifecycle, deactivationMonths)
    : null;
  const deletionEligibleLine =
    lifecycle && user.status !== "not_active"
      ? describeDeletionJobEligibility(lifecycle, deactivationMonths)
      : null;

  const { data: scores = {} } = useCredibility(user?.role ?? "worker", open ? [user?._id] : []);
  const credibility = user?._id ? scores[user._id] : undefined;

  const UpdateWorkerEmployer = async (_id, status, role) => {
    try {
      const response = await axios.put(
        `${ADMIN_API}/updateStatus`,
        { _id, status, role },
        { withCredentials: true }
      );

      if (response.data) {
        toast.success(response.data.message, {
          description: "You have successfully updated the status of worker/employer",
        });

        onOpenChange(false);

        invalidateAdminLifecycleData(queryClient);
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
        `${ADMIN_API}/deleteUser`,
        { _id, status, role },
        { withCredentials: true }
      );

      if (response.data) {
        toast.success(response.data.message, {
          description: "Account marked deleted; related jobs, applications, and messages were removed.",
        });

        onOpenChange(false);

        // THIS IS THE IMPORTANT FIX
        invalidateAdminLifecycleData(queryClient);
      }
    } catch (error) {
      if (error.response) {
        toast.info(error.response.data.message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                              src={adminAssetUrl(user.photo)}
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

              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {user.role}
                </Badge>
                <Badge className={`text-xs font-semibold ${unified.badgeClassName}`}>
                  {unified.label}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">{unified.accessNote}</p>
            </div>
          </div>

          {lifecycle?.lifecycle && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1.5">
              <p className="font-semibold text-foreground">Automated inactivity monitoring</p>
              <p>
                Unified status: <span className="font-medium">{unified.label}</span>
                {lifecycle.lifecycle != null && (
                  <>
                    {" "}
                    · Lifecycle: <span className="capitalize">{lifecycle.lifecycle}</span>
                  </>
                )}
              </p>
              {describeIdleBasis(lifecycle) && (
                <p className="text-muted-foreground">{describeIdleBasis(lifecycle)}</p>
              )}
              {!describeIdleBasis(lifecycle) && lifecycle.inactivityTracked === false && (
                <p className="text-muted-foreground">
                  Not on inactivity automation yet (no qualifying sign-in).
                </p>
              )}
              {describeWarningProgress(lifecycle) && (
                <p className="text-amber-800">{describeWarningProgress(lifecycle)}</p>
              )}
              {nextMilestoneLine && (
                <p className="text-amber-800/90">{nextMilestoneLine}</p>
              )}
              {lifecycle.reactivationRequestStatus && (
                <p>
                  Reactivation request:{" "}
                  <strong className="capitalize">{lifecycle.reactivationRequestStatus}</strong>
                </p>
              )}
              {lifecycle.deactivation?.reason && (
                <p className="text-muted-foreground">
                  Deactivation reason: {lifecycle.deactivation.reason}
                </p>
              )}
              {lifecycle.lastActiveAt && lifecycle.activityBasis !== "lastActiveAt" && (
                <p className="text-muted-foreground">
                  Inactivity basis source:{" "}
                  {new Date(lifecycle.lastActiveAt).toLocaleDateString()}
                  {lifecycle.activityBasis === "updatedAt" ? " (profile last updated)" : ""}
                  {lifecycle.activityBasis === "createdAtFallback" ? " (join date estimate)" : ""}
                </p>
              )}
              {lifecycle.inactivityTracked &&
                lifecycle.automatedMonthsSinceActivity != null &&
                lifecycle.qualifyingLastActiveAt &&
                lifecycle.automatedMonthsSinceActivity !== lifecycle.monthsSinceActivity && (
                <p className="text-muted-foreground">
                  Qualifying activity ping:{" "}
                  {new Date(lifecycle.qualifyingLastActiveAt).toLocaleDateString()} (
                  {lifecycle.automatedMonthsSinceActivity} mo.)
                </p>
              )}
              {!lifecycle.inactivityTracked && user.status !== "not_active" && (
                <p className="text-muted-foreground">
                  Not enrolled in automation until the user completes a qualifying sign-in.
                </p>
              )}
              {deletionEligibleLine && (
                <p className="text-red-800 font-medium">{deletionEligibleLine}</p>
              )}
            </div>
          )}

          <AIVerificationPanel verification={user.verification} />

          {credibility && (
            <div className="rounded-lg border border-border p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">Credibility score</span>
                <CredibilityBadge credibility={credibility} subject={user.role === "worker" ? "Worker" : "Employer"} />
              </div>
              <CredibilityBreakdown credibility={credibility} />
            </div>
          )}

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
              <span>Joined {formatJoinedDate(user.createdAt)}</span>
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
                        window.open(adminAssetUrl(`/uploads/resumes/${user.resume}`), "_blank")
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
                      window.open(adminAssetUrl(`/uploads/permits/${user.permit}`), "_blank")
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

          {/* Actions: accounts are approved automatically by AI at sign-up, so the admin
              only moderates (re-activate a deactivated account, deactivate, delete). */}
          <div className="flex gap-2 pt-2">
            {(user.status === "not_active" || user.status === "pending") && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => UpdateWorkerEmployer(user._id, "active", user.role)}
              >
                {user.status === "not_active" ? "Reactivate account" : "Activate"}
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