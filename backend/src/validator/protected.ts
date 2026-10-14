import z from "zod";
import WorkerAssignment from "../model/WorkerAssignment";

// [These are the validators used for both workers & employers]:
// [GET Requests]
// - JobSchema: 

// Job Schema:
export const JobSchema = z.object({
  title: z
          .string("Job must be a string")
          .min(3, "Title must have at least 3 characters")
          .max(60, "Title shouldn't exceed 60 characters")
          .regex(/^[A-Za-z ]+$/, "Job Title must only contain letters and spaces."),
  company: z.string("Company must be a string"),
  posted: z.string("Posted By must be the string of the user ID"),
  location: z.string("Location must be a string"),
  type: z.enum(["Part-Time", "Full-Time", "Contract", "Temporary", "Intern"], "Type must be Part-Time | Full-Time").optional(),
  salary: z.string("Salary must be a string"),
  description: z
          .string("Description must be a string")
          .min(50, "Description must be at least 50 characters")
          .max(900, "Description shouldn't exceed 900 characters"),
  requirements: z.array(
    z.string("Requirement must be a string").min(1, "Requirement must have at least 1 character"),
    "Requirements must be an array"
  ),
  benefits: z.array(
    z.string("Benefits must be a string").min(1, "Benefit must have at least 1 character"),
    "Benefits must be an array"
  ),
  tags: z.array(
    z.string("Tag must be a string").min(1, "Tag must have at least a single character").max(30, "Tag must not be more than 30 characters"),
    "Tags must be an array"
  ),
  schedule: z.string("Schedule must be a string").min(1, "Schedule must have at least one character"),
  startDate: z.string("Please enter a date").optional(),
  positions: z.int("Positions must be an integer"),

  // Source - https://stackoverflow.com/a/21456918 | Posted by Srinivas, modified by community. See post 'Timeline' for change history | Retrieved 2026-02-09, License - CC BY-SA 4.0
  // https://www.geeksforgeeks.org/javascript/javascript-program-to-validate-password-using-regular-expressions/
  category: z.string("Category must be a string").regex(/^[A-Za-z ]+$/, "Category must only contain letters and spaces").default("others"),
  categoryTitle: z.string().regex(/^[A-Za-z ]+$/, "Category must only contain letters and spaces").optional(),
  applyBefore: z.string("Apply Before must be a string").date("Apply Before must be a date format"),
  email: z.string("Contact Email must be a string").email("Contact Email must be a valid email"),
  phone: z.string("Contact Phone must be a string").regex(/^(\+639)\d{9}$/, "Please enter a valid phone number, ex. +639...")
})


// Company Schema:
export const CompanySchema = z.object({
  title: z.string("Title must be a string")
})



// Validator for the AdminNotificationSchema:
export const AdminNotificationSchema = z.object({
  type: z.enum([
    "job_posted",
    "verification",
    "application",
    "report",
  ], "Type doesn't match the following: job_posted, verification, application, report"),

  title: z
    .string("Title must be a string")
    .trim()
    .min(1, "Title is required"),

  description: z
    .string("Title must be a string")
    .min(1, "Description is required"),

  time: z
    .string()
    .min(1, "Time is required"),

  read: z
    .boolean()
    .default(false),

  category: z.enum([
    "job",
    "account",
  ]),

  details: z
    .string()
    .nullable()
    .optional(),
});



// Job Overview Schema:
export const JobOverviewSchema = z.object({
  job: z.string("Job ID must be a string")
})



// Application Schema:
export const ApplicationSchema = z.object({
  job: z.string("Job must be the ObjectId String"),
  worker: z.string("Worker ID must be an ObjectId"),
  location: z.string("Location ID must be a string")
})


// Company Schema:
export const Company_IDSchema = z.object({
  Company_ID: z.string("Company ID must be a string"),
})

// Location Schema:
export const Location_IDSchema = z.object({
  Location_ID: z.string("Location ID must be a string"),
})

// Skill ID Schema:
export const SkillID = z.object({
  skill: z.string("Skill must be a string")
})




