import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useReviewsStore } from "@/lib/reviewsStore";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface WriteReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userRole: string;
}

const WriteReviewModal = ({
  open,
  onOpenChange,
  userName,
  userRole,
}: WriteReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [text, setText] = useState("");

  const WorkerProfile = async () => {
    const result = await axios.get("http://localhost:8920/api/pro/worker/profile", { withCredentials: true })

    console.log(result.data)
    
    return result.data
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['ViewProfileWorkerProfile'],
    queryFn: WorkerProfile
  })

  const styleDisplay = {
    display: "none"
  }

  if (isLoading) return <div style={styleDisplay}>Loading...</div>
  if (error) return <div style={styleDisplay}>Error: {error.message}</div>

  const Rate = async (skill) => {
    await axios.post("http://localhost:8920/api/pro/rating", { rating, description: text, skill }, { withCredentials: true })
      .then(function (response) {
        if (response.data) {
          handleSubmit()
        }
      })
      .catch(function (error) {
        if (error.response) {
          toast.info(error.response.data.message)
        }
      })
  }

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Please select a star rating.");
      return;
    }
    if (text.trim().length < 10) {
      toast.error("Please write at least 10 characters.");
      return;
    }


    toast.success("Thank you for your review!");
    setRating(0);
    setHoveredRating(0);
    setText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>
            Share your experience with LocalWorks. Your review will appear on our
            homepage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <p className="text-sm font-medium">How would you rate us?</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating}/5
                </span>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Your review</p>
            <Textarea
              placeholder="Tell us about your experience with LocalWorks..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {text.length}/500
            </p>
          </div>

          {/* Preview */}
          {rating > 0 && text.trim().length > 0 && (
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Preview
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  <img
                    src={`http://localhost:8920/uploads/profile/${data.WorkerProf.photo}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold">{data.WorkerProf.name}</p>
                  <p className="text-xs text-muted-foreground">{data.WorkerProf.skillCategory}</p>
                </div>
              </div>
              <div className="flex gap-0.5">
                {[...Array(rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-primary text-primary"
                  />
                ))}
              </div>
              <p className="text-sm text-foreground">"{text.trim()}"</p>
            </div>
          )}

          <Button onClick={() => Rate(data.WorkerProf.skill)} className="w-full">
            Submit Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WriteReviewModal;
