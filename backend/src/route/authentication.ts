import { Router } from "express";
import { WorkerRegister, displayFile, AdminRegister, AdminLogin, EmployerRegister, EmployerLogin, WorkerLogin, FindJobs, ViewSkills, DropdownComp, Workers, Reviews, HandleOTPVerification, PermitPost, RegexFunction, HandleOTPPasswordVerification, ForgotPassword } from "../controller/authentication";
import rateLimit from "express-rate-limit";
import { uploadEmployerPermit, uploadFiles } from "../file/upload";
import { createCompany } from "../controller/authentication";

const router = Router()

// // Display the total workers:
router.get("/display", displayFile)
router.get("/jobs", FindJobs)
router.get("/workers", Workers)
router.get("/rating", Reviews)

router.get("/otp/:email", HandleOTPVerification)
router.get("/otp/:email/:role", HandleOTPPasswordVerification)

router.post("/companies", createCompany);
router.post("/password/regex/test", RegexFunction)

// DropDown:
router.get("/ViewSkills", ViewSkills)
router.get("/dropdown", DropdownComp)


// Register the Admin:
router.post("/admin/register", AdminRegister)



// Register User:
router.post("/employer/register", EmployerRegister)
router.post("/upload/permit", PermitPost)


// Register User:
router.post("/worker/register",
  uploadFiles.fields([
    { name: "resume", maxCount: 1 }, // Required
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