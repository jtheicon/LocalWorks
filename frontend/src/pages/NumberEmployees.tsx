import { Card, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { Eye } from "lucide-react";
import { Clock } from "lucide-react";
import ApplicationDetailsModal from "@/components/employer/ApplicationDetails";
import { useState } from "react";
import DashboardHeader from "@/components/employer/DashboardHeader";

axios.defaults.withCredentials = true

const OpenPositions = () => {
  const [jobDetailsModalOpen, setJobDetailsModalOpen] = useState(false)
  const [jobInfo, setJobInfo] = useState(null)
  const OpenPosition = async () => {
    const result = await axios.get("http://localhost:8920/api/pro/company", { withCredentials: true })
    return result.data
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['OpenPosition'],
    queryFn: OpenPosition
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  const styles = { marginTop: "20px" }
  const cardHeader = { display: "flex", justifyContent: "space-between"}

  const getStatusBadge = (status: string) => {
  switch (status) {
    case "Pending Review":
      return <Badge variant="secondary">Pending Review</Badge>;
    case "Interview Scheduled":
      return <Badge className="bg-blue-500 hover:bg-blue-600">Interview Scheduled</Badge>;
    case "Accepted":
      return <Badge className="bg-green-500 hover:bg-green-600">Accepted</Badge>;
    case "Not Selected":
      return <Badge variant="destructive">Not Selected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
  return (
    <div className="min-h-screen bg-background">
    <div>
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 ">
      {!data.TotalApplicationsArray.length ? <div>No Open Positions Available</div> : data.TotalApplicationsArray.map((job) => (
        <Card style={styles}><ApplicationDetailsModal open={jobDetailsModalOpen} onOpenChange={setJobDetailsModalOpen} application={jobInfo} />
          <CardHeader>
            <div style={cardHeader}>
              <h1 className="text-xl mb-1">{job.job.title}</h1>
              {getStatusBadge(job.status)}
            </div>
            <CardDescription className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4" />
              {job.job.company}
              <Clock className="w-4 h-4" />
              Application By: {job.worker.name}
            </CardDescription>
            <div className="flex flex-wrap gap-2 mb-4" style={styles}>{job.worker.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
          </CardHeader>
          <CardContent>
            <Button 
                    variant="secondary" 
                    className="gap-2"
                    onClick={() => { setJobDetailsModalOpen(true); setJobInfo(job) }}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
          </CardContent>
          
        </Card>
      ))}
      </main>
    </div>
    </div>
  )
}

export default OpenPositions