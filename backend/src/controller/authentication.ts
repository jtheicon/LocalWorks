import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { authCookieOptions } from "../config/http";
import { WorkerRegisterSchema, EmployerSchema, LoginSchema, AdminSchema, AdminLoginSchema, OnlyAccepted, SendEmailOTP, SendEmailForgotPasswordOTP, ForgotPasswordOTP, VerifyOTP } from "../validator/authentication";
import jwt from "jsonwebtoken"
import Worker from "../model/Worker";
import { instanceErrors, mainError } from "../errors/showErrors";
import Admin from "../model/Admin";
import Employer from "../model/Employer";
import Job from "../model/Job";
import Skill from "../model/Skill";
import Industry from "../model/Industry";
import Rating from "../model/Rating";
import { filterXSS } from "xss";
import Company from "../model/Company";
import { createCompanySchema } from "../validator/authentication";
import stringComparison from "string-comparison";
import AdminNotification from "../model/AdminNotification";
import { WorkerRegisterPayload } from "../notif-payload/admin";
import { getIO } from "../socket";
import VerifiedWorker from "../model/VerifiedWorker";
import JobsCompleted from "../model/JobsCompleted";
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { uploadPermits } from "../file/upload";
import { issueOTP, verifyOTP, assertVerifiedEmail, OTPError } from "../services/emailOtp";
import { namesMatch, readSignupDocumentToken, SignupDocumentError } from "../services/signupDocument";
import { isEmailTaken, releaseDeletedAccount } from "../services/accounts";
import { recordQualifyingActivity } from "../services/activityTracking";

// Source that resolved "Error: Invalid login: 535-5.7.8 Username and Password not accepted."
// Link: https://laravelmail.com/blog/458-i-get-a-error-error-invalid-login-535-578-username/?srsltid=AfmBOor_5OgrHjOqJPiYk4AjAadRHtLMvX37IqiCdKApMZZre-Lbq7eI

const otpError = (error: unknown, res: Response) => {
  if (error instanceof OTPError) return res.status(error.status).json({ success: false, info: error.message, message: error.message })
  return mainError(error, res)
}



// Regex Test:
export const RegexFunction = async (req: Request, res: Response) => {
  try {
    const regex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@.#$=?>!"+'(),`~<{\^|/}%*&_;:-])[A-Za-z\d@.#$=?>!"+'(),`~<{\^|/}%*&_;:-]{6,16}$/
    const password = req.body.password

    return res.status(200).json({ success: true, password, regexPast: regex.test(password) })
  } catch (error) {
    mainError(error, res)
  }
}

const jaro = stringComparison.jaroWinkler;

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^\w\s]/g, "").trim();

const THRESHOLD = 0.95;


// File Display:
export const displayFile = async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true
  })
}

// basic XSS sanitization (strip HTML)
const clean = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  return value.replace(/<[^>]*>?/gm, "").trim();
};

// Sanitization:
const sanitize = (data: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const key in data) {
    out[key] = clean(data[key]);
  }
  return out;
};


// [Global] - HandleOTP: This controller handles the OTP:
export const HandleOTPVerification = async (req: Request, res: Response) => {
  const validatedData = SendEmailOTP.safeParse(req.params)

  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      info: validatedData.error.issues[0].message
    })
  }
  
  const { email } = validatedData.data;

  try {
    if (await isEmailTaken(email)) {
      return res.status(400).json({ success: false, info: "Email is already registered" })
    }

    // The code is emailed only; it is never returned to the browser.
    const expiresAt = await issueOTP(email, "register")
    return res.status(200).json({ success: true, expiresAt })
  } catch (error) {
    otpError(error, res)
  }
}

// [Global] - Verify OTP: checks the code server-side and returns a short-lived token
// that the register / password-reset request must include.
export const VerifyOTPController = async (req: Request, res: Response) => {
  const validatedData = VerifyOTP.safeParse(req.body)

  if (!validatedData.success) {
    return res.status(400).json({ success: false, info: validatedData.error.issues[0].message })
  }

  const { email, otp, purpose } = validatedData.data

  try {
    const token = await verifyOTP(email, purpose, otp)
    return res.status(200).json({ success: true, token })
  } catch (error) {
    otpError(error, res)
  }
}

