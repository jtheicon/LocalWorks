import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Briefcase } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

axios.defaults.withCredentials = true;

interface PostJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Location {
  _id: string;
  name: string;
}

const PostJobModal = ({ open, onOpenChange }: PostJobModalProps) => {
  /* -------------------------------------------------------------------------- */
  /*                                Form State                                  */
  /* -------------------------------------------------------------------------- */
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    salary: "",
    type: "Full-Time",
    description: "",
    requirements: "",
    benefits: "",
    schedule: "",
    positions: 1,
    applyBefore: "",
    startDate: "",
    category: "", // required
    categoryTitle: "",
  });

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [mapQuery, setMapQuery] = useState("");
  const [mapUrl, setMapUrl] = useState(
    "https://maps.google.com/maps?q=16.167700,120.426300&z=18&output=embed"
  );

  const handleLocationSearch = async () => {
    if (!mapQuery.trim()) return;

    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      mapQuery
    )}`;

    const res = await fetch(geocodeUrl);
    const data = await res.json();

    if (!data.length) return;

    const { lat, lon, display_name } = data[0];

    setMapUrl(
      `https://maps.google.com/maps?q=${lat},${lon}&z=17&output=embed`
    );

    setFormData({
      ...formData,
      location: display_name,
    });
  };

  /* -------------------------------------------------------------------------- */
  /*                             Fetch Locations                                */
  /* -------------------------------------------------------------------------- */
  const fetchLocations = async () => {
    const { data } = await axios.get("http://localhost:8920/api/pro/Locations", { withCredentials: true });
    return data;
  };

  const fetchIndustries = async () => {
    const { data } = await axios.get("http://localhost:8920/api/pro/Industries");
    return data;
  };

  const { data: industryData, isLoading: industryLoading } = useQuery({
    queryKey: ["Industries"],
    queryFn: fetchIndustries,
  });

  const industries = industryData?.Industries || [];

  /* -------------------------------------------------------------------------- */
  /*                             Tag Management                                 */
  /* -------------------------------------------------------------------------- */
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                             Submit Job                                     */
  /* -------------------------------------------------------------------------- */
  let Payload = {};

  const postJob = async () => {
    try {
      Payload = {
          title: formData.title,
          company: "Your Company",
          posted: "EMPLOYER_ID",
          location: formData.location,
          type: formData.type,
          salary: formData.salary,
          description: formData.description,
          requirements: formData.requirements
            .split("\n")
            .map((r) => r.trim())
            .filter(Boolean),
          benefits: formData.benefits
            .split("\n")
            .map((b) => b.trim())
            .filter(Boolean),
          tags: tags.length > 0 ? tags : ["New Posting"],
          schedule: formData.schedule,
          startDate: formData.startDate || undefined,
          positions: Number(formData.positions),
          applyBefore: formData.applyBefore,
          category: formData.category,
          categoryTitle: formData.category
        };

      const { data } = await axios.post(
        "http://localhost:8920/api/pro/createJob",
        Payload
      );

      toast.success(data.message, {
        description:
          "Workers can now view and apply to your job posting.",
      });

      // Reset form
      setFormData({
        title: "",
        location: "",
        salary: "",
        type: "Full-Time",
        description: "",
        requirements: "",
        benefits: "",
        schedule: "",
        positions: 1,
        applyBefore: "",
        startDate: "",
        category: "", // reset
        categoryTitle: ""
      });
      setTags([]);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to create job."
      );
    }
  };

  const moveMarginAtTop = {
    marginTop: "-04px"
  }

  /* -------------------------------------------------------------------------- */
  /*                             Form Validation                                */
  /* -------------------------------------------------------------------------- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.title ||
      !formData.location ||
      !formData.salary ||
      !formData.description ||
      !formData.schedule ||
      !formData.applyBefore ||
      !formData.positions ||
      !formData.category ||
      (formData.category === "others" &&
        !formData.categoryTitle.trim())
    ) {
      toast.error("Please fill in all required fields.");
      return;
}

    postJob();
  };

  /* -------------------------------------------------------------------------- */
  /*                                   Render                                   */
  /* -------------------------------------------------------------------------- */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Post a New Job
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to create a job posting that workers can apply to.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Basic Information
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input
                  placeholder="e.g., Construction Worker"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Job Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-Time">Full-Time</SelectItem>
                    <SelectItem value="Part-Time">Part-Time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Temporary">Temporary</SelectItem>
                    <SelectItem value="Intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                  <Input
                    placeholder="Enter category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value,
                        categoryTitle: e.target.value,
                      })
                    }
                  />
              </div>

              <div className="space-y-3 mb-25" style={moveMarginAtTop}>
                <Label>Location *</Label>

                <div className="flex flex-col gap-3">

                  {/* Search bar */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search place, city, barangay, address..."
                      value={mapQuery}
                      onChange={(e) => setMapQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleLocationSearch();
                        }
                      }}
                    />

                    <Button type="button" onClick={handleLocationSearch}>
                      Search
                    </Button>
                  </div>

                  {/* Map */}
                  <div
                    className="ratio ratio-4x3 mb-12"
                    style={{ maxWidth: "500px", height: "300px" }}
                  >
                    <iframe
                      src={mapUrl}
                      style={{
                        border: 0,
                        borderRadius: "12px",
                        width: "100%",
                        height: "100%",
                      }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Google Map"
                                          className="mb-2"
                    />
                    {formData.location ? (
                        <div>
                          <strong>Location:</strong> {formData.location}
                        </div>
                    ) : (
                        <div></div>
                    )}
                  </div>

                </div>
              </div>

              <div className="space-y-2">
                <Label>Salary/Rate *</Label>
                <Input
                  placeholder="e.g., ₱15,000/month"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData({ ...formData, salary: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Job Description *</Label>
              <Textarea
                rows={4}
                placeholder="Describe the job responsibilities and requirements..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Additional Details
            </h3>

            <div className="space-y-2">
              <Label>Requirements (one per line)</Label>
              <Textarea
                placeholder="e.g., Must be at least 21 years old."
                rows={3}
                value={formData.requirements}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    requirements: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Benefits (one per line)</Label>
              <Textarea
                placeholder="e.g., Health Insurance, etc."
                rows={3}
                value={formData.benefits}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    benefits: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
  <Label>Tags</Label>

  <div className="flex gap-2">
    <Input
      placeholder="e.g., Construction, Urgent, Night Shift"
      value={tagInput}
      onChange={(e) => setTagInput(e.target.value)}
      onKeyDown={handleKeyDown}
    />

    <Button type="button" onClick={handleAddTag} size="icon">
      <Plus className="w-4 h-4" />
    </Button>
  </div>

  <div className="flex flex-wrap gap-2 mt-2">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
          {tag}
          <button
            type="button"
            onClick={() => handleRemoveTag(tag)}
            className="ml-1"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
    </div>

    <p className="text-xs text-muted-foreground">
      Press Enter or click + to add tags
    </p>
  </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Positions *</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.positions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      positions: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Apply Before *</Label>
                <Input
                  type="date"
                  value={formData.applyBefore}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      applyBefore: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    startDate: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Work Schedule *</Label>
              <Input
                placeholder="e.g., Monday to Friday, 8 AM - 5 PM"
                value={formData.schedule}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    schedule: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Post Job</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PostJobModal;