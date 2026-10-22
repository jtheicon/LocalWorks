import { lazy, Suspense, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MapPin, Star, Briefcase, CheckCircle2, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthPromptModal from "@/components/AuthPromptModal";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import ModalContact from "@/components/employer/ModalContact";
import { PublicListingSkeleton } from "@/components/PublicListingSkeleton";
import { API_ORIGIN } from "@/lib/apiOrigin";
import {
  fetchPublicWorkers,
  publicWorkersQueryKey,
  PUBLIC_LIST_STALE_MS,
} from "@/lib/publicListings";

const LoginModal = lazy(() => import("@/components/LoginModal"));
const SignUpModal = lazy(() => import("@/components/SignUpModal"));

type PublicWorker = {
  _id: string;
  name: string;
  jobTitle: string;
  rating: number;
  reviews: number;
  about_me: string;
  location: string;
  yearsOfExperience: string;
  skills: string[];
  availability: string;
  isVerified?: boolean;
  photo?: string;
};

const FindWorkers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [skill, setSkill] = useState("");
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [ModalContactOpen, setModalContactOpen] = useState(false);
  const [Worker, SetWorker] = useState<string | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: publicWorkersQueryKey,
    queryFn: fetchPublicWorkers,
    staleTime: PUBLIC_LIST_STALE_MS,
  });

  const { data: isLoggedIn = false } = useQuery({
    queryKey: ["employer-session"],
    queryFn: async () => {
      const result = await axios.get(`${API_ORIGIN}/api/pro/isEmployerLogged`, {
        withCredentials: true,
      });
      return Boolean(result.data);
    },
    staleTime: 60_000,
  });

  const workers: PublicWorker[] = data?.Workers ?? [];

  const filteredWorkers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const loc = location.toLowerCase();
    const skillQ = skill.toLowerCase();
    return workers.filter((worker) => {
      const matchesSearch =
        worker.name.toLowerCase().includes(q) ||
        worker.skills.some((s) => s.toLowerCase().includes(q));
      const matchesLocation = !location || worker.location.toLowerCase().includes(loc);
      const matchesSkill =
        !skill || skill === "all" || worker.skills.some((s) => s.toLowerCase().includes(skillQ));
      return matchesSearch && matchesLocation && matchesSkill;
    });
  }, [workers, searchTerm, location, skill]);

  const displayedWorkers = filteredWorkers.slice(0, 10);

  const contactNow = (workerId: string) => {
    if (!isLoggedIn) {
      setAuthPromptOpen(true);
    } else {
      SetWorker(workerId);
      setModalContactOpen(true);
    }
  };

  const styleContactBtn = {
    width: "99.1%",
    marginTop: "21px",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

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

      <section className="py-12">
        <div className="container mx-auto px-4">
          {isError && (
            <p className="text-destructive mb-4">Could not load workers. Please refresh the page.</p>
          )}

          {!isPending && (
            <h2 className="mb-6 text-xl font-bold text-foreground">
              {filteredWorkers.length > 10
                ? "Top 10 Workers"
                : `Showing ${filteredWorkers.length} workers`}
            </h2>
          )}

          {isPending ? (
            <PublicListingSkeleton variant="workers" />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedWorkers.map((worker) => (
                <Card key={worker._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16">
                        {worker.photo ? (
                          <AvatarImage
                            src={`${API_ORIGIN}/uploads/profile/${worker.photo}`}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                        <AvatarFallback className="text-lg">
                          {worker.name.split(" ").map((n) => n[0]).join("")}
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
                        ? `${worker.about_me.substring(0, 15)}...`
                        : worker.about_me}
                    </p>

                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {worker.location.length > 15
                          ? `${worker.location.substring(0, 15)}...`
                          : worker.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {worker.yearsOfExperience.length > 15
                          ? `${worker.yearsOfExperience.substring(0, 15)}...`
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
                    <Button
                      style={styleContactBtn}
                      onClick={() => contactNow(worker._id)}
                      className="flex-1 gap-2"
                      size="sm"
                    >
                      <Mail className="w-4 h-4" />
                      Contact
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isPending && displayedWorkers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No workers found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />

      <AuthPromptModal
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        onLogin={() => {
          setAuthPromptOpen(false);
          setLoginOpen(true);
        }}
        onSignUp={() => {
          setAuthPromptOpen(false);
          setSignUpOpen(true);
        }}
        action="hire"
      />
      <ModalContact open={ModalContactOpen} onOpenChange={setModalContactOpen} worker={Worker} />
      {(loginOpen || signUpOpen) && (
        <Suspense fallback={null}>
          {loginOpen && (
            <LoginModal
              open={loginOpen}
              onOpenChange={setLoginOpen}
              onSwitchToSignUp={() => {
                setLoginOpen(false);
                setSignUpOpen(true);
              }}
            />
          )}
          {signUpOpen && (
            <SignUpModal
              open={signUpOpen}
              onOpenChange={setSignUpOpen}
              onSwitchToLogin={() => {
                setSignUpOpen(false);
                setLoginOpen(true);
              }}
            />
          )}
        </Suspense>
      )}
    </div>
  );
};

export default FindWorkers;
