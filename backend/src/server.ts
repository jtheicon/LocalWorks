import { scheduleAccountCleanup } from "./services/accountCleanup";
import express from "express";
import connectDB from "./config/db";
import authRouter from "./route/authentication"
import protectedRoutes from "./route/protected"
import adminRoutes from "./route/admin"
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser"
import { Server } from "socket.io";
import { initSocket } from "./socket";
import http from "http"
import applicationHealthRouter from "./route/applicationHealth.route";
import accountLifecycleRouter from "./route/accountLifecycle";
import mongoose from "mongoose";
import PlatformHealth from "./model/PlatformHealth";
import Admin from "./model/Admin";
import bcrypt from "bcryptjs";
import Industry from "./model/Industry";
import { allowedOrigins } from "./config/http";

connectDB()

// service
export const recordPlatformHealth = async () => {
  let status: "OK" | "ERR" = "OK";

  try {
    await mongoose.connection.db?.command({
      ping: 1
    });
  } catch {
    status = "ERR";
  }

  await PlatformHealth.create({
    status
  });
};

const app = express()
const server = http.createServer(app);


const io = initSocket(server)

// io.on("connection", (socket) => {
//   console.log("Connected:", socket.id);

//   const workerId = socket.handshake.auth.workerId;

//   console.log("Auth workerId:", workerId);

//   if (workerId) {
//     socket.join(workerId);

//     console.log(
//       "Rooms after join:",
//       [...socket.rooms]
//     );
//   }
// });

io.on("connection", (socket) => {
  const workerId = socket.handshake.auth.workerId;
  const employerId = socket.handshake.auth.employerId;
  const adminId = socket.handshake.auth.adminId;

  console.log("CONNECTED:", socket.id);
  console.log("AUTH:", socket.handshake.auth);

  if (employerId) {
    console.log("[SOCKET] employer connecting:", employerId);
    socket.join(employerId);

    console.log(
      "[SOCKET] rooms after join:",
      Array.from(socket.rooms)
    );
  }

  if (workerId) {
    socket.join(workerId);
  }

  if (adminId) {
    socket.join("admins");
  }
});


// Allow Cookies:
app.use(cookieParser())

// Security middlewares:

/*
Source - https://stackoverflow.com/a/73001269
Posted by Alfredo Bangun, modified by community. See post 'Timeline' for change history
Retrieved 2026-02-16, License - CC BY-SA 4.0
*/

app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

app.use(express.json())
app.use("/public", express.static('public'))
app.use("/uploads", express.static("uploads"));
app.use("/uploads/profile", express.static("uploads/profile"));


// Rate Limit:
const rateLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 500,
  message: "Too many requests, please try again after 2 minutes"
})

// Allow app to use rate limiter and speed limiter:
app.use("/api", rateLimiter)

// Middlewares for authentication and protected and admin:
app.use("/api/auth", authRouter)
app.use("/api/account", accountLifecycleRouter)
app.use("/api/pro", protectedRoutes)
app.use("/api/admin", adminRoutes)


app.use("/api/application-health", applicationHealthRouter)

const port = process.env.PORT || 8920

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the existing backend process before starting another instance.`);
  } else {
    console.error("Failed to start the server:", error);
  }

  process.exit(1);
});

server.listen(port, async () => {
  const result = await Admin.find();

  const salt = await bcrypt.genSalt(12);
  const hashed = await bcrypt.hash(process.env.ADM_PASSWORD as string, salt);

  const IndustryArray = ["Construction", "Cleaning", "Waiter", "Insurance", "Retail", "E-commerce", "Wholesale Trade", "Retail", "Food", "Security", "Accounting", "Banking", "Technology"]

  // Ensures that there is industry always.
  for (let Index = 0; Index < IndustryArray.length; Index++) {
    const result = await Industry.findOne({ title: "Construction" })

    if (!result) {
      const newIndustry = new Industry({ title: IndustryArray[Index] , notAccepted: false })
      await newIndustry.save()
    }
  }

  if (!result.length) {
    const newAdmin = new Admin({
      name: process.env.ADM_NAME,
      email: process.env.ADM_EMAIL,
      password: hashed
    })

    await newAdmin.save()
    console.log("Admin has been created!")
  } else {
    console.log("An admin already exists, that's why there's no need for a new admin")
  }

  console.log(`Server listening on port ${port}`);

  recordPlatformHealth();

  setInterval(() => {
    recordPlatformHealth();
  }, 60000); // every 1 minute

  // Delete accounts inactive for 6+ months: shortly after startup, then daily.
  scheduleAccountCleanup();
});