// [Global] - HandleOTP: This controller handles the OTP:
export const HandleOTPPasswordVerification = async (req: Request, res: Response) => {
  const validatedData = SendEmailForgotPasswordOTP.safeParse(req.params)

  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      info: validatedData.error.issues[0].message
    })
  }
  
  const { email, role } = validatedData.data;
  let userInfo = undefined;

  try {
    if (role === "Worker") {
      userInfo = await Worker.findOne({ email, status: { $ne: "deleted" } })
      if (!userInfo) {
        return res.status(404).json({
          success: false,
          info: "Email for worker was not found"
        })
      }
    } else {
      userInfo = await Employer.findOne({ email, status: { $ne: "deleted" } })
      if (!userInfo) {
        return res.status(404).json({
          success: false,
          info: "Email for employer was not found"
        })
      }
    }

    const expiresAt = await issueOTP(email, "password_reset")
    return res.status(200).json({ success: true, expiresAt })
  } catch (error) {
    otpError(error, res)
  }
}

// [Global] - ForgotPassword:
export const ForgotPassword = async (req: Request, res: Response) => {
  const data = await ForgotPasswordOTP.safeParse(req.body);

  if (!data.data) {
    const errors = JSON.parse(data.error.message)
    return res.status(400).json({
      success: false,
      info: errors[0].message
    })
  }

  const { email, create_password, confirm_password, role } = data.data;
  let userData;

  try {
    // Without this, anyone could reset any account's password by knowing its email.
    assertVerifiedEmail(req.body.resetToken, email, "password_reset")

    if (create_password !== confirm_password) {
      console.error("Password do not match")

      return res.status(400).json({
        success: false,
        info: "Passwords do not match"
      })
    }

    if (role === "Worker") {
      userData = await Worker.findOne({ email, status: { $ne: "deleted" } })
    } else {
      userData = await Employer.findOne({ email, status: { $ne: "deleted" } })
    }

    if (!userData) {
      console.error("User wasn't found")

      return res.status(404).json({
        success: false,
        info: "User wasn't found"
      })
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(create_password, salt)

    userData.password = hashedPassword;
    await userData.save();

    return res.status(200).json({
      success: true,
      info: "Password successfully updated!"
    })
  } catch (error) {
    otpError(error, res)
  }
}

export const createCompany = async (req: Request, res: Response) => {
  try {
    // validate
    const data = createCompanySchema.parse(req.body);

    const sanitizedName = filterXSS(data.name, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: true,
    });

    const sanitizedLocation = filterXSS(data.location, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: true,
    });


    const sanitizedDescription = filterXSS(data.description, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: true,
    })

    const company = new Company({
      name: sanitizedName,
      industry: data.industry,
      location: sanitizedLocation,
      description: sanitizedDescription,
      website: data.website,
      owner: data.owner,
      employees: data.employees,
      openPositions: data.openPositions,
      photo: data.photo,
    });

    await company.save()

    return res.status(201).json(company);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return res.status(400).json({
        error: err.errors[0].message,
      });
    }

    return res.status(500).json({ error: err.message });
  }
};



// Register Admin:
export const AdminRegister = async (req: any, res: Response) => {
  const validatedData = AdminSchema.safeParse(req.body)
  if (validatedData.error) { const errors = validatedData.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message }) }

  const { name, email, password, role } = validatedData.data;

  try {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({ name, email, password: hashedPassword, role });
    await newAdmin.save();

    return res.status(201).json({
      success: true,
      message: "Admin Successfully Registered!"
    });
  } catch (error: unknown) {
    instanceErrors(
      error,
      res
    )
  }
}



