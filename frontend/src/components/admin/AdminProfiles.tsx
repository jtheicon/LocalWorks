import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Phone, MapPin, FileText, Mail, Eye, Trash2, User } from "lucide-react";
import { useUsersStore, UserProfile } from "@/lib/usersStore";
import { toast } from "sonner";
import UserProfileModal from "./UserProfileModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

axios.defaults.withCredentials = true;

const AdminProfiles = () => {
  const users = useUsersStore((s) => s.users);
  const updateStatus = useUsersStore((s) => s.updateStatus);
  const removeUser = useUsersStore((s) => s.removeUser);

  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] = useState<"all" | "active" | "not_active" | "pending">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "worker" | "employer">("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const AdminProfilesInfo = async () => {
    const result = await axios.get("http://localhost:8920/api/admin/profiles/all", {
      withCredentials: true,
    });
    return result.data;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["AdminProfilesInfo"],
    queryFn: AdminProfilesInfo,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const { Users } = data;

  const filtered = Users.filter((u: UserProfile) => {
    const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = sortStatus === "all" || u.status === sortStatus;
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const statusLabel = (status: UserProfile["status"]) => {
    if (status === "active") return { text: "ACTIVE", className: "text-green-600" };
    if (status === "not_active") return { text: "NOT ACTIVE", className: "text-destructive" };
    return { text: "PENDING", className: "text-yellow-600" };
  };

  const returnLocation = (locName) => {
    let locationName = ""

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
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        <div>
          <h2 className="text-xl font-bold text-foreground">User</h2>
          <p className="text-sm text-muted-foreground">Manage users here</p>
        </div>

        {/* Search & Filters */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <div className="flex gap-3 items-center ml-auto">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Role:</span>
                  <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
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
                  <span className="text-sm text-muted-foreground">Sort:</span>
                  <Select value={sortStatus} onValueChange={(v) => setSortStatus(v as any)}>
                    <SelectTrigger className="w-28 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="not_active">Not Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Cards Grid */}
        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-sm">
            No users match your search
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((user: UserProfile) => {
              const status = statusLabel(user.status);

              return (
                <Card key={user.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
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
                        : <User className="w-6 h-6 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.skill || user.company}
                        </p>
                      </div>
                    </div>

                    {/* Info (UNCHANGED) */}
                    <div className="space-y-1.5 text-xs text-muted-foreground">
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
                      <span className={`text-xs font-bold ${status.className}`}>
                        {status.text}
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedUser(user);
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
                            await axios.put(
                              "http://localhost:8920/api/admin/deleteUser",
                              {
                                _id: user._id,
                                status: "deleted",
                                role: user.role,
                              },
                              { withCredentials: true }
                            );

                            toast.success("User removed");

                            await queryClient.invalidateQueries({
                              queryKey: ["AdminProfilesInfo"],
                            });
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
      </main>

      {/* Modal */}
      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onUpdateStatus={async () => {
            await queryClient.invalidateQueries({ queryKey: ["AdminProfilesInfo"] });
          }}
          onDelete={async () => {
            await queryClient.invalidateQueries({ queryKey: ["AdminProfilesInfo"] });
          }}
        />
      )}
    </>
  );
};

export default AdminProfiles;