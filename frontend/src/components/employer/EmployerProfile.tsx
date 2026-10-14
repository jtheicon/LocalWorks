import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, Mail, Briefcase, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/employer/DashboardHeader";
import EditProfileModal from "./EditProfileModal";
import { Button } from "../ui/button";
axios.defaults.withCredentials = true;


const EmployerProfile = () => {
  const nav = useNavigate()
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  

  const viewProfile = async () => {
    const { data } = await axios.get("http://localhost:8920/api/pro/employer/information", {
      withCredentials: true
    })

    return data
  }

  const { data, error, isLoading } = useQuery({
    queryKey: ['profileEmployer'],
    queryFn: viewProfile
  })

  if (error) return <div>Error: {error.message}</div>
  if (isLoading) return <div>Loading...</div>

  const { EmployerProf } = data

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Company Profile Section */}
        <div className="mb-8">

        <Button className="mb-9" onClick={() => nav(-1)}>Back to Employer Dashboard</Button>

        {/* Tabs for Applications and Browse Workers */}
        <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={`http://localhost:8920/uploads/profile/${EmployerProf.profile}` || ""} />

              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {EmployerProf.email
                  ? EmployerProf.email
                      .split("@")[0]
                      .slice(0, 2)
                      .toUpperCase()
                  : "EM"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{EmployerProf.email}</h2>
                  <p className="text-muted-foreground">{EmployerProf.phone}</p>
                </div>

              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {EmployerProf.email}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {EmployerProf.phone}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {EmployerProf.company}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  {EmployerProf.industry.title}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <EditProfileModal open={editProfileOpen} onOpenChange={setEditProfileOpen} />
      </Card>

      

      
      
    </div>
        </div>
      </main>

    </div>
  )
}

export default EmployerProfile;