// Add Location:
export const LocationSchema = z.object({
  name: z.string("Title must be a string")
})


// Add Worker ID:
export const ViewProfile = z.object({
  id: z.string("Worker ID must be a string"),
  role: z.enum(["worker", "employer"], "Role must be worker / employer")
})


// Worker ID View Job:
export const WorkerIDJob = z.object({
  worker: z.string("Worker must be a string")
})


// Application Update Status:
export const ApplicationStatusUpdate = z.object({
  _id: z.string("Application ID must be a string"),
  status: z.enum(["Withdrawed"], "Status must be Withdrawed")
})

// Job ID View Job:
export const JobIDJob = z.object({
  job: z.string("Job must be a string")
})

// Add Employer ID:
export const employerIdSchema = z.object({
  id: z.string("Employer ID must be a string"),
  role: z.enum(["employer"], "Role must be employer")
})


// Add Skill:
export const TagSchema = z.object({
  title: z.string("Title must be a string")
})


// Sort Schema:
export const SortSchema = z.object({
  createdAt: z.int("createdAt must be an int")
})


// Only Accepted Jobs:
export const OnlyAccepted = z.object({
  status: z.enum(["ACCEPTED"], "Status must be ACCEPTED")
})

export const EmployerIdSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});


// Accept Application:
export const UpdateApplication = z.object({
  _id: z.string({
    message: "_id must be a string",
  }),

  status: z.enum(
    ["Accepted", "Not Selected", "Interview Scheduled"],
    {
      message: "Status must be: Accepted, Not Selected, Interview Scheduled",
    }
  ),

  timeline: z.enum(
    ["Review", "Interview", "Final Decision"],
    {
      message: "Timeline must be: Review, Interview, Final Decision",
    }
  ),
});

// Add Interview Date:
export const InterviewDate = z.object({
  _id: z.string("_id must be a string"),
  interviewDate: z.string("Interview Date must be a string").date("Interview Date must be in date format")
})


// View Details of the Company:
export const CompanySchemaID = z.object({
  _id: z.string("_id must be a string")
})

// Job Schema Id:
export const JobSchemaID = z.object({
  job: z.string("Job ID must be a string")
})


// Is Applied:
export const IsAppliedS = z.object({
  worker: z.string("Worker must be a string"),
  job: z.string("Job must be a string")
})


// Application ID:
export const ApplicationID = z.object({
  _id: z.string("Application ID must be a string")
})


// Worker ID:
export const WorkerID = z.object({
  _id: z.string("Worker ID must be a string")
})

// Timeline Status:
export const TimeLineStatus = z.object({
  timeline: z.enum(["Interview"], "Timeline must be interview"),
  status: z.enum(["Interview Scheduled"], "Status must be interview scheduled")
})

