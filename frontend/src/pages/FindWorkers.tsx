import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Star, Briefcase, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoginModal from "@/components/LoginModal";
import SignUpModal from "@/components/SignUpModal";
import AuthPromptModal from "@/components/AuthPromptModal";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import ModalContact from "@/components/employer/ModalContact";
import { Mail } from "lucide-react";

const FindWorkers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [skill, setSkill] = useState("");
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [ModalContactOpen, setModalContactOpen] = useState(false);
  const [Worker, SetWorker] = useState(null)

  const DisplayWorkers = async () => {
    const result = await axios.get("http://localhost:8920/api/auth/workers")
    console.log(result.data)
    return result.data
  }

  const isLogged = async () => {
      const result = await axios.get("http://localhost:8920/api/pro/isEmployerLogged", { withCredentials: true })
      if (!result.data) {
        setIsLoggedIn(
          false
        )
      } else {
        setIsLoggedIn(
          true
        )
      }
    }
  
    isLogged()

  const { data, isLoading, error } = useQuery({
    queryKey: ['Workers'],
    queryFn: DisplayWorkers
  })

  
  const styleCenter = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "40px"
  }

  if (isLoading) return <div style={styleCenter}>Loading...</div>
  if (error) return <div style={styleCenter}>Error: {error.message}</div>

  const { Workers } = data

  const filteredWorkers = Workers.filter((worker) => {
    const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !location || worker.location.toLowerCase().includes(location.toLowerCase());
    const matchesSkill = !skill || skill === "all" || worker.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()));
    return matchesSearch && matchesLocation && matchesSkill;
  });

  const contactNow = (worker) => {
    if (!isLoggedIn) {
      setAuthPromptOpen(true);
    } else {
      SetWorker(worker)
      setModalContactOpen(true);
    }

  };

  const handleChooseLogin = () => {
    setAuthPromptOpen(false);
    setLoginOpen(true);
  };

  const handleChooseSignUp = () => {
    setAuthPromptOpen(false);
    setSignUpOpen(true);
  };

  const handleSwitchToSignUp = () => {
    setLoginOpen(false);
    setSignUpOpen(true);
  };

  const handleSwitchToLogin = () => {
    setSignUpOpen(false);
    setLoginOpen(true);
  };

  const styleContactBtn = {
    width: "99.1%",
    marginTop: "21px"
  }

  const displayedWorkers = filteredWorkers.slice(0, 10);


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-accent/10 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Find Skilled <span className="text-primary">Workers</span>
            </h1>
            <p className="text-muted-foreground">
              Browse talented local workers ready to help with your projects
            </p>
          </div>

          {/* Search Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-xl shadow-lg p-4 border">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search workers or skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search skills..."
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Worker Listings */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <p className="text-muted-foreground mb-6">
            <h1 className="mb-6 text-xl font-bold text-foreground">
            {filteredWorkers.length > 10
              ? `Top 10 Workers`
              : `Showing ${filteredWorkers.length} workers`}
            </h1>
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!displayedWorkers.length ? <div>No Workers</div> : displayedWorkers.map((worker) => (
              <Card key={worker._id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src="" />
                      <AvatarFallback className="text-lg">
                        {worker.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{worker.name}</CardTitle>
                        {worker.isVerified && (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">{worker.jobTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{worker.rating}</span>
                        <span className="text-sm text-muted-foreground">
                          ({worker.reviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {worker.about_me.length > 15
                      ? worker.about_me.substring(0, 15) + "..."
                      : worker.about_me}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                        {worker.location.length > 15
                        ? worker.location.substring(0, 15) + "..."
                        : worker.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {worker.yearsOfExperience.length > 15
                        ? worker.yearsOfExperience.substring(0, 15) + "..."
                        : worker.yearsOfExperience}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {worker.skills.slice(0, 3).map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                    {worker.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{worker.skills.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={worker.availability === "Available" ? "default" : "secondary"}
                    >
                      {worker.availability}
                    </Badge>
                  </div>
                  <Button style={styleContactBtn} onClick={() => contactNow(worker._id)} className="flex-1 gap-2" size="sm">
                        <Mail className="w-4 h-4" />
                        Contact
                      </Button>
                </CardContent>
                
              </Card>
            ))}
          </div>

          {displayedWorkers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No workers found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />

      {/* Modals */}
      <AuthPromptModal
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        onLogin={handleChooseLogin}
        onSignUp={handleChooseSignUp}
        action="hire"
      />
      <ModalContact open={ModalContactOpen} onOpenChange={setModalContactOpen} worker={Worker} />
      <LoginModal 
        open={loginOpen} 
        onOpenChange={setLoginOpen} 
        onSwitchToSignUp={handleSwitchToSignUp}
      />
      <SignUpModal 
        open={signUpOpen} 
        onOpenChange={setSignUpOpen} 
        onSwitchToLogin={handleSwitchToLogin}
      />
    </div>
  );
};

export default FindWorkers;
