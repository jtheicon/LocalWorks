import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PhoneInput from "./PhoneInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FileUpload from "./FileUpload";
import OTPVerification from "./OTPVerification";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

interface EmployerSignUpFormProps {
  onClose: () => void;
}

const EmployerSignUpForm = ({ onClose }: EmployerSignUpFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [newDate, setnewDate] = useState(null);
  const [otpFromEmail, setOtpFromEmail] = useState(null);
    
  const [formData, setFormData] = useState({
    company: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    industry: "",
    industryTitle: "No Industry Title Provided",
  });
  
  const [files, setFiles] = useState<{
    permit: File | null;
  }>({
    permit: null,
  });

const Register = async () => {
  if (!files.permit || files.permit.size === 0) {
    toast({
      title: "No Business Permit Included",
      description: "Please enter a valid business permit",
      variant: "destructive"
    })
    return;
  }

  const formDataToSend = new FormData();
  
  formDataToSend.append("permit", files.permit)

  await axios.post("http://localhost:8920/api/auth/upload/permit", formDataToSend, {
    withCredentials: true
  })
    .then(async function (response) {
      await axios.post(
        "http://localhost:8920/api/auth/employer/register",
        {
          company: formData.company,
          email: formData.email,
          password: formData.password,
          phone: `+63${formData.phone}`,
          industry: formData.industry,
          industryTitle: formData.industryTitle,
          permit: response.data.filename.filename
        },
        {
          withCredentials: true
        }
      )
        .then(function (response) {
          toast({
            title: "Success",
            description: response.data.message
          });

          onClose()
        })
        .catch(function (error) {
          toast({
            title: "An error occured",
            description: error.response.data.message,
            variant: "destructive"
          })
        })
    })
    .catch(function (error) {
      let description = ""
      if (error.response.data.errors.code === "LIMIT_FILE_SIZE") {
        description = "The file you are sending is too large, it should be a maximum of 15 MB"
      }

      toast({
        title: "An error occured",
        description,
        variant: "destructive"
      })
    })
};

  const IndustryInfo = async () => {
    const result = await axios.get("http://localhost:8920/api/auth/dropdown", { withCredentials: true })
    return result.data
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['IndustryInformation'],
    queryFn: IndustryInfo
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  const industryOptions = data.Industries;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Reset verification if email changes
    if (e.target.name === "email" && isEmailVerified) {
      setIsEmailVerified(false);
    }
  };

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
      const res = await axios.get(`http://localhost:8920/api/auth/otp/${formData.email}`)

      setnewDate(res.data.newDate)
      setOtpFromEmail(res.data.otp)

      console.log(otpFromEmail)
      console.log(step)
    } catch (error) {
      toast({
        title: "OTP Failed",
        description: "Failed to send OTP",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isEmailVerified) {
      
      toast({
        title: "An error occured",
        description: "Please verify your email first",
        variant: "destructive"
      })
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      })
      return;
    }

    console.log("Employer signup:", { ...formData, files });
    Register();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="company-name">Company/Business Name</Label>
        <Input
          id="company-name"
          name="company"
          type="text"
          placeholder="Enter your company or business name"
          value={formData.company}
          onChange={handleChange}
          required
        />
      </div>

      {/* Email with OTP */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="employer-email">Email</Label>
          <Input
            id="employer-email"
            name="email"
            type="email"
            placeholder="Enter your business email address"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isEmailVerified}
          />
        </div>
        
        {!isEmailVerified && (
          <Button disabled={isButtonDisabled} type="button" variant="secondary" onClick={handleSendOTP} className="w-full">
            Send OTP to Email
          </Button>
        )}
        
        {step === "otp" && !isEmailVerified && (
          <OTPVerification
            email={formData.email}
            otpFromEmail={otpFromEmail}
            newDate={newDate}
            onVerified={() => {
              setIsEmailVerified(true);
              setStep("form");
            }}
            onResend={() => console.log("OTP resent to " + formData.email)}
          />
        )}
        
        {isEmailVerified && (
          <div className="text-sm text-green-600 font-medium">
            <span className="text-sm text-primary">✓ Email verified</span>
          </div>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="employer-password">Password</Label>
        <div className="relative">
          <Input
            id="employer-password"
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="employer-confirm-password">Confirm Password</Label>
        <div className="relative">
          <Input
            id="employer-confirm-password"
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
        value={formData.phone}
        onChange={(value) => setFormData({ ...formData, phone: value })}
      />

      {/* Industry */}
      <div className="space-y-2">
        <Label htmlFor="employer-industry">Industry</Label>
        <Select
          value={formData.industry}
          onValueChange={(value) => {
            setFormData({ ...formData, industryTitle: "No Industry Title Provided", industry: value })
          }}
        >
          <SelectTrigger id="employer-industry">
            <SelectValue placeholder="Select your industry" />
          </SelectTrigger>
          <SelectContent>
            {industryOptions.map((option) => (
              <SelectItem key={option._id} value={option._id}>
                {option.title}
              </SelectItem>
            ))}

            <SelectItem value="others">
              Others
            </SelectItem>
          </SelectContent>
        </Select>
        {formData.industry === "others" && (
          <div className="space-y-2">
            <Label>Industry Name</Label>
            <Input
              value={formData.industryTitle}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  industryTitle: e.target.value,
                })
              }
              placeholder="Enter industry name"
            />
          </div>
        )}
      </div>

      {/* Business Permit Upload */}
      <FileUpload
        label="Business/Company Permit"
        accept="image/*"
        file={files.permit}   // ✅ REQUIRED
        onChange={(file) =>
          setFiles((prev) => ({ ...prev, permit: file }))
        }
        helpText="Upload a photo or scan of your business permit. Maximum of 15 MB."
        type="image"
      />

      <Button type="submit" className="w-full" size="lg" disabled={!isEmailVerified}>
        Sign Up as Employer
      </Button>
    </form>
  );
};

export default EmployerSignUpForm;
