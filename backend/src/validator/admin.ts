import z from "zod";
import mongoose from "mongoose";

// https://zod.dev/api - Documentation:
// Total Workers, Verified Workers, Pending Verification, Report Accounts

export const VerifyWorkerSchema = z.object({
  worker: z.string("Worker ID must be a string")
})

export const TotalWorkerSchema = z.object({
  role: z.enum(["worker"], "Role must be worker")
})

export const PendingSchema = z.object({
  status: z.enum(["pending"], "Status must be pending")
})

export const AcceptedSchema = z.object({
  status: z.enum(["accepted"], "Status must be accepted")
})

export const DeclinedSchema = z.object({
  status: z.enum(["declined"], "Status must be declined")
})

export const VerifiedWorkersSchema = z.object({
  status: z.enum(["verified"], "Role must be verified")
})

export const PendingVerificationWorkersSchema = z.object({
  status: z.enum(["pending"], "Role must be pending")
})


export const DeclinedWorkersSchema = z.object({
  status: z.enum(["declined"], "Role must be declined")
})


// Update Worker Reports:
export const UpdateReportSchema = z.object({
  _id: z.string("Report ID must be a string"),
  status: z.enum(["Pending", "Resolved", "Rejected"])
})


// Accept the admin to add skill:
export const NewSkillSchema = z.object({
  title: z.string("Title must be a string").regex(/^[A-Za-z ]*$/, "Name must only include letters and spaces")
})

// Accept the Application Status:
export const AppStatusSchema = z.object({
  status_PR: z.enum(["Pending Review"], "Status_0 must be Pending Review"),
  status_IS: z.enum(["Interview Scheduled"], "Status_1 must be Interview Scheduled"),
  status_AC: z.enum(["Accepted"], "Status_2 must be Accepted"),
  status_NS: z.enum(["Not Selected"], "Status_3 must be Not Selected")
})


// Update Job Status:
export const UpdateSchema = z.object({
  id: z.string("Job ID must be a string"),
  status: z.enum(["ACCEPTED", "DECLINED", "DELETED"], "Status must be either accepted or declined")
})

export const AdminIdSchema = z.object({
  _id: z.string("Admin ID must be a string")
})


// Company Schema:
export const CompanySchema = z.object({
  company: z
    .string("Company must be a string")
});


// Mark As Read Admin Schema:
export const markAsReadAdminSchema = z.object({
  _id: z
    .string()
    .min(1, "Notification ID is required")
})


// Add New Company:
export const AddNewCompanySchema = z.object({
  title: z.string("Title must be a string").min(2, "Title must have at least 2 characters").max(50, "Title must not exceed 50 characters"),
  industry: z.string("Industry must be a string"),
  location: z.string("Location must be a string"),
  description: z.string("Description must be a string").min(20, "Description must have at least 20 characters").max(500, "Description must not exceed 500 characters"),
  noOfEmployees: z.int("Number of Employees must be a number").min(1, "Value should not be < 1").optional(),
  openPositions: z.int("Open Positions must be a Number").min(1, "Value should not be < 1").optional(),
  website: z.string("Website must be a string").url("Website must be a valid URL format").optional(),
  totalApplications: z.int("Total Applications must be a number").optional(),
  companyOwner: z.string("Company Owner must be a string")
})

// Add New Industry:
export const AddNewIndustryValidation = z.object({
  title: z.string("Title must be a string").min(1, "Title must have at least 1 character").max(50, "Title must not exceed 50 characters")
})

// Admin Dashboard:
export const DashboardSchema = z.object({
  active: z.enum(["active"], "Only accepted"),
  pending: z.enum(["pending", "Only pending"]),
  not_active: z.enum(["not_active"], "Only rejected")
})

// Admin Profile:
export const ProfileSchema = z.object({
  role: z.enum(["all", "worker", "employer"], "all | worker | employer => only")
})


export const UpdateWorkersEmployers = z.object({
  _id: z.string().min(1, "_id must be a string"),
  status: z.enum(["active", "not_active", "deleted"]).optional(),
  role: z.enum(["worker", "employer"]),
})

// Skill Information:
export const SkillsInformation = z.object({
  _id: z.string("Skill must be a string")
})