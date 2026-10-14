import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Clock, CheckCircle, XCircle } from "lucide-react";

interface StatsCardsProps {
  totalJobs: number;
  pendingJobs: number;
  acceptedJobs: number;
  rejectedJobs: number;
}

const stats = [
  { key: "total", label: "Total Job Posted", icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
  { key: "pending", label: "Pending Jobs", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-500/10" },
  { key: "accepted", label: "Posted Job Accepted", icon: CheckCircle, color: "text-green-600", bg: "bg-green-500/10" },
  { key: "rejected", label: "Accepted Job Declined", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
];

const StatsCards = ({ totalJobs, pendingJobs, acceptedJobs, rejectedJobs }: StatsCardsProps) => {
  const values: Record<string, number> = { total: totalJobs, pending: pendingJobs, accepted: acceptedJobs, rejected: rejectedJobs };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.key} className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col items-center text-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{values[stat.key]}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
