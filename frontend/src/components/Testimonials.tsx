import { useState } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReviewsStore, type Review } from "@/lib/reviewsStore";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const defaultTestimonials = [
  {
    id: "default-1",
    name: "Juan dela Cruz",
    role: "Carpenter",
    avatar: "JD",
    rating: 5,
    text: "LocalWorks changed my life! I used to wait at the kanto for work, now I get job offers directly on my phone. I've tripled my income in just 3 months.",
  },
  {
    id: "default-2",
    name: "Maria Santos",
    role: "Homeowner",
    avatar: "MS",
    rating: 5,
    text: "Finding reliable workers was always a challenge. With LocalWorks, I found a skilled electrician within hours. The quality of work was excellent!",
  },
  {
    id: "default-3",
    name: "Pedro Reyes",
    role: "Plumber",
    avatar: "PR",
    rating: 5,
    text: "The platform is so easy to use. Even my lola could navigate it! I love how it connects me with clients right in my barangay.",
  },
  {
    id: "default-4",
    name: "Ana Garcia",
    role: "Business Owner",
    avatar: "AG",
    rating: 5,
    text: "I needed workers for my small restaurant renovation. LocalWorks helped me find a team of masons and painters who did an amazing job on budget.",
  },
];

const Testimonials = () => {
  const userReviews = useReviewsStore((s) => s.reviews);
  const allTestimonials = [...userReviews, ...defaultTestimonials];
  const [currentIndex, setCurrentIndex] = useState(0);

  const Reviews = async () => {
    const result = await axios.get("http://localhost:8920/api/auth/rating")
    return result.data
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['Reviews'],
    queryFn: Reviews
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % data.ReviewsDta.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + data.ReviewsDta.length) % data.ReviewsDta.length);
  };

  const current = data.ReviewsDta[currentIndex] || data.ReviewsDta[0];
  if (!current) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Our Community Says
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real stories from workers and employers who found success through LocalWorks.
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-muted/30 rounded-3xl p-8 md:p-12">
            {/* Quote Icon */}
            <Quote className="w-12 h-12 text-primary/20 absolute top-6 left-6" />
            
            {/* Testimonial Content */}
            <div className="relative z-10 text-center">
              {/* Avatar */}
              <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 overflow-hidden">
                  <img
                    src={`http://localhost:8920/uploads/profile/${current.worker.photo}`}
                    alt="worker"
                    className="w-full h-full object-cover"
                  />
              </div>
              
              {/* Rating */}
              <div className="flex items-center justify-center gap-1 mb-6">
                {[...Array(current.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              
              {/* Quote */}
              <blockquote className="text-lg md:text-xl text-foreground mb-6 leading-relaxed">
                "{current.description}"
              </blockquote>
              
              {/* Author */}
              <div>
                <p className="font-semibold text-foreground">
                  {current.worker.name}
                </p>
                <p className="text-muted-foreground">
                  {current.worker.jobTitle}
                </p>
              </div>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={prevTestimonial}
                className="rounded-full"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              {/* Dots */}
              <div className="flex items-center gap-2">
                {data.ReviewsDta.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex 
                        ? "bg-primary w-6" 
                        : "bg-muted-foreground/30"
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={nextTestimonial}
                className="rounded-full"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
