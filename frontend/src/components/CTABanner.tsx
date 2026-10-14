import { Button } from "@/components/ui/button";

import { Briefcase, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CTABanner = () => {
  return (
    <section className="py-20 bg-primary">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Heading */}
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Join thousands of workers and employers building a stronger community together. 
            Your next opportunity is just a click away!
          </p>
          
          {/* Dual CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild
              size="lg" 
              variant="secondary"
              className="gap-2 text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all group"
            >
              <Link to="/find-jobs">
                <Briefcase className="w-5 h-5" />
                Find Work Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button 
              asChild
              size="lg" 
              variant="ghost"
              className="gap-2 text-lg px-8 py-6 rounded-xl border-2 border-primary-foreground text-primary-foreground bg-transparent hover:bg-primary-foreground hover:text-primary transition-all group"
            >
              <Link to="/find-workers">
                <Users className="w-5 h-5" />
                Hire a Worker
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
