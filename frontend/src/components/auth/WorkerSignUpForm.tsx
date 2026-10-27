import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, X, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PhoneInput from "./PhoneInput";
import OTPVerification from "./OTPVerification";
import DocumentScanUpload, { DocumentScanResult } from "./DocumentScanUpload";
import { matchOption, toEmail, toLocalMobile, toPlainText } from "./autofill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { API_ORIGIN } from "@/lib/apiOrigin";

axios.defaults.withCredentials = true;

interface WorkerSignUpFormProps {
  onClose: () => void;
}

interface WorkerFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  skill: string;
  jobTitle: string;
}

interface SkillCategory {
  _id: string;
  title: string;
}

// Details the AI read from the uploaded resume.
interface ResumeFields {
  full_name: string;
  email: string;
  phone: string;
  job_title: string;
  skill_category: string;
  skills: string[];
}

const JOB_TITLES = [
  "Construction Laborer", "Carpenter", "Electrician", "Plumber", "Mason", "Painter", "Welder",
  "Pipe Fitter", "Steel Fixer", "Roofer", "Tile Setter", "Drywall Installer", "Concrete Finisher",
  "Scaffolder", "Glazier", "Insulation Worker", "Demolition Worker", "Heavy Equipment Operator",
  "Forklift Operator", "Crane Operator", "Machine Operator", "HVAC Technician", "Refrigeration Technician",
  "Maintenance Technician", "Building Maintenance Worker", "Mechanic", "Auto Mechanic", "Motorcycle Mechanic",
  "Diesel Mechanic", "Fabricator", "Assembler", "Production Worker", "Factory Worker", "Warehouse Worker",
  "Delivery Driver", "Truck Driver", "Landscaper", "Gardener", "Janitor", "Cleaner", "Housekeeper",
  "Security Guard", "Fire Safety Officer", "Solar Panel Installer", "Water Pump Technician", "Foreman",
  "Site Supervisor", "General Contractor",
];

