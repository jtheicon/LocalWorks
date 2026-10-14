import z from "zod";

const regex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@.#$=?>!"+'(),`~<{\^|/}%*&_;:-])[A-Za-z\d@.#$=?>!"+'(),`~<{\^|/}%*&_;:-]{6,16}$/

// Send Email OTP:
export const SendEmailOTP = z.object({
  email: z.string("Email must be a string").email("Email must be a valid")
})

export const SendEmailForgotPasswordOTP = z.object({
  email: z.string("Email must be a string").email("Email must be a valid"),
  role: z.enum(["Worker", "Employer"], "Role should be either Worker and Employer")
})

export const ForgotPasswordOTP = z.object({
  email: z.string("Email must be a string").email("Email must be a valid"),
  role: z.enum(["Worker", "Employer"], "Role should be either Worker and Employer"),
  create_password: z.string("Password must be a string")
             .min(6, "Password must have at least 6 characters").max(16, "Password must have a maximum of 16 characters").regex(
              regex,
              "Password must contain at least one character, one digit, and one special character"
            ),
  confirm_password: z.string("Confirm Password must be a string"),
})

// Register the Admin:
export const AdminSchema = z.object({
  name: z.string("Name must be a string").min(3, "Name must have at least 3 characters").max(35, "Name must have a maximum of 35 characters").regex(/^[A-Za-z0-9 ]*$/, "Name must only include letters, digits, and spaces"),
  email: z.string("Email must be a string").email("Email must be a valid email"),

  // Source - https://stackoverflow.com/a/21456918 | Posted by Srinivas, modified by community. See post 'Timeline' for change history | Retrieved 2026-02-09, License - CC BY-SA 4.0
  password: z.string("Password should be a string").min(6, "Password must have at least 6 characters").max(16, "Password shouldn't exceed 16 characters").regex(
    regex,
    "Password must contain at least one character, one digit, and one special character"
  ),
  role: z.enum(["admin"], "Role must be admin only").optional(),
  avatar: z.string("Avatar must be a string").optional()
})



// Admin Login:
export const AdminLoginSchema = z.object({
  email: z.string("Email must be a string").email("Email must be a valid email"),
  password: z.string("Password must be a string")
})



export const createCompanySchema = z.object({
  name: z.string().min(1),
  industry: z.string().min(1),
  location: z.string().min(1),
  description: z.string().optional().default(""),
  website: z.string().url().optional().or(z.literal("")),
  owner: z.string().min(1).optional(),
  employees: z.number().int().min(0).optional().default(0),
  openPositions: z.number().int().min(0).optional().default(0),
  photo: z.string().optional().default(""),
});



// Register User Schema:
export const WorkerRegisterSchema = z.object({
  name: z.string("Name must be a string").min(3, "Name must have at least 3 characters").max(35, "Name must have a maximum of 35 characters").regex(/^[A-Za-z0-9 ]*$/, "Name must only include letters, digits, and spaces"), // https://www.servicenow.com/community/itsm-forum/allow-only-alphanumeric-values-and-special-characters/td-p/712231
  email: z.string("Email must be a string").email("Email must be a valid email"),

  // Source - https://stackoverflow.com/a/21456918 | Posted by Srinivas, modified by community. See post 'Timeline' for change history | Retrieved 2026-02-09, License - CC BY-SA 4.0:
  // https://www.geeksforgeeks.org/javascript/javascript-program-to-validate-password-using-regular-expressions/
  password: z.string("Password must be a string").min(6, "Password must have at least 6 characters").max(16, "Password must have a maximum of 16 characters").regex(
    regex,
    "Password must contain at least one character, one digit, and one special character"
  ),

  // Link for regex: https://stackoverflow.com/questions/31175221/regex-pattern-for-philippine-phone-number:
  phoneNumber: z.string("Phone Number must be a string").regex(/^(\+639)\d{9}$/, "Please enter a valid phone number, ex. +639..."),
  skills: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (Array.isArray(val)) return val;
      if (typeof val === "string") return [val]; // Convert single skill to array
      return undefined;
    },
    z.array(
      z
        .string("Skill must be a string")
        .trim()
        .min(1, "Skill cannot be empty")
        .regex(/^[A-Za-z ]+$/, "Skill must only contain letters and spaces")
    ).min(1, "At least one skill is required").optional()
  ),
  skill: z.string("Skill Category must be a string").regex(/^[A-Za-z ]+$/, "Skill must only contain letters and spaces"),

  // Source - https://stackoverflow.com/q | Posted by user19910212, modified by community. See post 'Timeline' for change history | Retrieved 2026-01-12, License - CC BY-SA 4.0 | To ensure correct usage of .optional() - https://joodi.medium.com/understanding-zod-schema-validation-with-optional-fields-db4f982f8cec
  role: z.enum(["worker", "employer", "admin"], "Role must be either worker, employer, admin").optional(),
  photo: z.string("Photo must be the string URL").optional().nullable(),
  resume: z.string("Resume must be the string URL").optional(),
  status: z.enum(["pending", "verified"], "Status must be either pending or verified").optional(),
  jobTitle: z.string("Job Title must be a string").regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, "Only letters and single spaces are allowed. Leading, trailing, or multiple consecutive spaces are not permitted.")
})



// Employer Schema:
export const EmployerSchema = z.object({
  company: z.string("Company must be a string"),
  email: z.string("Email must be a string").email("Email must be a valid email"),
  
  password: z.string("Password must be a string").min(6, "Password must have at least 6 characters").max(16, "Password must have a maximum of 16 characters").regex(
  // Source - https://stackoverflow.com/a/21456918 | Posted by Srinivas, modified by community. See post 'Timeline' for change history | Retrieved 2026-02-09, License - CC BY-SA 4.0
  // https://www.geeksforgeeks.org/javascript/javascript-program-to-validate-password-using-regular-expressions/

    regex,
    "Password must contain at least one character, one digit, and one special character"
  ),
  phone: z.string("Phone Number must be a string").regex(/^(\+639)\d{9}$/, "Please enter a valid phone number, ex. +639..."),
  industry: z.string("Industry must be a string"),
  industryTitle: z.string("Industry title must be a string").regex(/^[A-Za-z ]+$/, "Industry must only contain letters and spaces").optional(),
  permit: z.string("Permit must be the URL string").optional()
}, "The Employer Schema must be an object")



// Login Schema:
export const LoginSchema = z.object({
  email: z.string("Email must be a string").email("Email must be a valid email"),
  password: z.string("Password must be a string"),
  role: z.enum(["worker", "employer", "admin"], "Role must be worker, employer, admin.")
})


// User Schema, Total Workers Schema, and Only Accepted:
export const UserSchema = z.object({ user: z.string("User ID must be a string") })
export const TotalWorkerSchemaMain = z.object({ role: z.enum(["worker"], "Role must be worker") })
export const OnlyAccepted = z.object({ status: z.enum(["ACCEPTED"], "Status must be ACCEPTED") })

// Add Company Owner:
export const AddCompanyOwner = z.object({
  email: z.string("Email must be a string").email("Email must be a valid email"),
  phone: z.string("Phone is required").regex(/^(\+639)\d{9}$/, "Please enter a valid phone number, ex. +639...")
})