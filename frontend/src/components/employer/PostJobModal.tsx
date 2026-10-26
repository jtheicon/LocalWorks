import { useEffect, useRef, useState } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { todayInputDate, isPastInputValue } from "@/lib/utils";
import DagupanLocationPicker from "@/components/DagupanLocationPicker";

axios.defaults.withCredentials = true;

// Shown even when the Industries collection is empty; merged with approved industries.
const DEFAULT_CATEGORIES = [
  "Construction", "Electrical", "Plumbing", "Farmer", "Janitor", "Food",
  "Furniture", "Sales Clerk", "Photographer", "Cook", "Waiter",
  "Retail Workers", "Home-Based", "Technology", "Office Work",
];

const PAY_FREQUENCIES = [
  { value: "Daily", suffix: "day" },
  { value: "Weekly", suffix: "week" },
  { value: "Semi-Monthly", suffix: "semi-monthly" }, // paid twice a month (15th and 30th)
  { value: "Monthly", suffix: "month" },
] as const;

type PayFrequency = (typeof PAY_FREQUENCIES)[number]["value"];

// e.g. 15000 + "Monthly" -> "₱15,000/month", 7500 + "Semi-Monthly" -> "₱7,500/semi-monthly"
// (salary is stored as a string on the Job model)
const formatSalary = (amount: string, frequency: PayFrequency) => {
  const suffix = PAY_FREQUENCIES.find((f) => f.value === frequency)?.suffix;
  return `₱${Number(amount).toLocaleString("en-PH")}/${suffix}`;
};

const EMPTY_FORM = {
  title: "",
  location: "",
  salaryAmount: "",
  payFrequency: "Monthly" as PayFrequency,
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
};

// The parts of a saved job the form can edit.
export interface EditableJob {
  _id: string;
  title: string;
  location: string;
  salary: string;
  type: string;
  description: string;
  requirements: string[];
  benefits: string[];
  tags: string[];
  schedule: string;
  positions: number;
  applyBefore: string;
  startDate: string;
  category: string;
}

interface PostJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pass a job to edit it; leave out to post a new one.
  job?: EditableJob | null;
}

const isInputDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");

// "₱15,000/month" -> { salaryAmount: "15000", payFrequency: "Monthly" }
const parseSalary = (salary: string) => {
  const amount = (salary || "").replace(/,/g, "").match(/\d+(\.\d+)?/)?.[0] ?? "";
  const lower = (salary || "").toLowerCase();
  // "semi" is checked first because "semi-monthly" also contains "month".
  const payFrequency: PayFrequency = lower.includes("semi")
    ? "Semi-Monthly"
    : lower.includes("day") ? "Daily" : lower.includes("week") ? "Weekly" : "Monthly";
  return { salaryAmount: amount, payFrequency };
};

const formFromJob = (job: EditableJob) => ({
  ...EMPTY_FORM,
  title: job.title || "",
  location: job.location || "", // older, non-Dagupan locations must be re-picked
  ...parseSalary(job.salary),
  type: job.type || "Full-Time",
  description: job.description || "",
  requirements: (job.requirements || []).join("\n"),
  benefits: (job.benefits || []).join("\n"),
  schedule: job.schedule || "",
  positions: job.positions || 1,
  applyBefore: isInputDate(job.applyBefore) ? job.applyBefore : "",
  startDate: isInputDate(job.startDate) ? job.startDate : "",
  category: job.category || "",
  categoryTitle: "",
});

interface Location {
  _id: string;
  name: string;
}

