import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, X, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PhoneInput from "./PhoneInput";
import FileUpload from "./FileUpload";
import OTPVerification from "./OTPVerification";
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
    resume: File | null;
  }>({
    photo: null,
    resume: null,
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Fetch skill categories
  const fetchSkills = async () => {
    const result = await axios.get(
      "http://localhost:8920/api/auth/ViewSkills"
    );
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

    if (e.target.name === "email" && isEmailVerified) {
      setIsEmailVerified(false);
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
      await axios.get(`http://localhost:8920/api/auth/otp/${formData.email}`)
    } catch (error: any) {
      setStep("form");
      setIsButtonDisabled(false);
      toast({
        title: "OTP Failed",
        description: error?.response?.data?.info || "Failed to send OTP",
        variant: "destructive",
      });
    }
  };

  // Submit form
  const submit = async () => {
    try {
      if (!files.resume || files.resume.size === 0) {
        toast({
          title: "Resume Required",
          description: "Please upload your resume before signing up.",
          variant: "destructive",
        });
        return;
      }

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

      // Required resume
      formDataToSend.append("resume", files.resume);

      formDataToSend.append("emailToken", emailToken);

      const response = await axios.post(
        "http://localhost:8920/api/auth/worker/register",
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
    } catch (error: any) {
      if (error.response) {
        toast({
          title: "Registration Failed",
          description: error.response.data.message,
          variant: "destructive",
        });
      } else if (error.request) {
        toast({
          title: "Server Error",
          description: "No response from the server.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
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

    if (!files.resume) {
      toast({
        title: "Resume Required",
        description: "Please upload your resume before signing up.",
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

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="worker-name">Full Name</Label>
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
          disabled={isEmailVerified}
        />

        {!isEmailVerified && (
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
            <SelectItem value="Construction Laborer">Construction Laborer</SelectItem>
            <SelectItem value="Carpenter">Carpenter</SelectItem>
            <SelectItem value="Electrician">Electrician</SelectItem>
            <SelectItem value="Plumber">Plumber</SelectItem>
            <SelectItem value="Mason">Mason</SelectItem>
            <SelectItem value="Painter">Painter</SelectItem>
            <SelectItem value="Welder">Welder</SelectItem>
            <SelectItem value="Pipe Fitter">Pipe Fitter</SelectItem>
            <SelectItem value="Steel Fixer">Steel Fixer</SelectItem>
            <SelectItem value="Roofer">Roofer</SelectItem>
            <SelectItem value="Tile Setter">Tile Setter</SelectItem>
            <SelectItem value="Drywall Installer">Drywall Installer</SelectItem>
            <SelectItem value="Concrete Finisher">Concrete Finisher</SelectItem>
            <SelectItem value="Scaffolder">Scaffolder</SelectItem>
            <SelectItem value="Glazier">Glazier</SelectItem>
            <SelectItem value="Insulation Worker">Insulation Worker</SelectItem>
            <SelectItem value="Demolition Worker">Demolition Worker</SelectItem>
            <SelectItem value="Heavy Equipment Operator">Heavy Equipment Operator</SelectItem>
            <SelectItem value="Forklift Operator">Forklift Operator</SelectItem>
            <SelectItem value="Crane Operator">Crane Operator</SelectItem>
            <SelectItem value="Machine Operator">Machine Operator</SelectItem>
            <SelectItem value="HVAC Technician">HVAC Technician</SelectItem>
            <SelectItem value="Refrigeration Technician">Refrigeration Technician</SelectItem>
            <SelectItem value="Maintenance Technician">Maintenance Technician</SelectItem>
            <SelectItem value="Building Maintenance Worker">Building Maintenance Worker</SelectItem>
            <SelectItem value="Mechanic">Mechanic</SelectItem>
            <SelectItem value="Auto Mechanic">Auto Mechanic</SelectItem>
            <SelectItem value="Motorcycle Mechanic">Motorcycle Mechanic</SelectItem>
            <SelectItem value="Diesel Mechanic">Diesel Mechanic</SelectItem>
            <SelectItem value="Fabricator">Fabricator</SelectItem>
            <SelectItem value="Assembler">Assembler</SelectItem>
            <SelectItem value="Production Worker">Production Worker</SelectItem>
            <SelectItem value="Factory Worker">Factory Worker</SelectItem>
            <SelectItem value="Warehouse Worker">Warehouse Worker</SelectItem>
            <SelectItem value="Delivery Driver">Delivery Driver</SelectItem>
            <SelectItem value="Truck Driver">Truck Driver</SelectItem>
            <SelectItem value="Landscaper">Landscaper</SelectItem>
            <SelectItem value="Gardener">Gardener</SelectItem>
            <SelectItem value="Janitor">Janitor</SelectItem>
            <SelectItem value="Cleaner">Cleaner</SelectItem>
            <SelectItem value="Housekeeper">Housekeeper</SelectItem>
            <SelectItem value="Security Guard">Security Guard</SelectItem>
            <SelectItem value="Fire Safety Officer">Fire Safety Officer</SelectItem>
            <SelectItem value="Solar Panel Installer">Solar Panel Installer</SelectItem>
            <SelectItem value="Water Pump Technician">Water Pump Technician</SelectItem>
            <SelectItem value="Foreman">Foreman</SelectItem>
            <SelectItem value="Site Supervisor">Site Supervisor</SelectItem>
            <SelectItem value="General Contractor">General Contractor</SelectItem>
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

      <FileUpload
        label="Resume *"
        accept=".pdf,.doc,.docx"
        file={files.resume}
        onChange={(file) =>
          setFiles((prev) => ({ ...prev, resume: file }))
        }
        helpText="Upload your resume in PDF, DOC, or DOCX format."
      />

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!isEmailVerified || !files.resume}
      >
        Sign Up as Worker
      </Button>
    </form>
  );
};

export default WorkerSignUpForm;