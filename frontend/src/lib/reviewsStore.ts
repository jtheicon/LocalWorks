import { create } from "zustand";

export interface Review {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  text: string;
  createdAt: string;
}

interface ReviewsState {
  reviews: Review[];
  addReview: (review: Omit<Review, "id" | "createdAt">) => void;
}

const loadReviews = (): Review[] => {
  try {
    const stored = localStorage.getItem("localworks-reviews");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveReviews = (reviews: Review[]) => {
  localStorage.setItem("localworks-reviews", JSON.stringify(reviews));
};

export const useReviewsStore = create<ReviewsState>((set) => ({
  reviews: loadReviews(),
  addReview: (review) =>
    set((state) => {
      const newReview: Review = {
        ...review,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      const updated = [newReview, ...state.reviews];
      saveReviews(updated);
      return { reviews: updated };
    }),
}));
