import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Briefcase, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import axios from "axios";
import { toast } from "sonner";
import OTPVerification from "./auth/OTPVerification";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToSignUp: () => void;
  onSuccess?: () => void;
}

const LoginModal = ({ open, onOpenChange, onSwitchToSignUp, onSuccess }: LoginModalProps) => {
  const navigate = useNavigate();
  const [workerCredentials, setWorkerCredentials] = useState({ email: "", password: "" });
  const [employerCredentials, setEmployerCredentials] = useState({ email: "", password: "" });
  const [showWorkerPassword, setShowWorkerPassword] = useState(false);
  const [showEmployerPassword, setShowEmployerPassword] = useState(false);
  const [ForgotPassword, SetForgot] = useState(false);
  const [OTPEMAIL, SETOTPEMAIL] = useState("");
  const [step, setStep] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [disabled, setDisabled] = useState(false);
  // Server-issued proof of the verified OTP; required to update the password.
  const [resetToken, setResetToken] = useState("");
  const [userRole, setUserRole] = useState("");
  const [create_password, setPassword] = useState("");
  const [confirm_password, setConfirm] = useState("");

  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showConPassword, setShowConPassword] = useState(false);

  const displayOTP = {
    display: "none"
  }

    // Send OTP
    const handleSendOTP = async (role: string) => {  
      if (!OTPEMAIL.includes("@")) {
        toast.success("Please enter a valid email address.")
        return;
      }

      await axios.get(`http://localhost:8920/api/auth/otp/${OTPEMAIL}/${role}`)
        .then(function () {
          setStep("otp")
          setDisabled(true)
          toast.success("An OTP has been sent.")
        })
        .catch(function (error) {
          toast.error(error.response.data.info)
        })
    };

  const logWorker = async () => {
    await axios.post("http://localhost:8920/api/auth/worker/login", {
      ...workerCredentials, role: "worker"
    })
      .then(function (response) {
        toast.success(response.data.message)
        navigate("/worker-dashboard", { replace: true });
      })
      .catch(function (error: any) {
        if (error.response) {
          const d = error.response.data
          toast.error(d.message)
          if (d.code === "ACCOUNT_DEACTIVATED") {
            toast.info("This account was deactivated by an administrator. Contact support for help.")
          }
          if (d.code === "ACCOUNT_DELETED") {
            toast.info("Register again with the same email if you want a new account.")
          }
        } else if (error.request) {
          toast.error(error.request)
        } else {
          toast.error(error)
        }
      })
  }

  const logEmployer = async () => {
    await axios.post("http://localhost:8920/api/auth/employer/login", {
      ...employerCredentials, role: "employer"
    })
      .then(function (response) {
        toast.success(response.data.message)
        navigate("/employer-dashboard", { replace: true })
      })
      .catch(function (error: any) {
        if (error.response) {
          const d = error.response.data
          toast.error(d.message)
          if (d.code === "ACCOUNT_DEACTIVATED") {
            toast.info("This account was deactivated by an administrator. Contact support for help.")
          }
          if (d.code === "ACCOUNT_DELETED") {
            toast.info("Register again with the same email if you want a new account.")
          }
        }
      })
  }

  const handlePassword = async () => {
    await axios.put("http://localhost:8920/api/auth/password/update", { email: OTPEMAIL, role: userRole, create_password, confirm_password, resetToken }, {
      withCredentials: true
    })
      .then(function (response) {
        toast.success(response.data.info)
          setStep("")
          setDisabled(false)

          setPassword("")
          setConfirm("")
          
          setIsEmailVerified(false)
          setResetToken("")
          SetForgot(false)
          SETOTPEMAIL("")

          setShowCreatePassword(false)
          setShowConPassword(false)

      })
      .catch(function (error) {
        toast.error(error.response.data.info)
      })
  }

  const handleWorkerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    logWorker()
  };

  const handleEmployerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    logEmployer()
  };

  return (
    <div>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">Welcome Back</DialogTitle>
          <DialogDescription className="text-base">
            Log in to your LocalWorks account
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="worker" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="worker" className="gap-2">
              <User className="w-4 h-4" />
              Worker
            </TabsTrigger>
            <TabsTrigger value="employer" className="gap-2">
              <Briefcase className="w-4 h-4" />
              Employer
            </TabsTrigger>
          </TabsList>

          {/* Worker Login */}
          <TabsContent value="worker">
            <form onSubmit={handleWorkerLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="worker-email">Email</Label>
                <Input
                  id="worker-email"
                  type="email"
                  placeholder="john@example.com"
                  value={workerCredentials.email}
                  onChange={(e) => setWorkerCredentials(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="worker-password">Password</Label>
                <div className="relative">
                  <Input
                    id="worker-password"
                    type={showWorkerPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={workerCredentials.password}
                    onChange={(e) => setWorkerCredentials(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWorkerPassword(!showWorkerPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showWorkerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg">
                Login as Worker
              </Button>

              {/** Source: https://tailwindcss.com/docs/cursor */}
              {/**         https://tailwindcss.com/docs/text-align */}
              <div className="text-center cursor-pointer" onClick={() => {
                SetForgot(true);
                setUserRole("Worker");
              }}>Forgot Password?</div>
            </form>
          </TabsContent>

          {/* Employer Login */}
          <TabsContent value="employer">
            <form onSubmit={handleEmployerLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employer-email">Email</Label>
                <Input
                  id="employer-email"
                  type="email"
                  placeholder="jane@company.com"
                  value={employerCredentials.email}
                  onChange={(e) => setEmployerCredentials(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employer-password">Password</Label>
                <div className="relative">
                  <Input
                    id="employer-password"
                    type={showEmployerPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={employerCredentials.password}
                    onChange={(e) => setEmployerCredentials(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmployerPassword(!showEmployerPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showEmployerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg">
                Login as Employer
              </Button>           

              {/** Source: https://tailwindcss.com/docs/cursor */}
              {/**         https://tailwindcss.com/docs/text-align */}
              <div className="text-center cursor-pointer" onClick={() => {
                SetForgot(true);
                setUserRole("Employer");
              }}>Forgot Password?</div>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground mt-2">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-primary hover:underline font-medium"
          >
            Sign up
          </button>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          Administrator?{" "}
          <Link
            to="/admin"
            onClick={() => onOpenChange(false)}
            className="font-medium text-primary hover:underline"
          >
            Sign in to the admin portal
          </Link>
        </p>
      </DialogContent>
    </Dialog>
      <Dialog
        open={ForgotPassword}
        onOpenChange={() => {
          setStep("")
          setDisabled(false)

          setPassword("")
          setConfirm("")

          setIsEmailVerified(false)
          setResetToken("")
          SetForgot(false)
          SETOTPEMAIL("")

          setShowCreatePassword(false)
          setShowConPassword(false)
        }}
      >
        <DialogContent>
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold">Forgot Password?</DialogTitle>
            <DialogDescription className="text-base">
              Enter your email account to recover your password
            </DialogDescription>
          </DialogHeader>
          <Input placeholder="john@example.com" type="email" onChange={(Event) => SETOTPEMAIL(Event.target.value)}></Input>
          <Button onClick={() => {
            handleSendOTP(userRole)
          }} disabled={disabled}>
            Send OTP
          </Button>

          {step === "otp" && isEmailVerified === false ? (
            <OTPVerification
              email={OTPEMAIL}
              purpose="password_reset"
              role={userRole}
              onVerified={(token) => {
                setResetToken(token)
                setIsEmailVerified(true)
                setStep("")
                toast.success("Email Verified", {
                  description: `Your email has been successfully verified.`
                })
              }}
              onResend={() =>
                toast.success("OTP Resent", {
                  description: `A new OTP has been sent to ${OTPEMAIL}.`
                })
              }
            />
          ) : (
            <div></div>
          )}

          {isEmailVerified === true ? (
            <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-password">Create New Password</Label>
                                  <div className="relative">
                                  <Input
                                    id="create-password"
                                    type={showCreatePassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={create_password}
                                    onChange={(Event) => setPassword(Event.target.value)}
                                    required
                                    className="pr-10"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                </div>
                

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  
                  <div className="relative">
                                  <Input
                                    id="confirm-password"
                                    type={showConPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={confirm_password}
                                    onChange={(Event) => setConfirm(Event.target.value)}
                                    required
                                    className="pr-10"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowConPassword(!showConPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {showConPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                </div>

                <Button className="w-full" onClick={handlePassword}>Create New Password</Button>
            </div>
          ) : (
            <div></div>
          )}
          
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginModal;
