import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Phone, MapPin, FileText, Mail, Eye, Trash2, User } from "lucide-react";
import { useUsersStore, UserProfile } from "@/lib/usersStore";
import { toast } from "sonner";
import UserProfileModal from "./UserProfileModal";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ADMIN_ORIGIN, adminAssetUrl, adminQueryKeys, invalidateAdminLifecycleData } from "@/lib/adminConnect";
import { resolveAdminUserStatus } from "@/lib/adminUserStatus";
import {
  describeDeletionJobEligibility,
  describeIdleBasis,
  describeNextMilestone,
  describeWarningProgress,
} from "@/lib/adminLifecycleTimeline";

axios.defaults.withCredentials = true;

const formatLifecycleDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null;

const AdminProfiles = () => {
  const users = useUsersStore((s) => s.users);
  const updateStatus = useUsersStore((s) => s.updateStatus);
  const removeUser = useUsersStore((s) => s.removeUser);

  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<"all" | "active" | "inactive" | "deactivated" | "pending">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "worker" | "employer">("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedLifecycle, setSelectedLifecycle] = useState<Record<string, unknown> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      setSearchQuery((prev) => {
        if (prev === next) return prev;
        setPage(1);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const fetchLifecycle = async () => {
    const result = await axios.get(`${ADMIN_ORIGIN}/api/admin/users/lifecycle`, {
      withCredentials: true,
      params: {
        lifecycle: lifecycleFilter,
        role: roleFilter,
        search: searchQuery || undefined,
        page,
        limit: 24,
      },
    });
    return result.data;
  };

  const fetchProfiles = async () => {
    const result = await axios.get(`${ADMIN_ORIGIN}/api/admin/profiles/all`, { withCredentials: true });
    return result.data.Users as UserProfile[];
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: [...adminQueryKeys.lifecycle, lifecycleFilter, roleFilter, searchQuery, page],
    queryFn: fetchLifecycle,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!selectedUser?._id || !data?.users) return;
    const fresh = data.users.find(
      (u: { _id: string }) => String(u._id) === String(selectedUser._id),
    );
    if (fresh) setSelectedLifecycle(fresh);
  }, [data?.users, selectedUser?._id]);

  const { data: profileRows } = useQuery({
    queryKey: adminQueryKeys.profiles,
    queryFn: fetchProfiles,
  });

  if (isLoading && !data) {
    return <div className="p-6 text-sm text-muted-foreground">Loading users…</div>;
  }
  if (error) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-destructive text-sm">Error: {(error as Error).message}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const lifecycleUsers = data?.users ?? [];
  const pagination = data?.pagination;

  const profileById = new Map(
    (profileRows ?? []).map((u: UserProfile) => [String(u._id ?? u.id), u]),
  );

  const deactivationMonths = data?.policy?.deactivationMonths ?? 6;

  const returnLocation = (locName?: string | null) => {
    if (!locName || typeof locName !== "string") return "—";
    let locationName = "";

    for (let loc = 0; loc < locName.length; loc++) {
      if (loc < 25) {
        locationName += locName[loc]
      } else {
        locationName += "..."
        break
      }
    }

    return locationName
  }

  return (
    <>
      <main className="app-dashboard-main app-dashboard-stack">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="app-page-title">User management</h2>
            <p className="app-page-description">
              Inactivity (3/4/5‑month warnings, 6‑month auto-delete) and admin deactivate/reactivate update live via WebSocket when the job runs or accounts change.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing…" : "Refresh now"}
          </Button>
        </div>

        {/* Search & Filters */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 h-9"
                  aria-busy={isFetching && searchInput.trim() !== searchQuery}
                />
              </div>

              <div className="flex gap-3 items-center ml-auto">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Role:</span>
                  <Select
                    value={roleFilter}
                    onValueChange={(v) => {
                      setRoleFilter(v as typeof roleFilter);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-28 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="worker">Worker</SelectItem>
                      <SelectItem value="employer">Employer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Select
                    value={lifecycleFilter}
                    onValueChange={(v) => {
                      setLifecycleFilter(v as typeof lifecycleFilter);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-36 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="deactivated">Deactivated</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Cards Grid */}
        {isFetching && (
          <p className="text-xs text-muted-foreground">Refreshing…</p>
        )}
        {lifecycleUsers.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-sm">
            No users match your filters
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lifecycleUsers.map((row: any) => {
              const user = profileById.get(row._id) ?? ({
                _id: row._id,
                id: row._id,
                email: row.email,
                role: row.role,
                status: row.status,
                name: row.name,
              } as UserProfile);
              const badge = resolveAdminUserStatus(
                {
                  status: row.status,
                  lifecycle: row.lifecycle,
                  monthsSinceActivity: row.monthsSinceActivity,
                  inactivityWarningStage: row.inactivityWarningStage,
                  reactivationRequestStatus: row.reactivationRequestStatus,
                },
                deactivationMonths,
              );

              return (
                <Card key={row._id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">

                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border shrink-0">
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
                        : <User className="w-6 h-6 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {user.name || row.name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                          {(user.skill || user.company) ? ` · ${user.skill || user.company}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" />
                        <span>
                          Inactivity basis:{" "}
                          {row.lastActiveAt
                            ? new Date(row.lastActiveAt).toLocaleDateString()
                            : "Not tracked yet"}
                          {row.activityBasis === "updatedAt" ? " (profile update)" : ""}
                          {row.activityBasis === "createdAtFallback" ? " (join date est.)" : ""}
                        </span>
                      </div>
                      {row.lastQualifyingActivityAt &&
                        new Date(row.lastQualifyingActivityAt).getTime() !==
                          new Date(row.lastActiveAt).getTime() && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <FileText className="w-3.5 h-3.5" />
                          <span>
                            Last qualifying ping:{" "}
                            {new Date(row.lastQualifyingActivityAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {row.monthsSinceRegistration != null && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Member {row.monthsSinceRegistration} mo.</span>
                        </div>
                      )}
                      {describeIdleBasis(row) && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{describeIdleBasis(row)}</span>
                        </div>
                      )}
                      {row.inactivityWarningStage > 0 && row.status !== "not_active" && describeWarningProgress(row) && (
                        <div className="text-xs text-amber-800">{describeWarningProgress(row)}</div>
                      )}
                      {row.status !== "not_active" && describeNextMilestone(row, deactivationMonths) && (
                        <div className="text-xs text-amber-800/90">
                          {describeNextMilestone(row, deactivationMonths)}
                        </div>
                      )}
                      {row.lifecycle === "inactive" && !(row.inactivityWarningStage > 0) && row.status !== "not_active" && (
                        <div className="text-xs text-amber-800">
                          Inactive (monitoring) · no warning email sent yet
                          {row.nextMilestoneMonths != null ? ` · Next: ${row.nextMilestoneMonths} mo.` : ""}
                        </div>
                      )}
                      {row.automatedMonthsSinceActivity != null &&
                        row.inactivityTracked &&
                        row.automatedMonthsSinceActivity !== row.monthsSinceActivity && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <FileText className="w-3.5 h-3.5" />
                          <span>
                            Qualifying activity: {row.automatedMonthsSinceActivity} calendar mo. (differs from idle basis)
                          </span>
                        </div>
                      )}
                      {!row.inactivityTracked && row.status !== "not_active" && (
                        <div className="text-xs text-muted-foreground">
                          Not on automation until first qualifying sign-in
                        </div>
                      )}
                      {describeDeletionJobEligibility(row, deactivationMonths) &&
                        row.lifecycle !== "deactivated" && (
                        <div className="text-xs text-red-800 font-medium">
                          {describeDeletionJobEligibility(row, deactivationMonths)}
                        </div>
                      )}
                      {row.reactivationRequestStatus && (
                        <div className="text-xs">
                          Reactivation: <strong>{row.reactivationRequestStatus}</strong>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{user.phoneNumber || user.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{returnLocation(user.location)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Reports submitted: {user.reportsSubmitted || 0}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.badgeClassName}`}>
                        {badge.label}
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedUser(user);
                            setSelectedLifecycle(row);
                            setModalOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={async () => {
                            try {
                              const res = await axios.put(
                                `${ADMIN_ORIGIN}/api/admin/deleteUser`,
                                {
                                  _id: user._id,
                                  status: "deleted",
                                  role: user.role,
                                },
                                { withCredentials: true },
                              );
                              toast.success(res.data.message ?? "User removed", {
                                description:
                                  "Related jobs, applications, and messages were removed from the platform.",
                              });
                              invalidateAdminLifecycleData(queryClient);
                            } catch (err: unknown) {
                              const msg =
                                (err as { response?: { data?: { message?: string } } })?.response
                                  ?.data?.message ?? "Could not delete user.";
                              toast.error(msg);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground self-center">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </main>

      {/* Modal */}
      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          lifecycle={selectedLifecycle ?? undefined}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onUpdateStatus={async () => {
            await queryClient.invalidateQueries({ queryKey: adminQueryKeys.profiles });
            invalidateAdminLifecycleData(queryClient);
          }}
          onDelete={async () => {
            await queryClient.invalidateQueries({ queryKey: adminQueryKeys.profiles });
            invalidateAdminLifecycleData(queryClient);
          }}
        />
      )}
    </>
  );
};

export default AdminProfiles;