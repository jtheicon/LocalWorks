import { Credibility } from "../controller/credibility";
import { Router } from "express";
import { Dashboard, UploadWorkerProfilePhoto, IsUserLogged, LogOut, MarkContactAsRead, viewPostedJobs, getCityProvinceList, viewJobOverview, AddLocation, AddTag, createJob, UpdateJob, viewJobs, newApplication, viewApplications, WithdrawApplication, viewApplicationsEmployer, UpdateApp, UpdateInterview, CompanyDetails, ViewWorkers, IsApplied, Locations, ViewProfileController, UpdateWorker, UpdateEmployer, EmployerProfileController, ReviewUpload, PostContact, OpenPositionsTotalApplications, GetIndustries, UploadEmployerProfilePhoto, ViewContacts, ViewMessage, NewMessage, ViewContactsEmployer, UserNotifications, MarkAsRead, DeleteNotification, MarkAllAsRead, NewReport, GetReports, UpdateReport, DeleteReport, NewWorkerAssignment, WorkerAssignments, UploadWorkerJob, UploadWorkerJobFile, UpdateWorkerJob, SubmittedFiles, SubmittedJobs, SubmittedJobsById, CompletedAssignments, NewWorkerJob, DeleteWorkerJob, DeleteWorkerJobFile, GetReportDetails, ReportEvidence, SubmitReason, ViewEmployerResponses, SubmitEvidenceUpdateController, DeleteReportX, DeleteReports } from "../controller/protected";
import authorized from "../middleware/authorized";
import { enforceActiveAccount } from "../middleware/enforceActiveAccount";
import { trackQualifyingActivityOnSuccess } from "../middleware/qualifyingActivity";
import { employers, worker, admin } from "../middleware/roles";
import { uploadProfilePhoto, uploadFiles, uploadEmployerPermit } from "../file/upload";

const router = Router()

router.use(authorized, enforceActiveAccount, trackQualifyingActivityOnSuccess);

// GET Requests [Global]:
router.get("/dashboard", Dashboard)
router.get("/isWorkerLogged", worker, IsUserLogged)
router.get("/isEmployerLogged", employers, IsUserLogged)
router.get("/isAdminLogged", admin, IsUserLogged)
router.get("/Location", employers, getCityProvinceList);
router.get("/notifications", UserNotifications)
router.get("/message/:_id", ViewMessage)
router.get("/worker-assignments", WorkerAssignments)

// GET [Worker & Employer]:
router.get("/notifications", UserNotifications)
router.get("/reports", GetReports)
router.get("/report/:_id", GetReportDetails)

// PATCH [Global]:
router.patch("/markAsRead/:_id", MarkAsRead)
router.patch("/markAllAsRead", MarkAllAsRead)
router.patch(
  "/contacts/:contactId/read",
  authorized,
  MarkContactAsRead
);

// DELETE [Global]:
router.delete("/deleteNotif/:_id", DeleteNotification)

// POST Request [Worker & Employer]:
router.post("/message/:contact", NewMessage)

// PATCH [Worker & Employer]:
router.patch("/update/worker/job/worker", worker, UpdateWorkerJob)
router.patch("/update/worker/job/employer", employers, UpdateWorkerJob)

// GET Requests [Workers]:
router.get("/viewJobs", worker, viewJobs)
router.get("/isApplied/:job", worker, IsApplied)
router.get("/worker/profile", worker, ViewProfileController)
router.get("/contacts", worker, ViewContacts)

router.get("/jobs/submitted/:_id", worker, SubmittedFiles)
router.get("/responses/:applicationId", ViewEmployerResponses)


// GET Requests [Employers]:
router.get("/viewPostedJobs", employers, viewPostedJobs)
router.get("/viewJobOverview", employers, viewJobOverview)

router.get("/viewApplications", worker, viewApplications)
router.get("/viewApplications/employer", employers, viewApplicationsEmployer)

router.get("/company", employers, CompanyDetails)
router.get("/viewWorkers", employers, ViewWorkers)

// Credibility scores (any signed-in user; admins included)
router.post("/credibility", Credibility)

router.get("/Locations", employers, Locations)
router.get("/employer/information", employers, EmployerProfileController)
router.get("/openPositions/totalApplications", employers, OpenPositionsTotalApplications)

router.get("/Industries", employers, GetIndustries)
router.get("/employer/contacts", employers, ViewContactsEmployer)

router.get("/submitted/worker/assignments", employers, SubmittedJobs)
router.get("/completed", employers, CompletedAssignments)

router.get("/worker/assignment/:workerId/:employerId/:workerAssignment", employers, SubmittedJobsById)


// // POST Requests [Workers]:
router.post("/createApplication", worker, newApplication)
router.post("/rating", worker, ReviewUpload)
router.post("/report/worker", worker, NewReport)
router.post("/report/employer", employers, NewReport)

router.post("/upload/worker/job/:employerId", worker, UploadWorkerJob)
router.post("/upload/worker/jobFile", worker, UploadWorkerJobFile)
router.post("/new/worker/job", worker, NewWorkerJob)

// // POST Requests [Employers]:
router.post("/createJob", employers, createJob)
router.post("/addLocation", employers, AddLocation)

router.post("/addTag", employers, AddTag)
router.post("/contact", employers, PostContact)

router.post("/worker/assignment", employers, NewWorkerAssignment)

// POST Requests [Workers & Employers]:
router.post("/report/submit/evidence", ReportEvidence)
router.post("/application/reason", SubmitReason)


// PUT [Workers]:
router.put("/withdrawApplication", worker, WithdrawApplication)

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
router.put("/job/:_id", employers, UpdateJob)
router.put("/date", employers, UpdateInterview)
router.put("/update/application", employers, UpdateApp)
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
router.put("/report", UpdateReport)
router.put("/update/evidences", SubmitEvidenceUpdateController)

// DELETE [Workers]:
router.delete("/worker/job/file/:_id", worker, DeleteWorkerJobFile)
router.delete("/worker/job/:name/:_id", worker, DeleteWorkerJob)

// DELETE [Worker & Employer]:
router.delete("/delete/report/:_id", DeleteReport)
router.delete("/delete/reports", DeleteReports)

// DELETE [Worker & Employer]:
router.delete("/delete/report/x/:reportId/:fileName/:fileID", DeleteReportX)

// LogOut Controller:
router.post("/logout", LogOut)

export default router