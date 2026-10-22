import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";

const Testimonials = lazy(() => import("@/components/Testimonials"));

const Index = () => {
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
