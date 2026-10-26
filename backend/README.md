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

Preview: `npm run seed:inactivity`. Apply: `npm run seed:inactivity -- --apply`. Reset: `npm run seed:inactivity -- --reset`. Optional: `--apply --run-job` resets only the seeded overdue worker to its test state, then runs the monitor for only that worker so it will not deactivate unrelated accounts. This makes the email test repeatable. The seed keeps the worker's registered address at a reserved `.test` address and routes lifecycle emails to `INACTIVITY_DEMO_EMAIL` when set. This includes inactivity warnings, deactivation, request receipt, and admin decision notices; it will not overwrite or reuse an existing account email. For Gmail SMTP, set `EMAIL_USER` to the sender account and `EMAIL_PASS` to its Google App Password (not the account login password). Set `EMAIL_OWNER` to that Gmail address or a verified Gmail send-as alias, and `APP_URL` to the frontend origin so email links open the application. Requires a **Construction** industry (created by `seed:demo` or on first server start).
Applying the seed also refreshes the dedicated active worker login: `worker-active@localworks-inactivity.test`, using the password in `SEED_DEMO_PASSWORD`. Use the **Worker** login tab. This is separate from `INACTIVITY_DEMO_EMAIL`, which is only the lifecycle notification inbox, and from the already-overdue worker that is deactivated to test reactivation.

#### Six-month deactivation and reactivation email test

This scenario uses a separate demo worker; it does not register your Gmail address as a worker or change the existing Gmail account. Set a new temporary `SEED_DEMO_PASSWORD` (do not reuse a password shared in chat), set `INACTIVITY_DEMO_EMAIL` to a mailbox you control, and make sure the sender uses a valid Gmail App Password. In PowerShell, from `backend\`:

```powershell
$env:INACTIVITY_DEMO_EMAIL = '<your inbox>'
$env:SEED_DEMO_PASSWORD = '<new temporary demo password>'
$env:SEED_CONFIRM_PRODUCTION = 'I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION'
$env:APP_URL = 'http://localhost:8080'
npm run seed:inactivity
```

Check the preview and verify `MONGO_URI` in the local environment targets a **test database**. Then execute:

```powershell
npm run seed:inactivity -- --apply --run-job
```

The job resets and processes only `worker-due-deactivation@localworks-inactivity.test`, whose last qualifying activity is six calendar months old. Success should report `processed=1, deactivated=1, emailFailures=0`. Check the mailbox (and spam folder) for the message with the one-time reactivation-request link. Worker login for this demo address should return `ACCOUNT_DEACTIVATED` until reactivated; login itself does not send the request link. Open the email link, submit the request, then approve Mika DueDeactivation under **Admin dashboard → Reactivation requests**. After approval, sign in with the demo email and the temporary seed password. `--apply --run-job` can be rerun to resend a fresh link; each rerun resets only this fixture and invalidates its prior unused link.

To test with an existing worker account instead of the reserved demo address, set `INACTIVITY_DEMO_ACCOUNT_EMAIL` to that worker's email and preview the target first:

```powershell
$env:INACTIVITY_DEMO_ACCOUNT_EMAIL = 'your-worker-email@example.com'
$env:INACTIVITY_DEMO_EMAIL = 'your-notification-inbox@example.com'
npm run seed:inactivity -- --use-email-account
```

Verify the preview names the intended worker, and confirm `MONGO_URI` is the intended test database. Applying this test changes that worker's inactivity/deactivation fields but does not change its password. It temporarily sets the worker active with a six-month-old activity timestamp, immediately runs the inactivity monitor for that worker only, then sends the reactivation link to `INACTIVITY_DEMO_EMAIL`. It refuses deleted, pending, and admin-deactivated accounts. Only proceed for a worker account you own:

```powershell
$env:SEED_CONFIRM_PRODUCTION = 'I_UNDERSTAND_THIS_WRITES_TO_PRODUCTION'
npm run seed:inactivity -- --apply --run-job --use-email-account
```

Expected result: `processed=1, deactivated=1, emailFailures=0`. The selected worker must be blocked from new login until an admin approves the reactivation request. The email contains the one-time reactivation request link; signing in does not trigger a new link.

To refresh only the demo fixtures and active worker password without running the deactivation test, use `npm run seed:inactivity -- --apply`. Then verify the credentials against the same database used by the frontend API with `npm run seed:inactivity -- --check-login`. Set `WORKER_LOGIN_EMAIL` to check a different worker address; by default it checks `worker-active@localworks-inactivity.test`. The check is read-only and reports whether the account exists, is eligible to log in, and its password matches `SEED_DEMO_PASSWORD`; it never prints the password or hash.

Use `WORKER_LOGIN_EMAIL=<address> npm run seed:inactivity -- --inspect-account` to read-only inspect whether the configured database has that email under a worker or employer account and report its status. Deleted accounts cannot log in. Re-registering a deleted email requires the normal worker signup flow, including email verification and a valid resume; the old soft-deleted history remains archived.

After the worker submits the email link, an administrator can review the request under **Admin dashboard → Reactivation requests**, then approve or reject it. The seed also creates an already-pending example for previewing that screen without sending an email.

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
