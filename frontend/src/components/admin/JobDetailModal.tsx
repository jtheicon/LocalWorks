import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  Trash2,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import { useJobsStore, Job } from "@/lib/jobsStore";
import { toast } from "sonner";
import axios from "axios";
import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface JobDetailModalProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}

const JobDetailModal = ({
  job,
  open,
  onOpenChange,
  onDelete,
}: JobDetailModalProps) => {
  const isUpdatingRef = useRef(false);
  const queryClient = useQueryClient();

  if (!job) return null;

  const updateStatus = async (
    _id: string,
    newStatus: "ACCEPTED" | "DECLINED" | "DELETED"
  ) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;

    try {
      const response = await axios.put(
        `http://localhost:8920/api/admin/updateJob/${_id}`,
        { newStatus },
        { withCredentials: true }
      );

      toast.success(response.data.message);

      // ✅ THIS triggers refetch of data.JOBS
      await queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });

      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Request failed");
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            Accepted
          </Badge>
        );
      case "DECLINED":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            Declined
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{job.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> {job.company}
              </DialogDescription>
            </div>
            {getStatusBadge(job.status)}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] px-6">
          <div className="space-y-5 pb-4">
            {/* Quick Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                {job.location || "No Location Specified"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="w-4 h-4 text-primary" />
                {job.salary || "N/A"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 text-primary" />
                {job.type || "N/A"}
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {job.description || "No description available."}
              </p>
            </div>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Requirements</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {job.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Benefits</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {job.benefits.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Contact */}
            {(job.contactEmail || job.contactPhone) && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Contact</h4>
                <div className="space-y-1">
                  {job.contactEmail && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" /> {job.contactEmail}
                    </div>
                  )}
                  {job.contactPhone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" /> {job.contactPhone}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 p-6 pt-2 border-t border-border">
          {job.status !== "ACCEPTED" && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
              onClick={() => updateStatus(job._id, "ACCEPTED")}
            >
              <CheckCircle className="w-4 h-4" /> Accept
            </Button>
          )}

          {job.status !== "DECLINED" && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
              onClick={() => updateStatus(job._id, "DECLINED")}
            >
              <XCircle className="w-4 h-4" /> Decline
            </Button>
          )}

          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5"
            onClick={() => {
              updateStatus(job._id, "DELETED")
              onOpenChange(false);
            }}
          >
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobDetailModal;