import axios from "axios";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

import { ADMIN_API, adminQueryKeys, invalidateAdminLifecycleData } from "@/lib/adminConnect";

axios.defaults.withCredentials = true;

type RequestRow = {
  _id: string;
  role: string;
  name: string;
  email: string;
  lastActiveAt: string | null;
  deactivation: { reason?: string; at?: string } | null;
  reactivationRequestedAt: string;
};

const AdminReactivationRequests = () => {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<RequestRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<RequestRow | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminQueryKeys.reactivation,
    queryFn: async () => {
      const res = await axios.get(`${ADMIN_API}/reactivation/requests`, { withCredentials: true });
      return res.data.requests as RequestRow[];
    },
  });

  const approve = useMutation({
    mutationFn: (row: RequestRow) =>
      axios.post(
        `${ADMIN_API}/reactivation/approve`,
        { userId: row._id, role: row.role },
        { withCredentials: true },
      ),
    onSuccess: () => {
      toast.success("Account reactivated");
      invalidateAdminLifecycleData(queryClient);
    },
  });

  const reject = useMutation({
    mutationFn: (row: RequestRow) =>
      axios.post(
        `${ADMIN_API}/reactivation/reject`,
        { userId: row._id, role: row.role },
        { withCredentials: true },
      ),
    onSuccess: () => {
      toast.success("Request rejected");
      invalidateAdminLifecycleData(queryClient);
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading reactivation requests…</div>;
  if (error) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-destructive text-sm">Could not load requests.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const rows = data ?? [];

  return (
    <main className="app-dashboard-main">
      <div>
        <h2 className="app-page-title">Reactivation requests</h2>
        <p className="text-sm text-muted-foreground">
          Admin-deactivated accounts only. Long-term inactivity (6 months) deletes accounts; those users re-register instead.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <p className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
            For accounts deactivated by an administrator only. Six-month inactivity permanently deletes accounts;
            those users must register again and will not appear here.
          </p>
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No pending reactivation requests.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead>Deactivated</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.role}-${row._id}`}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.email}</div>
                    </TableCell>
                    <TableCell className="capitalize">{row.role}</TableCell>
                    <TableCell className="text-sm">
                      {row.lastActiveAt ? new Date(row.lastActiveAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.deactivation?.at ? new Date(row.deactivation.at).toLocaleDateString() : "—"}
                      {row.deactivation?.reason && (
                        <Badge variant="outline" className="ml-2 text-xs">{row.deactivation.reason}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(row.reactivationRequestedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" onClick={() => setApproveTarget(row)}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectTarget(row)}>Reject</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve reactivation?</AlertDialogTitle>
            <AlertDialogDescription>
              Restore access for {approveTarget?.name}. They will receive an email when approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (approveTarget) approve.mutate(approveTarget);
                setApproveTarget(null);
              }}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject reactivation?</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectTarget?.name} will stay deactivated. They will be notified by email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (rejectTarget) reject.mutate(rejectTarget);
                setRejectTarget(null);
              }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default AdminReactivationRequests;
