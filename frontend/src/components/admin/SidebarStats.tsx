import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Briefcase, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface SidebarStatsProps {
  totalJobs: number;
  pendingJobs: number;
  acceptedJobs: number;
  rejectedJobs: number;
}

const SidebarStats = ({ totalJobs, pendingJobs, acceptedJobs, rejectedJobs }: SidebarStatsProps) => {
  const max = Math.max(totalJobs, 1);

  const items = [
    { label: "Total Job Posted", value: totalJobs, icon: Briefcase, color: "bg-foreground", progress: 100 },
    { label: "Pending Job", value: pendingJobs, icon: Clock, color: "bg-primary", progress: (pendingJobs / max) * 100 },
    { label: "Posted Job Accepted", value: acceptedJobs, icon: CheckCircle, color: "bg-green-500", progress: (acceptedJobs / max) * 100 },
    { label: "Posted Job Declined", value: rejectedJobs, icon: AlertTriangle, color: "bg-destructive", progress: (rejectedJobs / max) * 100 },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.label} className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <item.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <Progress value={item.progress} className={`h-2 [&>div]:${item.color}`} />
            </div>
            <span className="text-2xl font-bold text-foreground min-w-[40px] text-right">{item.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SidebarStats;
