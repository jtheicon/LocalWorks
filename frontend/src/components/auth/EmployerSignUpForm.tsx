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
import OTPVerification from "./OTPVerification";
import DocumentScanUpload, { DocumentScanResult } from "./DocumentScanUpload";
import { matchOption, toEmail, toLocalMobile, toPlainText } from "./autofill";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

interface EmployerSignUpFormProps {
  onClose: () => void;
}

// Details the AI read from the uploaded business permit.
interface PermitFields {
  business_name: string;
  phone: string;
  email: string;
  industry: string;
}

const EmployerSignUpForm = ({ onClose }: EmployerSignUpFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Server-issued proof that the email was verified; required by the register endpoint.
  const [emailToken, setEmailToken] = useState("");
  // Whether the email was filled in from the permit, to tell the user what to do next.
  const [emailAutofill, setEmailAutofill] = useState<"filled" | "missing" | null>(null);

  const [formData, setFormData] = useState({
    company: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    industry: "",
    industryTitle: "No Industry Title Provided",
  });
  
  // Signed proof that the permit was verified by AI; required by the register endpoint.
  const [documentToken, setDocumentToken] = useState("");

const Register = async () => {
  if (!documentToken) {
    toast({
      title: "No Business Permit Included",
      description: "Please upload your business permit and wait for it to be verified.",
      variant: "destructive"
    })
    return;
  }

  // The permit itself was already uploaded and verified in step 1.
  await axios.post(
    "http://localhost:8920/api/auth/employer/register",
    {
      company: formData.company,
      email: formData.email,
      password: formData.password,
      phone: `+63${formData.phone}`,
      industry: formData.industry,
      // Only a custom industry needs a title; a listed one is sent by id.
      ...(formData.industry === "others" ? { industryTitle: formData.industryTitle } : {}),
      documentToken,
      emailToken,
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
        description: error.response?.data?.message || error.response?.data?.info,
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

  // Pre-fill the form from the verified permit; anything not found stays as it was.
  const handlePermitVerified = ({ documentToken, fields }: DocumentScanResult<PermitFields>) => {
    setDocumentToken(documentToken);

    const industryTitle = matchOption(fields.industry, industryOptions.map((o) => o.title));
    const industry = industryOptions.find((o) => o.title === industryTitle);
    const customIndustry = toPlainText(fields.industry).replace(/[0-9]/g, "").trim();

    // The permit's email only fills an empty (or previously auto-filled) field. An email the
    // user typed, is verifying with an OTP, or has verified always wins.
    const canFillEmail = !isEmailVerified && step !== "otp" && (!formData.email.trim() || emailAutofill === "filled");
    const permitEmail = canFillEmail ? toEmail(fields.email) : "";
    if (canFillEmail) setEmailAutofill(permitEmail ? "filled" : "missing");

    setFormData((prev) => ({
      ...prev,
      company: fields.business_name?.trim() || prev.company,
      email: permitEmail || prev.email,
      phone: toLocalMobile(fields.phone) || prev.phone,
      ...(industry
        ? { industry: industry._id, industryTitle: "No Industry Title Provided" }
        : customIndustry
        ? { industry: "others", industryTitle: customIndustry }
        : {}),
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Reset verification if email changes
    if (e.target.name === "email") {
      setEmailAutofill(null);
      if (isEmailVerified) setIsEmailVerified(false);
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

    Register();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Step 1: permit first; AI verifies it and fills in the rest */}
      <DocumentScanUpload<PermitFields>
        label="Business Permit / Mayor's Permit *"
        accept="image/jpeg,image/png,application/pdf"
        helpText="Upload a clear photo, scan or PDF of your Business/Mayor's Permit, DTI, SEC or BIR certificate. Maximum of 5 MB."
        type="image"
        field="permit"
        onVerified={handlePermitVerified}
        onCleared={() => setDocumentToken("")}
      />

      {documentToken && (
      <>
      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="company-name">Company/Business Name</Label>
        <p className="text-xs text-muted-foreground">Must match the business name on your permit.</p>
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
            // Locked while a code is pending, so the code is always checked against this address.
            disabled={isEmailVerified || step === "otp"}
          />
          {!isEmailVerified && step !== "otp" && emailAutofill === "filled" && (
            <p className="text-xs text-muted-foreground">
              Filled in from your permit. You can change it before sending the OTP.
            </p>
          )}
          {!isEmailVerified && step !== "otp" && emailAutofill === "missing" && (
            <p className="text-xs text-muted-foreground">
              No email was found on your permit. Please type your business email.
            </p>
          )}
        </div>

        {!isEmailVerified && step !== "otp" && (
          <Button disabled={isButtonDisabled} type="button" variant="secondary" onClick={handleSendOTP} className="w-full">
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

      <Button type="submit" className="w-full" size="lg" disabled={!isEmailVerified || !documentToken}>
        Sign Up as Employer
      </Button>
      </>
      )}
    </form>
  );
};

export default EmployerSignUpForm;