// Login Admin:
export const AdminLogin = async (req: Request, res: Response) => {
  const validatedData = AdminLoginSchema.safeParse(req.body)
  if (validatedData.error) { const errors = validatedData.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message }) }

  const { email, password } = validatedData.data;

  try {
    const admin = await Admin.findOne({ email })
    if (!admin) return res.status(400).json({ success: false, message: "Invalid email / password"});

    const Match = await bcrypt.compare(password, admin.password)
    if (!Match) return res.status(400).json({ success: false, message: "Invalid email / password"});

    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET as string, { expiresIn: '1h' })
    res.cookie("token", token, authCookieOptions())

    return res.status(200).json({
      success: true,
      message: "Login Successful!"
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}


export const WorkerRegister = async (req: Request, res: Response) => {
    
  const io = getIO();

  try {
    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    const photo = files?.photo?.[0];

    // The resume was uploaded and verified by AI before the form was filled in.
    const resume = readSignupDocumentToken(req.body.documentToken, "resume");

    const payload = {
      ...req.body,
      resume: resume.filename,
      photo: photo?.filename || null,
    };

    const validatedData = WorkerRegisterSchema.safeParse(payload);

    if (!validatedData.success) {
      return res.status(400).json({
        success: false,
        message: validatedData.error.issues[0].message,
      });
    }

    const {
      name,
      email,
      phoneNumber,
      password,
      role,
      skills,
      skill,
      jobTitle,
      resume: resumeFile,
      photo: photoFile,
    } = validatedData.data;

    assertVerifiedEmail(req.body.emailToken, email, "register");

    if (!namesMatch(name, resume.name, "resume")) {
      return res.status(400).json({
        success: false,
        message: `The name you entered doesn't match the name on your resume (${resume.name}).`,
      });
    }

    await releaseDeletedAccount(email, name);

    const hash = await bcrypt.hash(password, 12);

    const newWorker = new Worker({
      name,
      email,
      phoneNumber,
      password: hash,
      role,
      skills,
      skill,
      jobTitle,
      resume: resumeFile,
      photo: photoFile,
      // Verified resume + matching name: active right away, no admin approval.
      status: "active",
      verification: resume.verification,
    });

    await newWorker.save();
    await VerifiedWorker.create({ worker: newWorker._id });

    // // const token = jwt.sign(
    // //   {
    // //     id: newWorker._id,
    // //     role: newWorker.role,
    // //     status: newWorker.status,
    // //   },
    // //   process.env.JWT_SECRET as string,
    // //   { expiresIn: "1h" }
    // // );

    // // res.cookie("token", token, {
    // //   httpOnly: true,
    // //   sameSite: "strict",
    // //   secure: process.env.NODE_ENV === "production",
    // //   expires: new Date(Date.now() + 60 * 60 * 1000),
    // // });

    return res.status(201).json({
      success: true,
      message: "Worker Successfully Registered! Your resume was verified and your account is active. You can log in now.",
    });
  } catch (error) {
    if (error instanceof OTPError) return otpError(error, res);
    if (error instanceof SignupDocumentError) return res.status(error.status).json({ success: false, message: error.message });
    instanceErrors(error, res);
  }
};




// Display Reviews:
export const Reviews = async (req: Request, res: Response) => {
  try {
    const ReviewsDta = await Rating.find().populate("worker").sort({ createdAt: -1 })
    if (!ReviewsDta.length) return res.status(200).json({ success: true, ReviewsDta, message: "No Reviews yet." })

    return res.status(200).json({
      success: true,
      ReviewsDta
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}



// Register the Employer:
export const EmployerRegister = async (req: Request, res: Response) => {
  const validatedData = EmployerSchema.safeParse(req.body);

  if (!validatedData.success) {
    console.log(req.body, "Empty request")

    return res.status(400).json({
      success: false,
      message: validatedData.error.issues[0].message,
    });
  }

  const { company, email, password, phone, industry, industryTitle } = validatedData.data;

  const companyFilterXSS = filterXSS(company, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: true
  })

  if (companyFilterXSS.length <= 1) {
    return res.status(400).json({
      success: false,
      info: "Company Name should include at least 2 characters."
    })
  }

  const CompanyName = normalize(companyFilterXSS);

  try {
    assertVerifiedEmail(req.body.emailToken, email, "register");

    // The permit was uploaded and verified by AI before the form was filled in.
    const permit = readSignupDocumentToken(req.body.documentToken, "permit");

    if (!namesMatch(companyFilterXSS, permit.name, "permit")) {
      return res.status(400).json({
        success: false,
        message: `The company name you entered doesn't match the name on your permit (${permit.name}).`,
      });
    }

    await releaseDeletedAccount(email);

    let finalIndustry = industry;

    if (industryTitle?.trim()) {
      const normalizedIndustryName = normalize(industryTitle);

      const industries = await Industry.find({});

      let bestMatch = null;
      let bestScore = 0;

      for (const i of industries) {
        const score = jaro.similarity(
          normalizedIndustryName,
          normalize(i.title)
        );

        if (score > bestScore) {
          bestScore = score;
          bestMatch = i;
        }
      }

      const THRESHOLD = 0.95;

      if (bestMatch && bestScore >= THRESHOLD) {
        finalIndustry = bestMatch._id.toString();
      } else {
        const createdIndustry = new Industry({
          title: industryTitle,
        });

        await createdIndustry.save();

        finalIndustry = createdIndustry._id.toString();
      }
    }
    // 1. fetch all companies (or you can optimize later with regex)
    const companies = await Company.find({});

    // 2. find best match
    let bestMatch = null;
    let bestScore = 0;

    for (const c of companies) {
      const score = jaro.similarity(CompanyName, normalize(c.name));

      if (score > bestScore) {
        bestScore = score;
        bestMatch = c;
      }
    }

    const THRESHOLD = 0.95;

    let finalCompanyName = CompanyName;

    // 3. decide reuse or create
    if (bestMatch && bestScore >= THRESHOLD) {
      finalCompanyName = bestMatch.name;
    } else {
      const created = new Company({
        name: companyFilterXSS,
        industry: finalIndustry
      });

      await created.save();

      finalCompanyName = created.name;
    }

    // 4. create employer
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);

    const newEmployer = new Employer({
      company: finalCompanyName,
      email,
      password: hash,
      phone,
      industry: finalIndustry,
      permit: permit.filename,
      // Verified permit + matching company name: active right away, no admin approval.
      status: "active",
      verification: permit.verification,
    });

    await newEmployer.save();

    // // const token = jwt.sign(
    // //   {
    // //     id: newEmployer._id,
    // //     role: newEmployer.role,
    // //     company: newEmployer.company,
    // //     status: newEmployer.status,
    // //   },
    // //   process.env.JWT_SECRET as string,
    // //   { expiresIn: "1h" }
    // // );

    // // res.cookie("token", token, {
    // //   expires: new Date(Date.now() + 60 * 60 * 1000),
    // //   httpOnly: true,
    // //   sameSite: "strict",
    // // });

    return res.status(200).json({
      success: true,
      message: "Employer Registered Successfully! Your business permit was verified and your account is active. You can log in now.",
    });
  } catch (error) {
    if (error instanceof OTPError) return otpError(error, res);
    if (error instanceof SignupDocumentError) return res.status(error.status).json({ success: false, message: error.message });
    instanceErrors(error, res);
  }
};

// Permit Post:
export const PermitPost = async (req: Request, res: Response) => {
  uploadPermits(req, res, (err) => {
    if (err) {
      console.log(err)
      return res.status(400).json({
        success: false,
        errors: err
      })
    }

    console.log(req.file)

    return res.status(201).json({
      success: true,
      filename: req.file
    })
  })
}



// Login Controller:
export const EmployerLogin = async (req: Request, res: Response) => {
  const validatedData = LoginSchema.safeParse(req.body)

  if (validatedData.error) { const errors = validatedData.error.issues; return res.status(400).json({ success: false, message: errors[0].message })}

  const { email, password, role } = validatedData.data

  try {
    const user = await Employer.findOne({ email }).select("+password")
    if (!user) return res.status(400).json({ success: false, message: "Incorrect Email / Password" })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ success: false, message: "Incorrect Email / Password" })

    const verify = await Employer.findOne({ email: user.email, role })
    if (!verify) return res.status(400).json({ success: false, message: "Incorrect Email / Password" })

    // Only reached after the password matched, so this does not reveal accounts to guessers.
    if (user.status === "pending") return res.status(403).json({ success: false, message: "Your account is still being verified. We will email you once it is active." })
    if (user.status === "not_active") {
      const inactivity = user.get("deactivation")?.reason === "inactivity"
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DEACTIVATED",
        message: inactivity
          ? "Your account was deactivated due to inactivity. Use the reactivation link in your email or submit a reactivation request for admin review."
          : "Your account is not active. Contact an administrator.",
      })
    }
    if (user.status === "deleted") return res.status(400).json({ success: false, message: "Incorrect Email / Password" })
    recordQualifyingActivity(String(user._id), user.role, true)

    // console.log({
    //   id: user._id,
    //   role: user.role,
    //   company: user.company,
    //   status: user.status
    // })
    
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role, company: user.company, status: user.status }, process.env.JWT_SECRET as string, {
      expiresIn: '1h'
    })

    res.cookie("token", token, authCookieOptions())

    return res.status(200).json({
      success: true,
      message: "Login Successful!"
    })
  } catch (error) {

    mainError(
      error, res
    )
  }
}



