import { Button } from "@/components/ui/button";
import { Briefcase, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const Hero = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hero-stats"],
    queryFn: async () => {
      const res = await axios.get("http://localhost:8920/api/auth/workers");
      return res.data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Something went wrong.</div>;
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/10 py-20 lg:py-32">
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Empowering Local Communities
          </div>
          
          {/* Main Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Connecting Local Workers with{" "}
            <span className="text-primary">Opportunities</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            LocalWorks bridges the gap between skilled barangay workers and employers, 
            creating sustainable job opportunities within your community.
          </p>
          
          {/* Dual CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gap-2 text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <Link to="/find-jobs">
                <Briefcase className="w-5 h-5" />
                I'm Looking for Work
              </Link>
            </Button>
            <Button 
              asChild
              size="lg" 
              variant="outline" 
              className="gap-2 text-lg px-8 py-6 rounded-xl border-2 hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <Link to="/find-workers">
                <Users className="w-5 h-5" />
                I Need a Worker
              </Link>
            </Button>
          </div>
          
          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">{data.RegisteredWorkers}</span>
              <span className="text-sm">Registered Workers</span>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">{data.jobs}</span>
              <span className="text-sm">Jobs Completed</span>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">{Number(data?.AverageRating ?? 0).toFixed(1)}★</span>
              <span className="text-sm">Average Rating</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
