import { TotalWorkers, PendingWorkers, VerifiedWorkers, DeclinedWorkers, NewSkillController, UpdateJobStatus, WorkersEmployers, Dashboard, ViewJobsNew, AddNewIndustry, Profiles, UpdateWorkersEmployersInformation, DeleteWorkerEmployer, Reports, Applications, AdminNotifications, MarkAsReadAdmin, markNotificationsAsRead, deleteAdminNotifSchema, Profile, WorkerVerification, UpdateReportStatus, UpdatePass } from "../controller/admin";
import { Router } from "express";
import authorized from "../middleware/authorized";
import { admin } from "../middleware/roles";

const router = Router()

// GET Routes:
router.get("/dashboard", authorized, admin, Dashboard)
router.get("/profiles/:role", authorized, admin, Profiles)
router.get("/workers", authorized, admin, TotalWorkers)
router.get("/workers/pending", authorized, admin, PendingWorkers)
router.get("/workers/accepted", authorized, admin, VerifiedWorkers)
router.get("/workers/declined", authorized, admin, DeclinedWorkers)
router.get("/applications/:company", authorized, admin, Applications)
router.get("/jobs", authorized, admin, ViewJobsNew)
router.get("/worker/employer", authorized, admin, WorkersEmployers)
router.get("/reports", authorized, admin, Reports)
router.get("/admin-notifications", authorized, admin, AdminNotifications)
router.get("/profile", authorized, admin, Profile)

// POST Routes:
router.post("/skill", authorized, admin, NewSkillController)
router.post("/industry", authorized, admin, AddNewIndustry)
router.post("/verify/worker", authorized, admin, WorkerVerification)

// PATCH Routes:
router.put("/updateJob/:job", authorized, admin, UpdateJobStatus)
router.put("/updateStatus", authorized, admin, UpdateWorkersEmployersInformation)
router.put("/deleteUser", authorized, admin, DeleteWorkerEmployer)

router.patch("/admin-notifications/mark-read", authorized, admin, markNotificationsAsRead);
router.patch("/admin-notifications/:_id", authorized, admin, MarkAsReadAdmin);
router.patch("/update/report", authorized, admin, UpdateReportStatus)

// PATCH Routes:
router.patch("/update/password", authorized, admin, UpdatePass)

// DELETE Routes:
router.delete("/admin-notifications/delete/:_id", authorized, admin, deleteAdminNotifSchema)

export default router