// Login Controller:
export const WorkerLogin = async (req: Request, res: Response) => {
  const validatedData = LoginSchema.safeParse(req.body)

  if (validatedData.error) { const errors = validatedData.error.issues; return res.status(400).json({ success: false, message: errors[0].message })}

  // Validated email and password:
  const { email, password, role } = validatedData.data

  try {
    const user = await Worker.findOne({ email })
    if (!user) return res.status(400).json({ success: false, message: "Incorrect Email / Password" })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ success: false, message: "Incorrect Email / Password" })

    const verify = await Worker.findOne({ email: user.email, role })
    if (!verify) return res.status(400).json({ success: false, message: "Incorrect Email / Password" })
    
    // Only reached after the password matched, so this does not reveal accounts to guessers.
    if (user.status === "pending") return res.status(403).json({ success: false, message: "Your account is still being verified. We will email you once it is active." })
    if (user.status === "not_active") {
      const inactivity = user.get("deactivation")?.reason === "inactivity"
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DEACTIVATED",
        message: inactivity
          ? "Your account was deactivated due to inactivity. Use the reactivation link in your email or submit a reactivation request for admin review."
          : "Your account is not active. Contact an administrator.",
      })
    }
    if (user.status === "deleted") return res.status(400).json({ success: false, message: "Incorrect Email / Password" })
    recordQualifyingActivity(String(user._id), user.role, true)

    const token = jwt.sign({ id: user._id, name: user.name, role: user.role, status: user.status, email: user.email }, process.env.JWT_SECRET as string, {
      expiresIn: '1h'
    })

    res.cookie("token", token, authCookieOptions())

    return res.status(200).json({
      success: true,
      message: "Login Successful!"
    })
  } catch (error) {

    mainError(
      error, res
    )
  }
}



