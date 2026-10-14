import { Card, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { Eye } from "lucide-react";
import { Clock } from "lucide-react";
import JobDetailsModal from "@/components/employer/JobDetailsModal";
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
  return (
    <div className="min-h-screen bg-background">
    <div>
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 ">
      {!data.JobsInfo.length ? <div>No Open Positions Available</div> : data.JobsInfo.map((job) => (
        <Card style={styles}><JobDetailsModal open={jobDetailsModalOpen} onOpenChange={setJobDetailsModalOpen} job={jobInfo} />
          <CardHeader>
            <h1 className="text-xl mb-1">{job.title}</h1>
            <CardDescription className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4" />
              {job.company}
              <Clock className="w-4 h-4" />
              Posted: {job.posted.email}
            </CardDescription>
            <div className="flex flex-wrap gap-2 mb-4" style={styles}>{job.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
          </CardHeader>
          <CardContent>
            <Button 
                    variant="secondary" 
                    className="gap-2"
                    onClick={() => { setJobDetailsModalOpen(true), setJobInfo(job) }}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
          </CardContent>
          
        <JobDetailsModal open={jobDetailsModalOpen} onOpenChange={setJobDetailsModalOpen} job={jobInfo} />
        </Card>
      ))}
      </main>
    </div>
    </div>
  )
}

export default OpenPositions