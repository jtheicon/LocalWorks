import { useState } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { API_ORIGIN } from "@/lib/apiOrigin";

type ApiReview = {
  rating: number;
  description: string;
  worker: {
    name: string;
    jobTitle: string;
    photo?: string | null;
  };
};

type CarouselItem = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  text: string;
  photo?: string | null;
};

const defaultTestimonials: CarouselItem[] = [
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

function mapApiReviews(reviews: ApiReview[]): CarouselItem[] {
  return reviews.map((r, i) => ({
    id: `api-${i}`,
    name: r.worker.name,
    role: r.worker.jobTitle,
    avatar: r.worker.name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    rating: r.rating,
    text: r.description,
    photo: r.worker.photo,
  }));
}

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoFailed, setPhotoFailed] = useState(false);

  const { data } = useQuery({
    queryKey: ["landing-reviews"],
    queryFn: async () => {
      const result = await axios.get<{ ReviewsDta: ApiReview[] }>(`${API_ORIGIN}/api/auth/rating`);
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const apiItems =
    data?.ReviewsDta && data.ReviewsDta.length > 0 ? mapApiReviews(data.ReviewsDta) : null;
  const items = apiItems ?? defaultTestimonials;
  const safeIndex = items.length ? currentIndex % items.length : 0;
  const current = items[safeIndex];

  if (!current) return null;

  const showPhoto = Boolean(current.photo) && !photoFailed;

  const nextTestimonial = () => {
    setPhotoFailed(false);
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const prevTestimonial = () => {
    setPhotoFailed(false);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Our Community Says
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real stories from workers and employers who found success through LocalWorks.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative bg-muted/30 rounded-3xl p-8 md:p-12">
            <Quote className="w-12 h-12 text-primary/20 absolute top-6 left-6" />

            <div className="relative z-10 text-center">
              <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 overflow-hidden">
                {showPhoto ? (
                  <img
                    src={`${API_ORIGIN}/uploads/profile/${current.photo}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={() => setPhotoFailed(true)}
                  />
                ) : (
                  current.avatar
                )}
              </div>

              <div className="flex items-center justify-center gap-1 mb-6">
                {[...Array(current.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>

              <blockquote className="text-lg md:text-xl text-foreground mb-6 leading-relaxed">
                "{current.text}"
              </blockquote>

              <div>
                <p className="font-semibold text-foreground">{current.name}</p>
                <p className="text-muted-foreground">{current.role}</p>
              </div>
            </div>

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

              <div className="flex items-center gap-2">
                {items.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPhotoFailed(false);
                      setCurrentIndex(index);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === safeIndex ? "bg-primary w-6" : "bg-muted-foreground/30"
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
