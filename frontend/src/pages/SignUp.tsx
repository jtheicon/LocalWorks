import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { User, Briefcase, Upload, Image, FileText, ArrowLeft, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const SignUp = () => {
  const [workerForm, setWorkerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    profilePicture: null as File | null,
    resume: null as File | null,
  });

  const [employerForm, setEmployerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    businessPermit: null as File | null,
  });

  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [permitPreview, setPermitPreview] = useState<string | null>(null);
  
  const [workerOtpSent, setWorkerOtpSent] = useState(false);
  const [workerOtp, setWorkerOtp] = useState("");
  const [employerOtpSent, setEmployerOtpSent] = useState(false);
  const [employerOtp, setEmployerOtp] = useState("");

  const handleSendWorkerOtp = () => {
    if (workerForm.phone) {
      console.log("Sending OTP to:", workerForm.phone);
      setWorkerOtpSent(true);
      alert("OTP sent! (Frontend only - no actual OTP sent)");
    } else {
      alert("Please enter your phone number first");
    }
  };

  const handleSendEmployerOtp = () => {
    if (employerForm.phone) {
      console.log("Sending OTP to:", employerForm.phone);
      setEmployerOtpSent(true);
      alert("OTP sent! (Frontend only - no actual OTP sent)");
    } else {
      alert("Please enter your phone number first");
    }
  };

  const handleWorkerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setWorkerForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEmployerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmployerForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWorkerForm(prev => ({ ...prev, profilePicture: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWorkerForm(prev => ({ ...prev, resume: file }));
      setResumeName(file.name);
    }
  };

  const handlePermitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEmployerForm(prev => ({ ...prev, businessPermit: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPermitPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Worker signup:", workerForm);
    alert("Worker signup submitted! (Frontend only - no data stored)");
  };

  const handleEmployerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Employer signup:", employerForm);
    alert("Employer signup submitted! (Frontend only - no data stored)");
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <Card className="border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Create Your Account</CardTitle>
            <CardDescription className="text-lg">
              Join LocalWorks as a Worker or Employer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="worker" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="worker" className="gap-2">
                  <User className="w-4 h-4" />
                  Worker
                </TabsTrigger>
                <TabsTrigger value="employer" className="gap-2">
                  <Briefcase className="w-4 h-4" />
                  Employer
                </TabsTrigger>
              </TabsList>

              {/* Worker Sign Up Form */}
              <TabsContent value="worker">
                <form onSubmit={handleWorkerSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="worker-firstName">First Name</Label>
                      <Input
                        id="worker-firstName"
                        name="firstName"
                        placeholder="John"
                        value={workerForm.firstName}
                        onChange={handleWorkerChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="worker-lastName">Last Name</Label>
                      <Input
                        id="worker-lastName"
                        name="lastName"
                        placeholder="Doe"
                        value={workerForm.lastName}
                        onChange={handleWorkerChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="worker-email">Email</Label>
                    <Input
                      id="worker-email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={workerForm.email}
                      onChange={handleWorkerChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="worker-phone">Phone Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="worker-phone"
                        name="phone"
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={workerForm.phone}
                        onChange={handleWorkerChange}
                        required
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendWorkerOtp}
                        disabled={workerOtpSent}
                        className="gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {workerOtpSent ? "Sent" : "Send OTP"}
                      </Button>
                    </div>
                  </div>

                  {workerOtpSent && (
                    <div className="space-y-2">
                      <Label>Enter OTP</Label>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={workerOtp}
                          onChange={(value) => setWorkerOtp(value)}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Enter the 6-digit code sent to your phone
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="worker-password">Password</Label>
                      <Input
                        id="worker-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={workerForm.password}
                        onChange={handleWorkerChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="worker-confirmPassword">Confirm Password</Label>
                      <Input
                        id="worker-confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={workerForm.confirmPassword}
                        onChange={handleWorkerChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Profile Picture Upload */}
                  <div className="space-y-2">
                    <Label>Profile Picture</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                        {profilePicturePreview ? (
                          <img src={profilePicturePreview} alt="Profile preview" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <Label
                          htmlFor="profile-picture"
                          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Photo
                        </Label>
                        <Input
                          id="profile-picture"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleProfilePictureChange}
                        />
                        <p className="text-sm text-muted-foreground mt-1">JPG, PNG up to 5MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Resume/CV Upload */}
                  <div className="space-y-2">
                    <Label>Resume / CV</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      {resumeName ? (
                        <p className="text-sm font-medium text-foreground">{resumeName}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Drop your resume here or click to upload</p>
                      )}
                      <Label
                        htmlFor="resume"
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 mt-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Choose File
                      </Label>
                      <Input
                        id="resume"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleResumeChange}
                      />
                      <p className="text-xs text-muted-foreground mt-2">PDF, DOC, DOCX up to 10MB</p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Create Worker Account
                  </Button>
                </form>
              </TabsContent>

              {/* Employer Sign Up Form */}
              <TabsContent value="employer">
                <form onSubmit={handleEmployerSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employer-firstName">First Name</Label>
                      <Input
                        id="employer-firstName"
                        name="firstName"
                        placeholder="Jane"
                        value={employerForm.firstName}
                        onChange={handleEmployerChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employer-lastName">Last Name</Label>
                      <Input
                        id="employer-lastName"
                        name="lastName"
                        placeholder="Smith"
                        value={employerForm.lastName}
                        onChange={handleEmployerChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employer-email">Email</Label>
                    <Input
                      id="employer-email"
                      name="email"
                      type="email"
                      placeholder="jane@company.com"
                      value={employerForm.email}
                      onChange={handleEmployerChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employer-phone">Phone Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="employer-phone"
                        name="phone"
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={employerForm.phone}
                        onChange={handleEmployerChange}
                        required
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendEmployerOtp}
                        disabled={employerOtpSent}
                        className="gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {employerOtpSent ? "Sent" : "Send OTP"}
                      </Button>
                    </div>
                  </div>

                  {employerOtpSent && (
                    <div className="space-y-2">
                      <Label>Enter OTP</Label>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={employerOtp}
                          onChange={(value) => setEmployerOtp(value)}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Enter the 6-digit code sent to your phone
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="employer-companyName">Company / Business Name</Label>
                    <Input
                      id="employer-companyName"
                      name="companyName"
                      placeholder="ABC Company Inc."
                      value={employerForm.companyName}
                      onChange={handleEmployerChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employer-password">Password</Label>
                      <Input
                        id="employer-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={employerForm.password}
                        onChange={handleEmployerChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employer-confirmPassword">Confirm Password</Label>
                      <Input
                        id="employer-confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={employerForm.confirmPassword}
                        onChange={handleEmployerChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Business Permit Upload */}
                  <div className="space-y-2">
                    <Label>Business Permit / Company Registration</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      {permitPreview ? (
                        <img src={permitPreview} alt="Permit preview" className="max-h-40 mx-auto rounded-lg mb-2" />
                      ) : (
                        <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      )}
                      <p className="text-sm text-muted-foreground">
                        {permitPreview ? "Business permit uploaded" : "Upload your business permit or company registration"}
                      </p>
                      <Label
                        htmlFor="business-permit"
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 mt-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        {permitPreview ? "Change File" : "Choose File"}
                      </Label>
                      <Input
                        id="business-permit"
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handlePermitChange}
                      />
                      <p className="text-xs text-muted-foreground mt-2">JPG, PNG, PDF up to 10MB</p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Create Employer Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