const WorkerSignUpForm = ({ onClose }: WorkerSignUpFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  // Server-issued proof that the email was verified; required by the register endpoint.
  const [emailToken, setEmailToken] = useState("");
  // Whether the email was filled in from the resume, to tell the user what to do next.
  const [emailAutofill, setEmailAutofill] = useState<"filled" | "missing" | null>(null);
  const [customJobTitle, setCustomJobTitle] = useState("");
  const [customSkillCategory, setCustomSkillCategory] = useState("");

  const [formData, setFormData] = useState<WorkerFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    skill: "",
    jobTitle: ""
  });

  const [files, setFiles] = useState<{
    photo: File | null;
  }>({
    photo: null,
  });

  // Signed proof that the resume was verified by AI; required by the register endpoint.
  const [documentToken, setDocumentToken] = useState("");

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Fetch skill categories
  const fetchSkills = async () => {
    const result = await axios.get(`${API_ORIGIN}/api/auth/ViewSkills`);
    return result.data;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["ViewSkills"],
    queryFn: fetchSkills,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error instanceof Error) return <div>Error: {error.message}</div>;

  // Backup Code in case if there is an error with using the array:
  // const skillCategoryOptions: SkillCategory[] = data.skills;

  const skillCategoryOptions = [
    {
      _id: "021",
      title: "Construction"
    },
    {
      _id: "022",
      title: "Electrical"
    },
    {
      _id: "023",
      title: "Plumbing"
    },
    {
      _id: "024",
      title: "Farmer"
    },
    {
      _id: "025",
      title: "Janitor"
    },
    {
      _id: "026",
      title: "Food"
    },
    {
      _id: "027",
      title: "Furniture"
    },
    {
      _id: "028",
      title: "Sales Clerk"
    },
    {
      _id: "029",
      title: "Photographer"
    },
    {
      _id: "030",
      title: "Cook"
    },
    {
      _id: "031",
      title: "Waiter"
    },
    {
      _id: "032",
      title: "Retail Workers"
    },
    {
      _id: "033",
      title: "Home-Based"
    },
    {
      _id: "034",
      title: "Technology"
    },
    {
      _id: "035",
      title: "Office Work"
    }
  ];

  // Pre-fill the form from the verified resume; anything not found stays as it was.
  const handleResumeVerified = ({ documentToken, fields }: DocumentScanResult<ResumeFields>) => {
    setDocumentToken(documentToken);

    const jobTitle = matchOption(fields.job_title, JOB_TITLES);
    const skillCategory = matchOption(fields.skill_category, skillCategoryOptions.map((o) => o.title));
    const customJob = toPlainText(fields.job_title);
    const customCategory = toPlainText(fields.skill_category);

    // The resume's email only fills an empty (or previously auto-filled) field. An email the
    // user typed, is verifying with an OTP, or has verified always wins.
    const canFillEmail = !isEmailVerified && step !== "otp" && (!formData.email.trim() || emailAutofill === "filled");
    const resumeEmail = canFillEmail ? toEmail(fields.email) : "";
    if (canFillEmail) setEmailAutofill(resumeEmail ? "filled" : "missing");

    setFormData((prev) => ({
      ...prev,
      name: toPlainText(fields.full_name, 35) || prev.name,
      email: resumeEmail || prev.email,
      phoneNumber: toLocalMobile(fields.phone) || prev.phoneNumber,
      jobTitle: jobTitle ?? (customJob ? "Others" : prev.jobTitle),
      skill: skillCategory ?? (customCategory ? "Others" : prev.skill),
    }));
    if (!jobTitle && customJob) setCustomJobTitle(customJob);
    if (!skillCategory && customCategory) setCustomSkillCategory(customCategory);

    const resumeSkills = (fields.skills || [])
      .map((s) => s.replace(/[^A-Za-z ]/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    setSkills((prev) => Array.from(new Set([...prev, ...resumeSkills])).slice(0, 15));
  };

  // Add skill
  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  // Remove skill
  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  // Add skill on Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    if (e.target.name === "email") {
      setEmailAutofill(null);
      if (isEmailVerified) setIsEmailVerified(false);
    }
  };

  // Send OTP
  const handleSendOTP = async () => {
    if (!formData.email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setStep("otp");
    setIsButtonDisabled(true);

    try {
      await axios.get(`${API_ORIGIN}/api/auth/otp/${encodeURIComponent(formData.email)}`)
    } catch (error: unknown) {
      setStep("form");
      setIsButtonDisabled(false);
      toast({
        title: "OTP Failed",
        description: axios.isAxiosError<{ info?: string }>(error)
          ? error.response?.data?.info || "Failed to send OTP"
          : error instanceof Error ? error.message : "Failed to send OTP",
        variant: "destructive",
      });
    }
  };

  // Submit form
  const submit = async () => {
    try {
      const formDataToSend = new FormData();

      // Append text fields
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("password", formData.password);
      formDataToSend.append(
        "phoneNumber",
        `+63${formData.phoneNumber}`
      );
      formDataToSend.append("role", "worker");
      formDataToSend.append(
        "jobTitle",
        formData.jobTitle === "Others"
          ? customJobTitle
          : formData.jobTitle
      );

      formDataToSend.append(
        "skill",
        formData.skill === "Others"
          ? customSkillCategory
          : formData.skill
      );

      // Append skills
      skills.forEach((skill) => {
        formDataToSend.append("skills", skill);
      });

      // Optional photo
      if (files.photo) {
        formDataToSend.append("photo", files.photo);
      }

      // The resume itself was already uploaded and verified in step 1.
      formDataToSend.append("documentToken", documentToken);

      formDataToSend.append("emailToken", emailToken);

      const response = await axios.post(
        `${API_ORIGIN}/api/auth/worker/register`,
        formDataToSend,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast({
        title: "Success",
        description: response.data.message,
      });

      onClose();
    } catch (error: unknown) {
      if (axios.isAxiosError<{ message?: string }>(error) && error.response) {
        toast({
          title: "Registration Failed",
          description: error.response.data.message || "Could not create your account.",
          variant: "destructive",
        });
      } else if (axios.isAxiosError(error) && error.request) {
        toast({
          title: "Server Error",
          description: "No response from the server.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Could not create your account.",
          variant: "destructive",
        });
      }
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEmailVerified) {
      toast({
        title: "Email Not Verified",
        description: "Please verify your email first.",
        variant: "destructive",
      });
      return;
    }

    if (!documentToken) {
      toast({
        title: "Resume Required",
        description: "Please upload your resume and wait for it to be verified.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    submit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* <FileUpload
        label="Profile Photo (Optional)"
        accept="image/*"
        file={files.photo}
        onChange={(file) =>
          setFiles((prev) => ({ ...prev, photo: file }))
        }
      /> */}

      {/* Step 1: resume first; AI verifies it and fills in the rest */}
      <DocumentScanUpload<ResumeFields>
        label="CV / Resume *"
        accept=".pdf,.docx"
        helpText="Upload your CV or resume in PDF or DOCX format."
        field="resume"
        onVerified={handleResumeVerified}
        onCleared={() => setDocumentToken("")}
      />

      {documentToken && (
      <>
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="worker-name">Full Name</Label>
        <p className="text-xs text-muted-foreground">Must match the name on your resume.</p>
        <Input
          id="worker-name"
          name="name"
          type="text"
          placeholder="Enter your full name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      {/* Email with OTP */}
      <div className="space-y-3">
        <Label htmlFor="worker-email">Email</Label>
        <Input
          id="worker-email"
          name="email"
          type="email"
          placeholder="Enter your email address"
          value={formData.email}
          onChange={handleChange}
          required
          // Locked while a code is pending, so the code is always checked against this address.
          disabled={isEmailVerified || step === "otp"}
        />

        {!isEmailVerified && step !== "otp" && emailAutofill === "filled" && (
          <p className="text-xs text-muted-foreground">
            Filled in from your resume. You can change it before sending the OTP.
          </p>
        )}
        {!isEmailVerified && step !== "otp" && emailAutofill === "missing" && (
          <p className="text-xs text-muted-foreground">
            No email was found on your resume. Please type it in.
          </p>
        )}

        {!isEmailVerified && step !== "otp" && (
          <Button
            disabled={isButtonDisabled}
            type="button"
            variant="secondary"
            onClick={handleSendOTP}
            className="w-full"
          >
            Send OTP to Email
          </Button>
        )}

        {!isEmailVerified && step === "otp" && (
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Code sent to <span className="font-medium text-foreground">{formData.email}</span></span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => {
                setStep("form");
                setIsButtonDisabled(false);
              }}
            >
              Use a different email
            </Button>
          </div>
        )}

        {step === "otp" && !isEmailVerified && (
          <OTPVerification
            email={formData.email}
            purpose="register"
            onVerified={(token) => {
              setEmailToken(token);
              setIsEmailVerified(true);
              setStep("form");
              toast({
                title: "Email Verified",
                description: "Your email has been successfully verified.",
              });
            }}
            onResend={() =>
              toast({
                title: "OTP Resent",
                description: `A new OTP has been sent to ${formData.email}.`,
              })
            }
          />
        )}

        {isEmailVerified && (
          <div className="text-sm text-green-600 font-medium">
            ✓ Email verified
          </div>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="worker-password">Password</Label>
        <div className="relative">
          <Input
            id="worker-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a secure password"
            value={formData.password}
            onChange={handleChange}
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="worker-confirm-password">Confirm Password</Label>
        <div className="relative">
          <Input
            id="worker-confirm-password"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Phone Number */}
      <PhoneInput
        value={formData.phoneNumber}
        onChange={(value) =>
          setFormData({ ...formData, phoneNumber: value })
        }
      />

      <div className="space-y-2">
        <Label>Job Title</Label>

        <Select
          value={formData.jobTitle}
          onValueChange={(value) =>
            setFormData({ ...formData, jobTitle: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Job Title" />
          </SelectTrigger>

          <SelectContent>
            {JOB_TITLES.map((title) => (
              <SelectItem key={title} value={title}>{title}</SelectItem>
            ))}
            <SelectItem value="Others">Others</SelectItem>
          </SelectContent>
        </Select>

        {formData.jobTitle === "Others" && (
          <Input
            placeholder="Enter Job Title"
            value={customJobTitle}
            onChange={(e) => setCustomJobTitle(e.target.value)}
            required
          />
        )}
      </div>

      {/* Skill Category */}
      <div className="space-y-2">
        <Label>Skill Category</Label>

        <Select
          value={formData.skill}
          onValueChange={(value) =>
            setFormData({ ...formData, skill: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a skill category" />
          </SelectTrigger>

          <SelectContent>
            {skillCategoryOptions.map((option) => (
              <SelectItem key={option._id} value={option.title}>
                {option.title}
              </SelectItem>
            ))}

            <SelectItem value="Others">Others</SelectItem>
          </SelectContent>
        </Select>

        {formData.skill === "Others" && (
          <Input
            placeholder="Enter Skill Category"
            value={customSkillCategory}
            onChange={(e) => setCustomSkillCategory(e.target.value)}
            required
          />
        )}
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <Label>Add Skills</Label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., Carpentry"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddSkill}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {skills.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(tag)}
                  className="ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!isEmailVerified || !documentToken}
      >
        Sign Up as Worker
      </Button>
      </>
      )}
    </form>
  );
};

export default WorkerSignUpForm;