// Update Worker:
export const UpdateWorkerSchema = z.object({
  _id: z.string("_id must be a string"),
  name: z.string("Name must be a string").min(3, "Name must have at least 3 characters").max(50, "Name must not exceed 50 characters").regex(/^[A-Za-z0-9 ]*$/, "Name must only include letters, digits, and spaces"), // https://www.servicenow.com/community/itsm-forum/allow-only-alphanumeric-values-and-special-characters/td-p/712231 // https://www.servicenow.com/community/itsm-forum/allow-only-alphanumeric-values-and-special-characters/td-p/712231
  phoneNumber: z.string("Phone must be a valid phone number").regex(/^(\+639)\d{9}$/, "Please enter a valid phone number, ex. +639..."),
  location: z.string("Location must be a string"),
  jobTitle: z.string("Title must be string"),
  yearsOfExperience: z.string("Experience must be a string").regex(/^[A-Za-z0-9' ]*$/, "Experience must only include letters, digits, and spaces").optional(),
  about_me: z.string("About Me must be a string"),
  availability: z.enum(["Full-Time", "Part-Time", "Contract", "Flexible"], "Availability must be either Full-Time, Part-Time, Contract, Flexible"),
  expected_salary: z.string("Expected Salary must be a string"),
  skills: z.array(z.string("Skill must be a string"), "Skills must be an array"),
  photo: z.string("Photo must be the string").optional(),
  resume: z.string("Resume must be a string").optional()
})

// Update Employer:
export const UpdateEmployerSchema = z.object({
  _id: z.string("_id must be a string"),
  company: z.string("Company must be a string"),
  phone: z.string("Phone Number must be a string").regex(/^(\+639)\d{9}$/, "Please enter a valid phone number, ex. +639..."),
  industry: z.string("Industry must be a string"),
  industryTitle: z.string("Industry title must be a string").regex(/^[A-Za-z ]+$/, "Industry must only contain letters and spaces").optional(),
})

// View Message by Contact ID:
export const ViewMessageByContactID = z.object({
  contact: z.string("Contact ID must be a string")
})

// Post Message: // contact, worker, role, content
export const PostMessage = z.object({
  contactId: z.string("Contact ID must be a string"),
  senderId: z.string("Sender ID must be a string"),
  recipientId: z.string("Recipient ID must be a string"),
  senderRole: z.enum(["worker", "employer"]),
  content: z.string("Content must be a string").min(1, "Contact must have at least 1 character")
})

// Post Contacts:
export const PostContacts = z.object({
  employer: z.string("_id must be a string"),
  title: z.string("Title must be a string"),
  description: z.string("Description must be a string"),
  worker: z.string("Worker must be a string")
})

// View Employer Profile:
export const EmployerProfileS = z.object({
  _id: z.string("Employer ID must be a string")
})

// Post a Review:
export const RatingSchema = z.object({
  worker: z.string("Worker must be a string"),
  rating: z.int("Rating must be an integer"),
  description: z.string("Description must be a string")
})

// Employer ID Schema:
export const EmployerSchemaid = z.object({
  employer: z.string("_id must be a string")
})

// Notification ID Schema:
export const NotificationIDSchema = z.object({
  _id: z.string("_id must be a string")
})



// "Fake Job",
//     "No Payment",
//     "Harassment",
//     "Fraud",
//     "Other",

// Reports Validator:
export const reportValidator = z.object({
  workerId: z.string("Worker ID must be a string"),
  employerId: z.string("Employer ID must be a string"),
  reportType: z.string("Report Type must be a string"),
  description: z.string().min(20, "Description must be at least 20 characters").max(1000),
  status: z.enum(["Pending", "Under Review", "Resolved", "Rejected",]).optional(),
  sentBy: z.string("Sent By must be a string"),
  submitEvidence: z.array(z.object({
    fileName: z.string("File Name must be a string"),
    fileType: z.string("File Type must be a string")
  })),
  reporter: z.enum(["worker", "employer"]),
  reportCategory: z.string("Report Category must be a string")
});


// Show completed assignments:
export const CompletedAssignmentSchema = z.object({
  employerId: z.string("Employer ID must be a string")
})

// Create New Worker Job:
export const NewWorkerJobSchema = z.object({
  jobCompleted: z.string("Job Completed ID must be a string"),
  name: z.string("Worker Job must be a string")
})

// Create new Worker Assignment:
export const NewWorkerAssignmentSchema = z.object({
  employerId: z.string("Employer ID must be a string"),
  title: z.string("Title must be a string"),

  description: z.string("Description must be a string"),

  targetWorkers: z.array(z.object({
    _id: z.string("_id must be a string")
  }), "Target Workers must be an array"),
  submitBefore: z.string("Submit Before must be a string"),

  rejectLate: z.boolean("Reject Late must be a boolean").optional()
})

// Delete Worker Job:
export const DeleteJobSchema = z.object({
  name: z.string("Name must be a string"),
  _id: z.string("Jobs Completed must be a string")
})


    // "Harassment",
    // "Unprofessional Behavior",
    // "No Show",
    // "Poor Quality of Work",
    // "Incomplete Work",
    // "Property Damage",
    // "Theft",
    // "Fraud / Scam",
    // "Requesting Payment Outside the Platform",
    // "Fake Identity"

// Reports Validator:
export const reportWorkerValidator = z.object({
  workerId: z.string("Worker ID must be a string"),
  employerId: z.string("Employer ID must be a string"),
  reportType: z.string(),

  description: z
    .string("Description must be string")
    .min(10, "Description must be at least 10 characters")
    .max(1000),

  status: z
    .enum([
      "Pending",
      "Under Review",
      "Resolved",
      "Rejected",
    ])
    .optional()
});


export const SubmittedFilesSchema = z.object({
  _id: z.string("Worker Assignment ID must be a string"),
  workerId: z.string("Worker ID must be a string")
})


export const UploadWorkerJobSchema = z.object({
  workerId: z.string("Worker ID must be a string"),
  workerAssignment: z.string("Worker Assignment is required"),
  workerUpload: z.array(
    z.object({
      name: z.string("Worker Upload URL must be a string")
    })
  ),
  workerDescription: z
            .string("Worker description must be a string")
            .min(1, "Worker Description must have at least one character")
            .max(290, "Worker Description must not exceed 290 characters")
            .optional(),
  employerId: z.string("Employer ID must be a string"),
  isLate: z.boolean("isLate must be a boolean")
})

export const UpdateWorkerJobSchema = z.object({
  workerAssignment: z.string("Worker Assignment ID must be a string"),
  workerId: z.string("Worker ID must be a string"),
  employerId: z.string("Employer ID must be a string"),
  email: z.string("Employer Email must be a string"),
  workerName: z.string("Worker Name must be a string"),
  status: z.enum(["submitted", "completed", "rejected"], "Status must be either submitted / completed / rejected")
})

// Source - https://stackoverflow.com/a/11794507
// Posted by Engineer
// Retrieved 2026-07-22, License - CC BY-SA 3.0

export const DeleteWorkerJobSchema = z.object({
  _id: z.string("Job Completed ID must be a string")
})

export const SubmittedJobsSchema = z.object({
  employerId: z.string("Employer ID must be a string")
})

export const SubmittedJobsIDSchema = z.object({
  workerId: z.string("Employer ID must be a string"),
  workerAssignment: z.string("Worker Assignment ID must be a string"),
  employerId: z.string("Employer ID must be a string")
})


export type ReportInput = z.infer<
  typeof reportValidator
>;

export const GetReportDetailsSchema = z.object({
  _id: z.string("Report ID is required")
})

export const UpdateReportSchema = z.object({
  reportId: z.string("Report ID is required").optional(),
  reportType: z.string("Report Type must be a string").optional(),
  description: z.string("Description must be a string").optional(),
  submitEvidence: z.array(z.object({
    fileName: z.string("File name must be a string"),
    fileType: z.string("File type must be a string")
  }),"Submit Evidence must be an array").optional()
})

export const SubmitEvidenceUpdate = z.object({
  reportId: z.string("Report ID is required"),
  submitEvidence: z.array(
    z.object({
      fileName: z.string("File name must be a string"),
      fileType: z.string("File type must be a string")
    })
  ).optional()
})

export const DeleteReportSchema = z.object({
  _id: z.string("Report ID must be a string")
})

export const DeleteReportsSchema = z.object({
  sentBy: z.string("User ID must be a string")
})

export const DeleteReportXSchema = z.object({
  reportId: z.string("Report ID must be a string"),
  fileName: z.string("File Name must be a string"),
  fileID: z.string("File ID must be a string")
})

export const StatusReasonSchema = z.object({
  workerId: z.string("Worker ID must be a string"),
  employerId: z.string("Employer ID must be a string"),
  jobId: z.string("Job ID must be a string"),
  applicationId: z.string("Application ID must be a string"),
  title: z.string("Title must be a string"),
  description: z.string("Description must be a string"),
  sentBy: z.enum(["worker", "employer"])
})

export const ViewEmployerResponsesSchema = z.object({
  applicationId: z.string("Application ID must be a string")
})