const PostJobModal = ({ open, onOpenChange, job = null }: PostJobModalProps) => {
  const queryClient = useQueryClient();

  /* -------------------------------------------------------------------------- */
  /*                                Form State                                  */
  /* -------------------------------------------------------------------------- */
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Recomputed every render so the date pickers never offer a past day,
  // even if the modal stays open past midnight.
  const minDate = todayInputDate();
  const minStartDate =
    formData.applyBefore && formData.applyBefore > minDate ? formData.applyBefore : minDate;

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Editing: fill the form from the job once per opening. Opening for a new post after
  // an edit starts from a blank form instead of the edited job's values.
  const filledFrom = useRef<string | null>(null);
  useEffect(() => {
    if (!open) return;
    if (job && filledFrom.current !== job._id) {
      setFormData(formFromJob(job));
      setTags(job.tags || []);
      filledFrom.current = job._id;
    } else if (!job && filledFrom.current) {
      setFormData(EMPTY_FORM);
      setTags([]);
      filledFrom.current = null;
    }
  }, [open, job]);

  // An unchanged date may stay even if it has passed (the server allows that too).
  const minApplyBefore = job?.applyBefore && job.applyBefore < minDate && formData.applyBefore === job.applyBefore ? job.applyBefore : minDate;
  const minStart = job?.startDate && job.startDate < minStartDate && formData.startDate === job.startDate ? job.startDate : minStartDate;

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

  const categoryOptions = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...industries.map((i: { title: string }) => i.title).filter(Boolean),
      ...(job?.category ? [job.category] : []),
    ])
  ).sort((a, b) => a.localeCompare(b));

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
          salary: formatSalary(formData.salaryAmount, formData.payFrequency),
          description: formData.description,
          requirements: formData.requirements
            .split("\n")
            .map((r) => r.trim())
            .filter(Boolean),
          benefits: formData.benefits
            .split("\n")
            .map((b) => b.trim())
            .filter(Boolean),
          tags,
          schedule: formData.schedule,
          startDate: formData.startDate || undefined,
          positions: Number(formData.positions),
          applyBefore: formData.applyBefore,
          category: formData.category === "others" ? formData.categoryTitle.trim() : formData.category,
          categoryTitle: formData.category === "others" ? formData.categoryTitle.trim() : formData.category,
        };

      const { data } = job
        ? await axios.put(`http://localhost:8920/api/pro/job/${job._id}`, Payload)
        : await axios.post("http://localhost:8920/api/pro/createJob", Payload);

      toast.success(data.message, {
        description: job
          ? "Workers will see your changes once the job is re-checked."
          : "Workers can now view and apply to your job posting.",
      });

      queryClient.invalidateQueries({ queryKey: ["postedJobs"] });

      // Reset form
      setFormData(EMPTY_FORM);
      setTags([]);
      filledFrom.current = null;
      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || (job ? "Failed to update job." : "Failed to create job.")
      );
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                             Form Validation                                */
  /* -------------------------------------------------------------------------- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.title ||
      !formData.location ||
      !formData.salaryAmount ||
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

    // Skills drive job matching, so a job needs at least one.
    if (!tags.length) {
      toast.error("Add at least one required skill.");
      return;
    }

    if (Number(formData.salaryAmount) <= 0) {
      toast.error("Salary must be greater than 0.");
      return;
    }

    // `min` only limits the picker; typed-in dates still need checking.
    if (isPastInputValue(formData.applyBefore, minApplyBefore)) {
      toast.error("Apply Before date cannot be in the past.");
      return;
    }

    if (isPastInputValue(formData.startDate, minStart)) {
      toast.error("Start Date cannot be in the past or before the Apply Before date.");
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
            {job ? "Edit Job Post" : "Post a New Job"}
          </DialogTitle>
          <DialogDescription>
            {job
              ? "Fix or update your job post. It will be re-checked before workers see the changes."
              : "Fill in the details below to create a job posting that workers can apply to."}
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
                    <SelectItem value="Intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Job Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category: value,
                      categoryTitle: value === "others" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={industryLoading ? "Loading categories..." : "Select a category"}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {categoryOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    <SelectItem value="others">Others (specify)</SelectItem>
                  </SelectContent>
                </Select>
                {formData.category === "others" && (
                  <Input
                    placeholder="Enter category"
                    value={formData.categoryTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryTitle: e.target.value })
                    }
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Salary/Rate *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ₱
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      step="any"
                      placeholder="15000"
                      className="pl-7"
                      value={formData.salaryAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, salaryAmount: e.target.value })
                      }
                    />
                  </div>
                  <Select
                    value={formData.payFrequency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, payFrequency: value as PayFrequency })
                    }
                  >
                    <SelectTrigger className="w-[140px]" aria-label="Pay frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAY_FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Location *</Label>
                <DagupanLocationPicker
                  value={formData.location}
                  onChange={(location) => setFormData((prev) => ({ ...prev, location }))}
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
  <Label>Skills *</Label>

  <div className="flex gap-2">
    <Input
      placeholder="e.g., Carpentry, Plumbing, Electrical Wiring"
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
      Press Enter or click + to add skills
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
                  min={minApplyBefore}
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
                min={minStart}
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
            <Button type="submit">{job ? "Save Changes" : "Post Job"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PostJobModal;