import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, Briefcase, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
axios.defaults.withCredentials = true;

interface WorkerProfileProps {
  onEdit: () => void;
}

const WorkerProfile = ({ onEdit }: WorkerProfileProps) => {
  // Mock worker data
  const worker = {
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+1 (555) 123-4567",
    location: "Metro City, State",
    title: "Construction Worker",
    experience: "5 years",
    bio: "Experienced construction worker with expertise in commercial and residential projects. Skilled in operating heavy machinery, reading blueprints, and working with various materials.",
    skills: ["Construction", "Heavy Machinery", "Blueprint Reading", "Concrete Work", "Carpentry", "Safety Compliance"],
    availability: "Full-time",
    expectedSalary: "$20-30/hr",
    appliedJobs: 12,
    interviews: 3,
  };

  const viewProfile = async () => {
    const { data } = await axios.get("http://localhost:8920/api/pro/worker/profile", {
      withCredentials: true
    })

    return data
  }

  const { data, error, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: viewProfile
  })

  if (error) return <div>Error: {error.message}</div>
  if (isLoading) return <div>Loading...</div>

  const { WorkerProf } = data

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={`http://localhost:8920/uploads/profile/${WorkerProf.photo}`} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {WorkerProf.name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{WorkerProf.name}</h2>
                  <p className="text-muted-foreground">{WorkerProf.jobTitle}</p>
                </div>
                <button
                  onClick={onEdit}
                  className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  Edit Profile
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {WorkerProf.email}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {WorkerProf.phoneNumber}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {WorkerProf.location}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  {WorkerProf.yearsOfExperience}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary">{data.Applications}</p>
            <p className="text-sm text-muted-foreground">Jobs Applied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary">{data.Interviews}</p>
            <p className="text-sm text-muted-foreground">Interviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary">{WorkerProf.availability}</p>
            <p className="text-sm text-muted-foreground">Availability</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary">{WorkerProf.expected_salary}</p>
            <p className="text-sm text-muted-foreground">Expected Pay</p>
          </CardContent>
        </Card>
      </div>

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{WorkerProf.about_me}</p>
        </CardContent>
      </Card>

      {/* Skills Section */}
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {WorkerProf.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resume</CardTitle>
        </CardHeader>

        <CardContent>
          {WorkerProf.resume ? (
            <a
              href={`http://localhost:8920/uploads/resumes/${WorkerProf.resume}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              View Resume
            </a>
          ) : (
            <p className="text-muted-foreground">
              No resume uploaded
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkerProfile;
