import { UserPlus, Search, Briefcase, FileText, Users, CheckCircle } from "lucide-react";

const HowItWorks = () => {
  const workerSteps = [
    {
      icon: UserPlus,
      title: "Create Your Profile",
      description: "Sign up and showcase your skills, experience, and availability to potential employers.",
    },
    {
      icon: Search,
      title: "Browse Opportunities",
      description: "Explore job listings in your area that match your skills and preferences.",
    },
    {
      icon: Briefcase,
      title: "Get Hired & Get Paid",
      description: "Connect with employers, complete jobs, and receive fair payment for your work.",
    },
  ];

  const employerSteps = [
    {
      icon: FileText,
      title: "Post Your Job",
      description: "Describe the work you need done, set your budget, and specify requirements.",
    },
    {
      icon: Users,
      title: "Find Skilled Workers",
      description: "Browse profiles, read reviews, and find the perfect match for your needs.",
    },
    {
      icon: CheckCircle,
      title: "Hire with Confidence",
      description: "Connect with verified workers and get quality work done in your community.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How LocalWorks Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Getting started is easy! Whether you're looking for work or need to hire, 
            we've made the process simple and straightforward.
          </p>
        </div>

        {/* Two Columns */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* For Workers */}
          <div className="bg-background rounded-3xl p-8 shadow-sm border border-border">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-8">
              <Briefcase className="w-4 h-4" />
              For Workers
            </div>
            
            <div className="space-y-8">
              {workerSteps.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center relative">
                      <step.icon className="w-6 h-6 text-primary" />
                      <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* For Employers */}
          <div className="bg-background rounded-3xl p-8 shadow-sm border border-border">
            <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-semibold mb-8">
              <Users className="w-4 h-4" />
              For Employers
            </div>
            
            <div className="space-y-8">
              {employerSteps.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center relative">
                      <step.icon className="w-6 h-6 text-accent-foreground" />
                      <span className="absolute -top-2 -right-2 w-6 h-6 bg-foreground text-background rounded-full text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
