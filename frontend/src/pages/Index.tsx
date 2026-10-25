import { lazy, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useDashboardPath } from "@/lib/session";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";

const Testimonials = lazy(() => import("@/components/Testimonials"));

const Index = () => {
  const navigate = useNavigate();
  const { data: dashboardPath } = useDashboardPath();

  // Signed-in users (e.g. pressing the browser back button) go straight back to their dashboard.
  useEffect(() => {
    if (dashboardPath) navigate(dashboardPath, { replace: true });
  }, [dashboardPath, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Suspense fallback={null}>
          <Testimonials />
        </Suspense>
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
