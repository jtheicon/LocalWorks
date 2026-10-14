import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MapPin, Star, Briefcase, Filter, Mail, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import ModalContact from "./ModalContact";
import { CheckCircle2 } from "lucide-react";
import { Flag } from "lucide-react";
import ReportWorkerModal from "./ReportWorkerModal";

axios.defaults.withCredentials = true

const mockWorkers = [
  {
    id: 1,
    name: "John Martinez",
    title: "Construction Worker",
    location: "Downtown, Metro City",
    experience: "5 years",
    rating: 4.8,
    skills: ["Carpentry", "Masonry", "Electrical"],
    availability: "Immediate",
    hourlyRate: "$22/hr",
    avatar: "",
  },
  {
    id: 2,
    name: "Sarah Chen",
    title: "Professional Cleaner",
    location: "Eastside District",
    experience: "3 years",
    rating: 4.9,
    skills: ["Residential Cleaning", "Commercial Cleaning", "Deep Cleaning"],
    availability: "Within 1 week",
    hourlyRate: "$25/hr",
    avatar: "",
  },
  {
    id: 3,
    name: "Michael Johnson",
    title: "Delivery Driver",
    location: "Central Business District",
    experience: "4 years",
    rating: 4.7,
    skills: ["Local Delivery", "Long Distance", "Fragile Items"],
    availability: "Immediate",
    hourlyRate: "$18/hr",
    avatar: "",
  },
  {
    id: 4,
    name: "Emily Rodriguez",
    title: "Restaurant Staff",
    location: "Various Locations",
    experience: "6 years",
    rating: 5.0,
    skills: ["Serving", "Bartending", "Event Catering"],
    availability: "Within 2 weeks",
    hourlyRate: "$15/hr + tips",
    avatar: "",
  },
  {
    id: 5,
    name: "David Kim",
    title: "Warehouse Associate",
    location: "Industrial Zone",
    experience: "2 years",
    rating: 4.6,
    skills: ["Forklift Operation", "Inventory Management", "Shipping"],
    availability: "Immediate",
    hourlyRate: "$17/hr",
    avatar: "",
  },
  {
    id: 6,
    name: "Lisa Thompson",
    title: "Security Guard",
    location: "Multiple Sites",
    experience: "8 years",
    rating: 4.9,
    skills: ["Armed Security", "Surveillance", "First Aid"],
    availability: "Within 1 week",
    hourlyRate: "$20/hr",
    avatar: "",
  },
];

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const BrowseWorkers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [modalContact, setModalContact] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [worker, setWorker] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  const BrowseWorkersAx = async () => {
    const { data } = await axios.get("http://localhost:8920/api/pro/viewWorkers", { withCredentials: true })
    setFilteredWorkers(data.workers)
    return data
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['BrowseWorkersAx'],
    queryFn: BrowseWorkersAx
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  if (!data.workers.length) return <div>No Workers</div>
  const { workers } = data

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const filtered = data.workers.filter(
      (worker) =>
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.skills.some((skill) => skill.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredWorkers(filtered);
  };

  return (
    <div>
      {/* Search Section */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, job title, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
          <Button type="button" variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </form>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground mb-4">
        Showing {filteredWorkers.length} worker{filteredWorkers.length !== 1 ? "s" : ""}
      </p>

      {/* Worker Listings */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredWorkers.map((worker) => (
          <Card key={worker._id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={`http://localhost:8920${worker.photo}`} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getInitials(worker.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {worker.name.length > 15
                        ? worker.name.substring(0, 15) + "..."
                        : worker.name}
                    </CardTitle>
                      {worker.isVerified && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                  </div>
                  <CardDescription className="text-base">
                    {worker.jobTitle.length > 15
                      ? worker.jobTitle.substring(0, 15) + "..."
                      : worker.jobTitle}
                  </CardDescription>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{worker.rating}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                    {worker.location.length > 15
                      ? worker.location.substring(0, 15) + "..."
                      : worker.location}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  {worker.yearsOfExperience}
                </div>
                <div className="mt-4 mb-6">
                  <CardTitle className="text-base mb-3">Availability:</CardTitle>
                  <Badge variant="secondary">{worker.availability}</Badge>
                  {/* <span className="font-semibold text-primary">{worker.hourlyRate}</span> */}
                </div>
              </div>

              <div className="mt-4 mb-6">
                <CardTitle className="text-base mb-3">Skills:</CardTitle>

                <div className="flex flex-wrap gap-1">
                  {worker.skills.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {worker.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{worker.skills.length - 3}
                      </Badge>
                    )}
                </div>
              </div>

              <div className="flex gap-2">
                {worker.resume ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `http://localhost:8920/uploads/resumes/${worker.resume}`,
                        "_blank"
                      )
                    }
                  >
                    View Resume
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No resume uploaded
                  </p>
                )}
                <Button onClick={() => { setModalContact(true); setWorker(worker._id) }} className="flex-1 gap-2" size="sm">
                  <Mail className="w-4 h-4" />
                  Contact
                </Button>
               
              </div>

              <div className="flex gap-2 mt-[15px] mb-[36px]">
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => {
                    setSelectedWorkerId(worker._id);
                    setReportOpen(true);
                  }}
                >
                  <Flag className="w-4 h-4" />
                  Report Worker
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ModalContact open={modalContact} onOpenChange={setModalContact} worker={worker} />

      <ReportWorkerModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        workerId={selectedWorkerId}
      />

      {filteredWorkers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No workers found matching your search.</p>
          <Button variant="link" onClick={() => { setSearchTerm(""); setFilteredWorkers(data.workers); }}>
            Clear search
          </Button>
        </div>
      )}
    </div>
  );
};

export default BrowseWorkers;
