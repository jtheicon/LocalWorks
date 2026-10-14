import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Job } from "@/lib/jobsStore";

import { useJobsStore } from "@/lib/jobsStore";

interface PostedJobsTableProps {
  jobs: Job[];
  onViewAll?: () => void;
}

const PostedJobsTable = ({ jobs, onViewAll }: PostedJobsTableProps) => {
  
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
            Accepted
          </Badge>
        );
      case "DECLINED":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
            Declined
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
            Ongoing
          </Badge>
        );
    }
  };

  const UTC_Converter = (createdAt: string) => {
    const splitDateAndTime = createdAt.split("T");
    const date = splitDateAndTime[0].split("-");
    const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return months[Number(date[1])] + " " + date[2] + ", " + date[0];
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5">
        <CardTitle className="text-base font-semibold">Posted Jobs</CardTitle>
        <Button
          variant="link"
          size="sm"
          className="text-primary text-xs p-0 h-auto"
          onClick={onViewAll}
        >
          View all
        </Button>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-muted">
                <TableHead className="text-xs font-medium">Category</TableHead>
                <TableHead className="text-xs font-medium">Company</TableHead>
                <TableHead className="text-xs font-medium">Date</TableHead>
                <TableHead className="text-xs font-medium">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8 text-sm"
                  >
                    No jobs found
                  </TableCell>
                </TableRow>
              ) : (
                jobs.slice(0, 6).map((job) => (
                  <TableRow key={job._id} className="border-muted/50">
                    <TableCell className="font-medium text-sm py-3">
                      {job.title}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {job.company}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {job.createdAt ? UTC_Converter(job.createdAt) : "-"}
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(job.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostedJobsTable;