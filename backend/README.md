# LocalWork - Back End

# Security Documentation:
- We utilized dotenvx instead of dotenv for a more secure way of using dotenv.
- Passwords were hashed before they were inserted via the MongoDB to ensure password security. During the development process, we first focused on drafting what must be included via the server.
- We ensured that the server utilizes both mongoose and zod for input validation before accepting the controllers to insert data / utilize data that will be used for DB commands.
- And then for some user inputs that only accepts strings without any regex that may prevent XSS such as <script>alert("ok")</script> we utilized the filterXSS function via the xss module.

# API Documentation:

- Clone this repository via github
- Install express, and use this command:
```npm install```
- Execute the API using this command:
```npm start```


## MongoDB Connection: ##
```
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string)
    console.log("Successfully Connected to MongoDB!")
  } catch (error) {
    console.error("Failed to connect to MongoDB!")
    process.exit(1)
  }
}

export default connectDB
```

## Database seed scripts

All seeds live under `src/scripts/`. Run **`npm run seed`** from `backend/` to print this list with preview/apply commands. Nothing was removed—each script is separate and idempotent.

| npm command | Script | Purpose |
|-------------|--------|---------|
| `seed:jobs` | `seedJobs.ts` | Three demo jobs (PENDING / ACCEPTED / DECLINED) for one **existing** employer |
| `seed:demo` | `seedDemo.ts` | Full presentation dataset (users, jobs, apps, messages, reports, ratings) |
| `seed:inactivity` | `seedInactivityDemo.ts` | Account inactivity / reactivation demo accounts |

Shared safety env for writes: `SEED_CONFIRM_PRODUCTION=I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION`. Demo logins also need `SEED_DEMO_PASSWORD` (min 8 chars) for `seed:demo` and `seed:inactivity`.

### `seed:jobs` — dashboard job counts

The job seed adds three clearly labeled demo jobs for one existing, eligible employer:
one `PENDING`, one `ACCEPTED`, and one `DECLINED`. It does not create an employer,
delete records, or overwrite existing jobs. Re-running it recognizes its fixed fixture
IDs and skips jobs already seeded.

Set `SEED_EMPLOYER_EMAIL` to the email of the existing employer to use. `MONGO_URI`
must point to the intended Atlas database and is loaded through dotenvx. First run a
read-only preview:

```powershell
$env:SEED_EMPLOYER_EMAIL="<existing-employer-email>"
npm run seed:jobs
```

The script only writes when explicitly applied and the production confirmation is set:

```powershell
$env:SEED_CONFIRM_PRODUCTION="I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION"
npm run seed:jobs -- --apply
```

The seeded records are real production job documents and may appear in the product.
Review the preview and confirm the database target before applying.

### `seed:demo` — full demo dataset

Preview (no writes): `npm run seed:demo`. Apply: `npm run seed:demo -- --apply`. Remove demo docs only: `npm run seed:demo -- --reset`.

### `seed:inactivity` — inactivity policy demo

Preview: `npm run seed:inactivity`. Apply: `npm run seed:inactivity -- --apply`. Reset: `npm run seed:inactivity -- --reset`. Optional: `--apply --run-job` runs the inactivity monitor once after seeding. Requires a **Construction** industry (created by `seed:demo` or on first server start).

## Cross-origin authentication

For a deployed frontend, set `CORS_ORIGINS` in the backend environment to the exact
frontend origin, or a comma-separated list of allowed origins. For example:
`https://app.example.com`. Set `NODE_ENV=production` when the backend is served over
HTTPS; auth cookies then use `SameSite=None; Secure` for cross-site requests. The
frontend must send credentialed requests (Axios: `withCredentials: true`; Fetch:
`credentials: "include"`). The local development default remains
`http://localhost:8080`.

## Admin model: ```/src/model/Admin.ts``` ##
```
import { Document, Schema, model } from "mongoose";

export interface IAdmin extends Document {
  name: string,
  email: string,
  password: string,
  role: string,
  avatar: string
}

const AdminSchema: Schema = new Schema({
  name: { type: String, required: [true, "Name is required"], unique: [true, "Name already exists"] },
  email: { type: String, required: [true, "Email is required"], unique: [true, "Email must be unique"] },
  password: { type: String, required: [true, "Password is required"] },
  role: { type: String, enum: ["admin"], default: "admin" },
  avatar: { type: String, required: [true, "Avatar must be a string"], default: "default.jpg" }
})

export default model<IAdmin>("Admin", AdminSchema)
```

## Admin Register & Login Controller: ```/src/controller/admin.ts``` ##
```
// Register Admin:
export const AdminRegister = async (req: any, res: Response) => {
  const validatedData = AdminSchema.safeParse(req.body)
  if (validatedData.error) { const errors = validatedData.error.issues; return res.status(400).json({ success: false, message: errors[0].message }) }

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
  if (validatedData.error) { const errors = validatedData.error.issues; return res.status(400).json({ success: false, message: errors[0].message }) }

  const { email, password } = validatedData.data;

  try {
    const admin = await Admin.findOne({ email })
    if (!admin) return res.status(400).json({ success: false, message: "Invalid email / password"});

    const Match = await bcrypt.compare(password, admin.password)
    if (!Match) return res.status(400).json({ success: false, message: "Invalid email / password"});

    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET as string, { expiresIn: '1h' })
    res.cookie('token', token, { expires: new Date(Date.now() + 60 * 60 * 1000), httpOnly: true, sameSite: 'strict' })

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
```


## Admin Router: ```/src/route/admin.ts``` ##
```
import { PendingJobs, TotalJobs, TotalWorkers, PendingWorkers, VerifiedWorkers, DeclinedWorkers } from "../controller/admin";
import { Router } from "express";
import authorized from "../middleware/authorized";
import { admin } from "../middleware/roles";

const router = Router()

// GET Routes:
router.get("/totalJobs", authorized, admin, TotalJobs)
router.get("/pendingJobs", authorized, admin, PendingJobs)
router.get("/workers", authorized, admin, TotalWorkers)
router.get("/workers/pending", authorized, admin, PendingWorkers)
router.get("/workers/accepted", authorized, admin, VerifiedWorkers)
router.get("/workers/declined", authorized, admin, DeclinedWorkers)

export default router
```

## Access Control Roles: ```/src/middleware/roles.ts``` ##
```
import { Request, Response, NextFunction } from "express"


// If the user role === "admin":
export const admin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admins only!"
    })
  }
  next()
}

// If the user role === "worker":
export const worker = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.role !== "worker") {
    return res.status(403).json({
      success: false,
      message: "Workers only!"
    })
  }
  next()
}

// If the user role === "employer":
export const employers = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.role !== "employer") {
    return res.status(403).json({
      success: false,
      message: "Employers only!"
    })
  }
  next()
}
```


# Deployment Guide:
- For deployment, we are utilizing Github for pushing updates via the repository.
- With Github Desktop, it simplifies the process of managing repository updates.
- Link for download guide: ```[http://docs.github.com](https://docs.github.com/en/desktop/installing-and-authenticating-to-github-desktop/installing-github-desktop)```

# Troubleshooting Session:
- For Troubleshooting, we console.log the errors and we don't display error messages via the res.json to ensure that attackers won't have access to the details of the application.
- We implemented Try/catch error handling & we utilized a file that handles errors to reduce redundant codes.

## Code for Error Handling: ```/src/errors/showErrors.ts```
```
import { Response } from "express"

// If there are instace of errors:
export const instanceErrors = (error: unknown, res: Response) => {
  if (error instanceof Error) {
    console.error(error)

    return res.status(400).json({
      success: false,
      message: error.message
    })
  }

  mainError(error, res)
}


// If there is only an internal server error:
export const mainError = (error: unknown, res: Response) => {
  console.error(error)

  return res.status(500).json({
    success: false,
    message: "Internal Server Error"
  })
}
```

## Maintenance Notes:
- For maintaining this system, it is crucial to ensure that we stay updated to the trending updates of the language/framework, implement best practices that may mitigate risks before they occur, and to use defensive programming to anticipate errors and to prevent unexpected problems that may eventually occur if our project is not monitored.
