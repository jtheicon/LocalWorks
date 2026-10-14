import { Router } from "express";
import { Dashboard, UploadWorkerProfilePhoto, IsUserLogged, LogOut, MarkContactAsRead, viewPostedJobs, getCityProvinceList, viewJobOverview, AddLocation, AddTag, createJob, viewJobs, newApplication, viewApplications, WithdrawApplication, viewApplicationsEmployer, UpdateApp, UpdateInterview, CompanyDetails, ViewWorkers, IsApplied, Locations, ViewProfileController, UpdateWorker, UpdateEmployer, EmployerProfileController, ReviewUpload, PostContact, OpenPositionsTotalApplications, GetIndustries, UploadEmployerProfilePhoto, ViewContacts, ViewMessage, NewMessage, ViewContactsEmployer, UserNotifications, MarkAsRead, DeleteNotification, MarkAllAsRead, NewReport, GetReports, UpdateReport, DeleteReport, NewWorkerAssignment, WorkerAssignments, UploadWorkerJob, UploadWorkerJobFile, UpdateWorkerJob, SubmittedFiles, SubmittedJobs, SubmittedJobsById, CompletedAssignments, NewWorkerJob, DeleteWorkerJob, DeleteWorkerJobFile, GetReportDetails, ReportEvidence, SubmitReason, ViewEmployerResponses, SubmitEvidenceUpdateController, DeleteReportX, DeleteReports } from "../controller/protected";
import authorized from "../middleware/authorized";
import { employers, worker, admin } from "../middleware/roles";
import { uploadProfilePhoto, uploadFiles, uploadEmployerPermit } from "../file/upload";

const router = Router()

// GET Requests [Global]:
router.get("/dashboard", authorized, Dashboard)
router.get("/isWorkerLogged", authorized, worker, IsUserLogged)
router.get("/isEmployerLogged", authorized, employers, IsUserLogged)
router.get("/isAdminLogged", authorized, admin, IsUserLogged)
router.get("/Location", authorized, employers, getCityProvinceList);
router.get("/notifications", authorized, UserNotifications)
router.get("/message/:_id", authorized, ViewMessage)
router.get("/worker-assignments", authorized, WorkerAssignments)

// GET [Worker & Employer]:
router.get("/notifications", authorized, UserNotifications)
router.get("/reports", authorized, GetReports)
router.get("/report/:_id", authorized, GetReportDetails)

// PATCH [Global]:
router.patch("/markAsRead/:_id", authorized, MarkAsRead)
router.patch("/markAllAsRead", authorized, MarkAllAsRead)
router.patch(
  "/contacts/:contactId/read",
  authorized,
  MarkContactAsRead
);

// DELETE [Global]:
router.delete("/deleteNotif/:_id", authorized, DeleteNotification)

// POST Request [Worker & Employer]:
router.post("/message/:contact", authorized, NewMessage)

// PATCH [Worker & Employer]:
router.patch("/update/worker/job/worker", authorized, worker, UpdateWorkerJob)
router.patch("/update/worker/job/employer", authorized, employers, UpdateWorkerJob)

// GET Requests [Workers]:
router.get("/viewJobs", authorized, worker, viewJobs)
router.get("/isApplied/:job", authorized, worker, IsApplied)
router.get("/worker/profile", authorized, worker, ViewProfileController)
router.get("/contacts", authorized, worker, ViewContacts)

router.get("/jobs/submitted/:_id", authorized, worker, SubmittedFiles)
router.get("/responses/:applicationId", authorized, ViewEmployerResponses)


// GET Requests [Employers]:
router.get("/viewPostedJobs", authorized, employers, viewPostedJobs)
router.get("/viewJobOverview", authorized, employers, viewJobOverview)

router.get("/viewApplications", authorized, worker, viewApplications)
router.get("/viewApplications/employer", authorized, employers, viewApplicationsEmployer)

router.get("/company", authorized, employers, CompanyDetails)
router.get("/viewWorkers", authorized, employers, ViewWorkers)

router.get("/Locations", authorized, employers, Locations)
router.get("/employer/information", authorized, employers, EmployerProfileController)
router.get("/openPositions/totalApplications", authorized, employers, OpenPositionsTotalApplications)

router.get("/Industries", authorized, employers, GetIndustries)
router.get("/employer/contacts", authorized, employers, ViewContactsEmployer)

router.get("/submitted/worker/assignments", authorized, employers, SubmittedJobs)
router.get("/completed", authorized, employers, CompletedAssignments)

router.get("/worker/assignment/:workerId/:employerId/:workerAssignment", authorized, employers, SubmittedJobsById)


// // POST Requests [Workers]:
router.post("/createApplication", authorized, worker, newApplication)
router.post("/rating", authorized, worker, ReviewUpload)
router.post("/report/worker", authorized, worker, NewReport)
router.post("/report/employer", authorized, employers, NewReport)

router.post("/upload/worker/job/:employerId", authorized, worker, UploadWorkerJob)
router.post("/upload/worker/jobFile", authorized, worker, UploadWorkerJobFile)
router.post("/new/worker/job", authorized, worker, NewWorkerJob)

// // POST Requests [Employers]:
router.post("/createJob", authorized, employers, createJob)
router.post("/addLocation", authorized, employers, AddLocation)

router.post("/addTag", authorized, employers, AddTag)
router.post("/contact", authorized, employers, PostContact)

router.post("/worker/assignment", authorized, employers, NewWorkerAssignment)

// POST Requests [Workers & Employers]:
router.post("/report/submit/evidence", authorized, ReportEvidence)
router.post("/application/reason", authorized, SubmitReason)


// PUT [Workers]:
router.put("/withdrawApplication", authorized, worker, WithdrawApplication)

router.put(
  "/worker/updateProfile",
  uploadFiles.fields([
    { name: "resume", maxCount: 1 }, // Required
    { name: "photo", maxCount: 1 },  // Optional
  ]),
  authorized,
  worker,
  UpdateWorker
)
router.put(
  "/worker/upload-photo",
  authorized,
  worker,
  uploadProfilePhoto.single("photo"),
  UploadWorkerProfilePhoto
);
router.put(
  "/employer/upload-photo",
  authorized,
  employers,
  uploadProfilePhoto.single("photo"),
  UploadEmployerProfilePhoto
);

// PUT [Employers]:
router.put("/date", authorized, employers, UpdateInterview)
router.put("/update/application", authorized, employers, UpdateApp)
router.put(
  "/update/employer",
  uploadEmployerPermit.fields([
    { name: "photo", maxCount: 1 },
    { name: "permit", maxCount: 1 },
  ]),
  authorized,
  employers,
  UpdateEmployer
);

// PUT [Workers & Employers]:
router.put("/report", authorized, UpdateReport)
router.put("/update/evidences", authorized, SubmitEvidenceUpdateController)

// DELETE [Workers]:
router.delete("/worker/job/file/:_id", authorized, worker, DeleteWorkerJobFile)
router.delete("/worker/job/:name/:_id", authorized, worker, DeleteWorkerJob)

// DELETE [Worker & Employer]:
router.delete("/delete/report/:_id", authorized, DeleteReport)
router.delete("/delete/reports", authorized, DeleteReports)

// DELETE [Worker & Employer]:
router.delete("/delete/report/x/:reportId/:fileName/:fileID", authorized, DeleteReportX)

// LogOut Controller:
router.post("/logout", authorized, LogOut)

export default router