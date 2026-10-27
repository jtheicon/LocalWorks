import { Router } from "express";
import { WorkerRegister, displayFile, AdminRegister, AdminLogin, EmployerRegister, EmployerLogin, WorkerLogin, FindJobs, ViewSkills, DropdownComp, Workers, Reviews, HandleOTPVerification, PermitPost, RegexFunction, HandleOTPPasswordVerification, ForgotPassword, VerifyOTPController } from "../controller/authentication";
import rateLimit from "express-rate-limit";
import { uploadEmployerPermit, uploadFiles } from "../file/upload";
import { createCompany } from "../controller/authentication";
import { PollSignupScan, ScanPermit, ScanResume, SignupUploadLimits } from "../controller/signupDocument";

const router = Router()

// Every scan is an AI call, so keep it well under the free-tier quota.
const documentScanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many document uploads. Please try again in 15 minutes." },
})

// // Display the total workers:
router.get("/display", displayFile)
router.get("/jobs", FindJobs)
router.get("/workers", Workers)
router.get("/rating", Reviews)

router.get("/otp/:email", HandleOTPVerification)
router.get("/otp/:email/:role", HandleOTPPasswordVerification)
router.post("/otp/verify", VerifyOTPController)

router.post("/companies", createCompany);
router.post("/password/regex/test", RegexFunction)

// DropDown:
router.get("/ViewSkills", ViewSkills)
router.get("/dropdown", DropdownComp)


// Register the Admin:
router.post("/admin/register", AdminRegister)



// Sign-up documents: AI verifies the file and returns the fields to pre-fill the form.
router.get("/signup/upload-limits", SignupUploadLimits)
router.post("/signup/resume", documentScanLimiter, ScanResume)
router.post("/signup/permit", documentScanLimiter, ScanPermit)
router.get("/signup/scan/:scanId", PollSignupScan)

// Register User:
router.post("/employer/register", EmployerRegister)
router.post("/upload/permit", PermitPost)


// Register User:
router.post("/worker/register",
  // The resume was already uploaded and verified through /signup/resume.
  uploadFiles.fields([
    { name: "photo", maxCount: 1 },  // Optional
  ]),

WorkerRegister)


// // Ensure the field name matches the frontend form input
// router.post("/worker/register", uploadResume.single("resume"), WorkerRegister);


// Login User:
router.post("/admin/login",
  AdminLogin
)



// Login Employer:
router.post("/employer/login",
  EmployerLogin
)



// Login User:
router.post("/worker/login",
  WorkerLogin
)

// Update Password:
router.put("/password/update", ForgotPassword)

export default router