// For the FindJobs:
export const FindJobs = async (req: Request, res: Response) => {
  const validatedApp = OnlyAccepted.safeParse({ status: "ACCEPTED" })
  if (!validatedApp.success) { const errors = validatedApp.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}

  const { status } = validatedApp.data

  try {
    const jobs = await Job.find({ status })
      .populate("location")
      .sort({ createdAt: -1 })
      .lean()
    if (!jobs.length) return res.status(200).json({ success: true, jobs: [], message: "No jobs available" })

    const jobArray = jobs.map((info) => ({ info, IsApplied: false }))

    return res.status(200).json({
      success: true,
      jobs: jobArray
    })
  } catch (error) {
    mainError(
      error, 
      res
    )
  }
}



// View Skills:
export const ViewSkills = async (req: Request, res: Response) => {
  try {
    const skills = await Skill.find()
    if (!skills.length) return res.status(200).json({ success: true, message: "No Skills Yet" })

    return res.status(200).json({
      success: true,
      skills
    })
  } catch (error: unknown) {
    mainError(
      error, 
      res
    )
  }
}



// Display Dropdown Companies:
export const DropdownComp = async (req: Request, res: Response) => {
  try {
    const Industries = await Industry.find({ notAccepted: { $ne: true } }).sort({ createdAt: -1 })

    if (!Industries.length) return res.status(200).json({ success: true, Industries, message: "No Industries"})

    return res.status(200).json({
      success: true,
      Industries
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}



// Display Workers:
const PUBLIC_WORKER_FIELDS =
  "name photo jobTitle location yearsOfExperience about_me skills availability rating reviews status createdAt";

export const Workers = async (req: Request, res: Response) => {
  try {
    const [workers, registeredCount, ratingAgg, completedJobs, verifiedWorkers] = await Promise.all([
      Worker.find({ status: "active" })
        .select(PUBLIC_WORKER_FIELDS)
        .sort({ createdAt: -1 })
        .lean(),
      Worker.countDocuments({ status: { $ne: "deleted" } }),
      Rating.aggregate([{ $group: { _id: null, averageRating: { $avg: "$rating" } } }]),
      JobsCompleted.aggregate([
        { $match: { status: "COMPLETED" } },
        {
          $group: {
            _id: { workerId: "$workerId", workerAssignment: "$workerAssignment" },
          },
        },
        { $count: "total" },
      ]),
      VerifiedWorker.find({}, "worker").lean(),
    ]);

    const AverageRating = ratingAgg.length ? ratingAgg[0].averageRating : 0;
    const jobsCompletedCount = completedJobs[0]?.total ?? 0;

    const verifiedIds = new Set(verifiedWorkers.map((v) => String(v.worker)));

    const workersWithVerification = workers.map((worker) => ({
      ...worker,
      isVerified: verifiedIds.has(String(worker._id)),
    }));

    return res.status(200).json({
      success: true,
      Workers: workersWithVerification,
      RegisteredWorkers: registeredCount,
      AverageRating,
      jobs: jobsCompletedCount,
    });
  } catch (error) {
    mainError(error, res);
  }
};