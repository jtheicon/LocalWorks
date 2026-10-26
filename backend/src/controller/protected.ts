import { Request, Response } from "express";
import { clearAuthCookieOptions } from "../config/http";
import { ApplicationSchema, CompanySchema, JobOverviewSchema, EmployerIdSchema, JobSchema, LocationSchema, TagSchema, employerIdSchema, ViewProfile, WorkerIDJob, JobIDJob, ApplicationStatusUpdate, OnlyAccepted, UpdateApplication, InterviewDate, CompanySchemaID, IsAppliedS, WorkerID, TimeLineStatus, UpdateWorkerSchema, UpdateEmployerSchema, EmployerProfileS, RatingSchema, PostContacts, EmployerSchemaid, SkillID, PostMessage, ViewMessageByContactID, NotificationIDSchema, reportValidator, reportWorkerValidator, UpdateReportSchema, DeleteReportSchema, NewWorkerAssignmentSchema, UploadWorkerJobSchema, UpdateWorkerJobSchema, SubmittedFilesSchema, DeleteWorkerJobSchema, SubmittedJobsSchema, SubmittedJobsIDSchema, CompletedAssignmentSchema, NewWorkerJobSchema, DeleteJobSchema, GetReportDetailsSchema, StatusReasonSchema, ViewEmployerResponsesSchema, SubmitEvidenceUpdate, DeleteReportXSchema, DeleteReportsSchema } from "../validator/protected";
import Job from "../model/Job";
import { autoModerateJob, runInBackground } from "../services/autoVerify";
import {
  computeLifecycle,
  inactivityPolicyEffectiveAt,
  nextInactivityMilestone,
  scheduledActionDate,
  wholeMonthsSince,
  DEACTIVATION_MONTHS,
} from "../services/inactivityPolicy";
import { filterXSS } from "xss";
import Application from "../model/Application";
import { UserSchema } from "../validator/authentication";
import { Types } from "mongoose";
import { instanceErrors, mainError } from "../errors/showErrors";
import Tag from "../model/Tag";
import { success } from "zod";
import Worker from "../model/Worker";
import Location from "../model/Location";
import Skill from "../model/Skill";
import Employer from "../model/Employer";
import Industry from "../model/Industry";
import Rating from "../model/Rating";
import Contact from "../model/Contact";
import axios from "axios";
import Company from "../model/Company";
import AdminNotification from "../model/AdminNotification";
import UserNotification from "../model/UserNotification";
import { createJobPayload, NewApplicationPayload, NewReportPayload } from "../notif-payload/admin";
import { NewMessagePayload, PostContactPayload, UpdateApplicationPayload, NewApplicationPayloadEmployer, NewReportPayloadEmployer, UpdateReportPayload, WorkerAssignmentPayload, UploadWorkerJobPayload, UpdateWorkerJobWorker, UpdateWorkerJobCompleted, UpdateWorkerJobRejected, UploadReasonPayload } from "../notif-payload/user";
import { getIO } from "../socket";
import Message from "../model/Message";
import stringComparison from "string-comparison";
import ApplicationAccepted from "../model/ApplicationAccepted";
import { ResponseModel } from "../model/Response";
import Report from "../model/Report";
import VerifiedWorker from "../model/VerifiedWorker";
import ReportWorker from "../model/ReportWorker";
import { matchJobsForWorker, matchWorkersForJob } from "../services/jobMatching";
import {
  formatApplicationForEmployer,
  isWorkerUnavailableToEmployer,
} from "../services/employerWorkerDisplay";
import { purgeStaleApplicationsForEmployer } from "../services/employerApplicationCleanup";
import { RECOMMENDED_SCORE } from "../matching/skillScore";
import WorkerAssignment from "../model/WorkerAssignment";
import fs from "fs";
import path from "path";
import JobsCompleted from "../model/JobsCompleted";
import { uploadJobs, reportUpload } from "../file/upload";
import { worker } from "../middleware/roles";
import Admin from "../model/Admin";
import Reason from "../model/Reason";
import nodemailer from 'nodemailer';


// Replace File Function:
const replaceFile = (oldFile: string | undefined, newFile: Express.Multer.File | undefined, folder: string) => {
  if (!newFile) {
    return oldFile;
  }

  if (oldFile) {
    const oldPath = path.join(folder, oldFile);

    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  return newFile.filename;
};

// Use the string comparison jaro winkler:
const jaro = stringComparison.jaroWinkler;

// Normalize the string and use a threshold of 95% accuracy:
const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, "").trim();
const THRESHOLD = 0.95;

// [Global: Dashboard] -  Controller used for testing if middleware worked:
export const Dashboard = async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "Dashboard Info"
  })
}

// [Global: IsUserLogged] - Controller used for determining if the user is logged:
export const IsUserLogged = async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "User Successfully Logged"
  })
}

// [Worker & Employer: UserNotifications] - Show User Notifications.
export const UserNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await UserNotification
                                  .find({ targetUsers: req.user.id})
                                  .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    instanceErrors(error, res);
  }
};

// [Worker & Employer: MarkAsRead] - This marks the notification as read.
export const MarkAsRead = async (req: Request, res: Response) => {
  const validatedData = NotificationIDSchema.safeParse({ _id: req.params._id })

  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      message: validatedData.error.issues[0].message
    })
  }

  const { _id } = validatedData.data;

  try {
    const notification = await UserNotification.findOne({ _id })

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      })
    }

    notification.read = true || notification?.read
    await notification.save()

    return res.status(200).json({
      success: true,
      message: "Marked as Read"
    })
  } catch (error) {
    mainError(error, res)
  }
}

// [Worker & Employer: WorkerAssignments] - This displays the worker assignments based on targetWorkers for worker and employerId for employer.:
export const WorkerAssignments = async (req: Request, res: Response) => {
  try {
    let workerAssignments: any = [];

    if (req.user.role === "worker") {
      const workerAssignment = await WorkerAssignment.find({ targetWorkers: { _id: req.user.id } }).sort({ createdAt: -1 }).populate("employerId")

      for (let i = 0; i < workerAssignment.length; i++) {
        const jobsCompleted = await JobsCompleted.findOne({ workerId: req.user.id, workerAssignment: workerAssignment[i]._id, submitted: true, status: "COMPLETED" })

        // Source - https://stackoverflow.com/a/27538363
        // Posted by thefourtheye, modified by community. See post 'Timeline' for change history
        // Retrieved 2026-07-23, License - CC BY-SA 4.0

        // const arrObj = [{a: 1, b: 2}, {c: 3, d: 4}, {e: 5, f: 6}];

        // console.log(arrObj.reduce(function(result, current) {
        //   return Object.assign(result, current);
        // }, {}));s

        // // If you prefer arrow functions, you can make it a one-liner
        // console.log(arrObj.reduce(((r, c) => Object.assign(r, c)), {}));

        // // Thanks Spen from the comments. You can use the spread operator with assign
        // console.log(Object.assign({}, ...arrObj));

        const jobsSubmitted = await JobsCompleted.findOne({ workerId: req.user.id, workerAssignment: workerAssignment[i]._id, submitted: true })
        const jobsRejected = await JobsCompleted.findOne({ workerId: req.user.id, workerAssignment: workerAssignment[i]._id, submitted: false, status: "REJECTED" })

        if (jobsSubmitted) {
          if (jobsCompleted) {
            const objArray = { workerAssignment: workerAssignment[i], submitted: true, completed: true, rejected: false }
            workerAssignments.push(objArray)
          } else {

            const objArray = { workerAssignment: workerAssignment[i], submitted: true, completed: false, rejected: false }
            workerAssignments.push(objArray)
          }

        } else {
          if (jobsRejected) {
            const objArray = { workerAssignment: workerAssignment[i], submitted: false, completed: false, rejected: true }
            workerAssignments.push(objArray)
          } else {
            const objArray = { workerAssignment: workerAssignment[i], submitted: false, completed: false, rejected: false }
            workerAssignments.push(objArray)
          }
        }
      }
    } else {
      workerAssignments  = await WorkerAssignment.find({ employerId: req.user.id }).sort({ createdAt: -1 }).populate("targetWorkers", "_id")
    }

    return res.status(200).json({
      success: true,
      workerAssignments
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}

// [Employer: CompletedAssignments] - Get Completed Assignments by employerId:
export const CompletedAssignments = async (req: Request, res: Response) => {
  const validatedData = CompletedAssignmentSchema.safeParse({ employerId: req.user.id })

  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      result: validatedData.error.message
    })
  }

  const employerId = validatedData.data.employerId

  try {
    const CompletedJobs = await JobsCompleted
                                  .find({ employerId, submitted: true, status: "COMPLETED" })
                                  .sort({ createdAt: -1 }).populate("targetWorkers", "_id name")

    return res.status(200).json({
      success: true,
      CompletedJobs
    })
  } catch (error) {
    mainError(error, res)
  }
}

// [Worker: SubmittedFiles] - Get Worker Assignments by ID:
export const SubmittedFiles = async (req: Request, res: Response) => {
  const validatedData = SubmittedFilesSchema.safeParse({ ...req.params, workerId: req.user.id })

  if (!validatedData.success) {
    console.error(validatedData.error.issues[0].message)

    return res.status(400).json({
      success: false,
      message: validatedData.error.issues[0].message
    })
  }

  const { _id, workerId } = validatedData.data

  try {
    const files = await JobsCompleted.find({ workerAssignment: _id, workerId })

    return res.status(200).json({
      success: true,
      files
    })
  } catch (error) {
    mainError(error, res)
  }
}

// [Employer: SubmittedJobs] - Get the submitted jobs of the workers:
export const SubmittedJobs = async (req: Request, res: Response) => {
  const validatedData = SubmittedJobsSchema.safeParse({ employerId: req.user.id })

  if (!validatedData.success) {
    return res.status(400).json({
      success: false
    })
  }

  const { employerId } = validatedData.data;
  let SubmittedJobs = []

  try {

    // Source - https://stackoverflow.com/a/12822773
    // Posted by JohnnyHK
    // Retrieved 2026-08-12, License - CC BY-SA 3.0
    const jobsSubmitted = await JobsCompleted.find({ employerId, submitted: true })
      .populate('workerId')
      .populate('employerId')
      .populate('workerAssignment')

    // A for loop:
    for (let index = 0; index < jobsSubmitted.length; index++) {
      if (!index) {
        SubmittedJobs.push(jobsSubmitted[index])
      } 
      
      else {
        // Here are the variables for ensuring that we compare ids:
        const current = `${jobsSubmitted[index].workerId}_${jobsSubmitted[index].workerAssignment}`
        const previous = `${jobsSubmitted[index - 1].workerId}_${jobsSubmitted[index - 1].workerAssignment}`

        // If the current is not equal to the previous:
        if (current !== previous) {

          // Push this to the array:
          SubmittedJobs.push(jobsSubmitted[index])
        }
      }
    }

    return res.status(200).json({
      success: true,
      SubmittedJobs
    })
  } catch (error) {
    mainError(error, res)
  }
}

// [Employer] - SubmittedJobsById - Get the submitted jobs by workerId and employerId:
export const SubmittedJobsById = async (req: Request, res: Response) => {
  const validatedData = SubmittedJobsIDSchema.safeParse({ ...req.params, employerId: req.user.id })

  if (!validatedData.data) {
    return res.status(400).json({
      success: false,
      info: validatedData.error.issues[0].message
    })
  }

  const { workerId, workerAssignment, employerId } = validatedData.data;

  try {
    const SubmittedJobs = await JobsCompleted.find({ workerId, employerId, workerAssignment })
      .populate("workerId")
      .populate("employerId")
      .populate("workerAssignment")

    const WorkerAssignmentInfo = await WorkerAssignment.findOne({ _id: workerAssignment })

    if (!WorkerAssignmentInfo) {
      return res.status(404).json({
        success: false,
        info: "Worker Assignment not found"
      })
    }

    const WorkerInfo = await Worker.findOne({ _id: workerId })

    if (!WorkerInfo) {
      return res.status(404).json({
        success: false,
        info: "Worker not found"
      })
    }

    return res.status(200).json({
      success: true,
      SubmittedJobs,
      WorkerAssignmentInfo,
      WorkerInfo
    })
  } catch (error) {
    mainError(error, res)
  }
}

// [Worker] - NewWorkerJob - Create New Worker Job:
export const NewWorkerJob = async (req: Request, res: Response) => {
  const validatedData = NewWorkerJobSchema.safeParse(req.body);

  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      message: validatedData.error.issues[0].message
    })
  }

  const { jobCompleted, name } = validatedData.data;

  try {
    const JobCompleted = await JobsCompleted.findOne({ _id: jobCompleted })

    if (!JobCompleted) {
      return res.status(404).json({
        success: false,
        message: "Job Completed not found!"
      })
    }

    // // Source - https://stackoverflow.com/a/33049923
    // Posted by Adrian Schneider, modified by community. See post 'Timeline' for change history
    // Retrieved 2026-08-10, License - CC BY-SA 4.0
    JobCompleted.workerUpload.push({ name })
    JobCompleted.save()

    return res.status(201).json({
      success: true
    })
  } catch (error) {
    instanceErrors(error, res)
  }
}

// [Worker] - DeleteWorkerJob - Delete Worker Job:
export const DeleteWorkerJob = async (req: Request, res: Response) => {
  const validatedData = DeleteJobSchema.safeParse(req.params)

  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      info: validatedData.error.issues[0].message
    })
  }

  const { name, _id } = validatedData.data;

  try {

    // Main Source: https://www.geeksforgeeks.org/node-js/how-to-pull-item-from-an-array-in-mongoose/
    // Source used but wasn't truly executed: https://stackoverflow.com/questions/14763721/mongoose-delete-array-element-in-document-and-save
    const JobCompleted = await JobsCompleted.findOneAndUpdate(
      { _id },
      { $pull: { workerUpload: { name } }}
    )

    if (!JobCompleted) {
      console.error("Job not found")

      return res.status(404).json({
        success: false,
        info: "Job not found"
      })
    }

    console.log("Worker Uploads:", JobCompleted.workerUpload)

    const JobCompletedAvailable = JobCompleted.workerUpload.filter((wUpload) => 
      wUpload.name === name
    )

    console.log(JobCompletedAvailable.length)

    if (!JobCompletedAvailable.length) {
      return res.status(400).json({
        success: false,
        information: "Job doesn't exist"
      })
    }



    // Source used: https://medium.com/@priyaeswaran/automatic-image-deletion-in-node-js-multer-fs-f1835d272b92
    const imagePath = path.join(__dirname, "../../uploads/workerJobsCompleted", name);

    fs.unlink(imagePath, (err) => {
      if (err) {
        return res.status(400).json({ success: false, info: "Failed to delete image", err })
      }
        
      return res.status(200).json({
        success: true, info: "Successfully deleted image"
      })
    })
  } catch (error) {
    mainError(error, res)
  }
}

// [Employer] - NewWorkerAssignment - Employer creates new worker assignment:
export const NewWorkerAssignment = async (req: Request, res: Response) => {
  const io = getIO()

  const validatedData = NewWorkerAssignmentSchema.safeParse({
    ...req.body, employerId: req.user.id
  });

  if (!validatedData.success) {
    const errors = validatedData.error.issues

    console.log(errors)

    return res.status(400).json({
      success: false,
      message: errors[0].message
    })
  }

  const { employerId, targetWorkers, title, description, submitBefore, rejectLate } = validatedData.data;

  try {
    if (!targetWorkers.length) {
      return res.status(400).json({
        success: false,
        message: "Please assign at least one worker"
      })
    }

    const sanitizedTitle = filterXSS(title, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: true })
    const sanitizedDescription = filterXSS(description, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: true })
    const sanitizedSubmitBefore = filterXSS(submitBefore, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: true })

    const newWorkerAssignment = new WorkerAssignment({
      employerId,
      targetWorkers,
      title: sanitizedTitle,
      description: sanitizedDescription,
      submitBefore: sanitizedSubmitBefore,
      rejectLate
    })

    const employer = await Employer.findOne({ _id: employerId })

    if (!employer) return res.status(404).json({ success: false })

    if (new Date(submitBefore) <= new Date()) {
      return res.status(400).json({
        success: false,
        info: "Invalid date."
      })
    }

    for (let index = 0; index < targetWorkers.length; index++) {
      const notification = await UserNotification.create(
        WorkerAssignmentPayload(employer.email, new Date(), targetWorkers[index]._id)
      )

      io.to(targetWorkers[index]._id.toString()).emit(
        "notification:worker:new",
        notification
      )
    }

    await newWorkerAssignment.save();

    return res.status(201).json({
      success: true,
      message: "Worker Assignment Successfully Added!"
    })

  } catch (error) {
    instanceErrors(
      error,
      res
    )
  }
}


// Mark All As Read:
export const MarkAllAsRead = async (req: Request, res: Response) => {
  const validatedWorkerEmployer = WorkerIDJob.safeParse({ worker: req.user.id })

  if (!validatedWorkerEmployer.success) {
    const errors = validatedWorkerEmployer.error.issues;

    return res.status(400).json({
      success: false,
      message: errors[0].message
    })
  }

  const { worker } = validatedWorkerEmployer.data;

  try {
    await UserNotification.updateMany({ targetUsers: worker, read: false }, {
      read: true
    })

    return res.status(200).json({
      success: true,
      message: "All Notifications Mark as Read!"
    })
  } catch (error) {
    mainError(error, res)
  }
}



// Mark as Read:
export const DeleteNotification = async (req: Request, res: Response) => {
  const validatedData = NotificationIDSchema.safeParse({ _id: req.params._id })

  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      message: validatedData.error.issues[0].message
    })
  }

  const { _id } = validatedData.data;

  try {
    const notification = await UserNotification.findOneAndDelete({ _id })

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      })
    }

    return res.status(200).json({
      success: true,
      message: "Deleted"
    })
  } catch (error) {
    mainError(error, res)
  }
}


// Reports:
export const GetReports = async (req: Request, res: Response) => {
  try {
    const reports = await Report.find({ sentBy: req.user.id }).sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      reports
    })
  } catch (error) {
    mainError(error, res)
  }
};


// [Worker & Employer]: GetReportDetails - View report details:
export const GetReportDetails = async (req: Request, res: Response) => {
  const validatedData = GetReportDetailsSchema.safeParse(req.params)

  if (validatedData.error) {
    console.log(JSON.parse(validatedData.error.message))

    return res.status(400).json({
      success: false,
      errData: JSON.parse(validatedData.error.message)
    })
  }

  const { _id } = validatedData.data;

  try {
    const report = await Report.findOne({ _id })
    if (!report) return res.status(404).json({ success: false, info: "Report not found" })

    return res.status(200).json({
      success: true,
      report
    })
  } catch (error) {
    mainError(error, res)
  }
}



// Update Report Status:
export const UpdateReport = async (req: Request, res: Response) => {
  const io = getIO()

  const validatedStatus = UpdateReportSchema.safeParse(req.body)

  if (!validatedStatus.success) return res.status(400).json({ success: false, message: validatedStatus.error.issues[0].message })
  const { reportId, reportType, description } = validatedStatus.data

  try {
    const ReportInfo = await Report.findOne({ _id: reportId })

    if (!ReportInfo) return res.status(404).json({ success: false, info: "Report not found" })

    if (reportType === "") {
      await Report.findOneAndUpdate({ _id: reportId }, { reportType: ReportInfo.reportType })
    } else {
      await Report.findOneAndUpdate({ _id: reportId }, { reportType })
    }

    if (description === "") {
      await Report.findOneAndUpdate({ _id: reportId }, { description: ReportInfo.description })
    } else {
      await Report.findOneAndUpdate({ _id: reportId }, { description})
    }

    return res.status(200).json({
      success: true,
      info: "Report updated"
    })
  } catch (error) {
    mainError(error, res)
  }
}

// Submit Evidence Status Update:
export const SubmitEvidenceUpdateController = async (req: Request, res: Response) => {
  const validatedData = SubmitEvidenceUpdate.safeParse(req.body)

  if (!validatedData.data) {
    console.error(validatedData.error)
    return res.status(400).json({
      success: false,
      info: validatedData.error
    })
  }

  const { reportId, submitEvidence } = validatedData.data;
  let info;
  let ArraySubmit;

  try {
    if (submitEvidence) {

      const ReportInform = await Report.findOne({ _id: reportId })
      if (!ReportInform) return res.status(404).json({ success: false, info: "Report Not Found" })

      ArraySubmit = ReportInform.submitEvidence

      if (submitEvidence.length) {
        for (let SubmitIndex = 0; SubmitIndex < submitEvidence.length; SubmitIndex++) {
          ArraySubmit.push({
            fileName: submitEvidence[SubmitIndex].fileName,
            fileType: submitEvidence[SubmitIndex].fileType
          })
        }
      }

      await Report.findOneAndUpdate({ _id: reportId }, { submitEvidence: ArraySubmit })
      info = "Successfully updated evidence information"
    } else {
      info = "No files were added."
    }

    return res.status(200).json({
      success: true,
      info,
      ArraySubmit
    })
  } catch (error) {
    mainError(error, res)
  }
}

// Submit Evidence Add to the controller:



// [Worker & Employer] - Create new report:
export const NewReport = async (req: Request, res: Response) => {

  const io = getIO();

  if (req.user.role === "worker") {
    req.body.workerId = req.user.id
  } else {
    req.body.employerId = req.user.id
  }

  req.body.sentBy = req.user.id
  req.body.reporter = req.user.role

  try {
    const validatedReport = reportValidator.safeParse(req.body);

    if (!validatedReport.success) {
      console.log(validatedReport.error)
      return res.status(400).json({
        message: "Invalid report data",
        errors: validatedReport.error.flatten(),
      });
    }


    const { workerId, employerId, reportType, description, sentBy, submitEvidence, reporter, reportCategory } = validatedReport.data;

    const sanitizedReportType = filterXSS(reportType, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: true })
    const sanitizedDescription = filterXSS(description, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: true })

    const newReport = new Report({
      workerId,
      employerId,
      reportType: sanitizedReportType,
      description: sanitizedDescription,
      sentBy,
      submitEvidence,
      reporter,
      reportCategory
    });

    await newReport.save()

    const worker = await Worker.findOne({ _id: workerId })
    if (!worker) return res.status(404).json({ success: false, message: "Worker not found" })

    const employer = await Employer.findOne({ _id: employerId })
    if (!employer) return res.status(404).json({ success: false, message: "Worker not found" })


    if (reporter === "worker") {
      const notification = NewReportPayload(worker.email, employer.email, reportType, reportCategory, new Date())
      const Administrator = new AdminNotification(notification)

      await Administrator.save()

      io.emit(
        "notification:new",
        notification
      );
    } else {
      const notification = NewReportPayload(employer.email, worker.email, reportType, reportCategory, new Date())
      const Administrator = new AdminNotification(notification)

      await Administrator.save()

      io.emit(
        "notification:new",
        notification
      );
    }


    return res.status(201).json({
      message: "Report submitted successfully",
      report: newReport,
    });

  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      message: error.message
    });
  }
};

// [Worker & Employer] - Upload the report evidence:
export const ReportEvidence = async (req: Request, res: Response) => {
  console.log("Executing Report Evidence Controller")

  reportUpload(req, res, (err) => {
    if (err) {
      console.log(err)
      return res.status(400).json({
        success: false,
        errors: err
      })
    }

    console.log(req.files)
    return res.status(201).json({
      success: true,
      filename: req.files
    })
  })
}


// Delete Reports:
export const DeleteReport = async (req: Request, res: Response) => {
  const validatedData = DeleteReportSchema.safeParse(req.params);

  if (!validatedData.data) {
    return res.status(400).json({
      success: false,
      message: "Failed to delete the report."
    })
  }

  const { _id } = validatedData.data;
  let errReport = false;

  try {
    const _Report = await Report.findOne({ _id })
    if (!_Report) return res.status(404).json({ success: false, info: "Report Not Found" })

    for (let i = 0; i < _Report.submitEvidence.length; i++) {
    //   // Source used: https://medium.com/@priyaeswaran/automatic-image-deletion-in-node-js-multer-fs-f1835d272b92:
    // const imagePath = path.join(__dirname, "../../uploads/reports", fileName)

    // fs.unlink(imagePath, async (err) => {
      const imagePath = path.join(__dirname, "../../uploads/reports", _Report.submitEvidence[i].fileName)

      fs.unlink(imagePath, (err) => {
        if (err) errReport = true
      })
    }

    if (!errReport) {
      await Report.findOneAndDelete({ _id })

      return res.status(200).json({
        success: true,
        info: "Successfully Deleted Report"
      })
    } else {
      return res.status(400).json({
        success: false,
        info: "Not all files were successfully"
      })
    }
  } catch (error) {
    console.error(error)
    
    mainError(error, res)
  }
}

export const DeleteReports = async (req: Request, res: Response) => {
  console.log("Executing Delete Reports Controller")
  const validatedData = DeleteReportsSchema.safeParse({ sentBy: req.user.id })

  if (!validatedData.data) {
    console.error("Failed to validate the user ID")
    return res.status(400).json({
      success: false,
      info: "Failed to validate the user ID"
    })
  }

  const { sentBy } = validatedData.data;
  let errReport = false;

  try {
    const _Report = await Report.find({ sentBy })

    for (let i = 0; i < _Report.length; i++) {
      const submitEvidence = _Report[i].submitEvidence;

      for (let submitIndex = 0; submitIndex < submitEvidence.length; submitIndex++) {
        const imagePath = path.join(__dirname, "../../uploads/reports", submitEvidence[submitIndex].fileName)

        fs.unlink(imagePath, (err) => {
          if (err) { 
            errReport = true
          } else {
            console.log(submitEvidence[submitIndex].fileName, " being deleted")
          }

        })
      }
    }

    if (!errReport) {
      // Source: https://www.mongodb.com/docs/manual/reference/method/db.collection.deletemany/
      await Report.deleteMany({ sentBy })

      console.log("Reports Deleted!")

      return res.status(200).json({
        success: true,
        info: "Reports deleted successfully!"
      })
    } else {
      console.log("Not all reports are deleted")

      return res.status(400).json({
        success: false,
        info: "Failed to delete some evidences from the reports."
      })
    }
  } catch (error) {
    console.error(error)

    mainError(error, res)
  }
}

export const DeleteReportX = async (req: Request, res: Response) => {
  console.log("Executing DeleteReport X Controller")

  const validatedData = DeleteReportXSchema.safeParse(req.params)

  if (!validatedData.data) {
    return res.status(400).json({
      success: false,
      info: validatedData.error
    })
  }

  const { reportId, fileName, fileID } = validatedData.data;

  try {
    const ReportInfo = await Report.findOne({ _id: reportId })
    if (!ReportInfo) return res.status(404).json({ success: false, info: "Report Not Found" })

    // Source used: https://medium.com/@priyaeswaran/automatic-image-deletion-in-node-js-multer-fs-f1835d272b92:
    const imagePath = path.join(__dirname, "../../uploads/reports", fileName)

    fs.unlink(imagePath, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, info: "Failed to delete evidence" })
      } else {
        // Source Lost, possible source that can be considered source: https://stackoverflow.com/questions/4588303/in-mongodb-how-do-you-remove-an-array-element-by-its-index
        await Report.updateOne({ _id: reportId }, {
          $pull: {
            submitEvidence: {
              _id: fileID
            }
          }
        })

        const ReportInfoFinal = await Report.findOne({ _id: reportId })
        if (!ReportInfoFinal) return res.status(404).json({ success: false, info: "Report Not Found" })

        console.log(ReportInfoFinal.submitEvidence)

        return res.status(200).json({
          success: true,
          info: "Successfully deleted the image",
          submitEvidence: ReportInfoFinal.submitEvidence
        })
      }
      
    })
  } catch (error) {
    mainError(error, res)
  }
  
  // Source used: https://medium.com/@priyaeswaran/automatic-image-deletion-in-node-js-multer-fs-f1835d272b92
  // for (let i = 0; i < jobCompleted.workerUpload.length; i++) {
  //   const imagePath = path.join(__dirname, "../../uploads/workerJobsCompleted", jobCompleted.workerUpload[i].name);

  //   fs.unlink(imagePath, (err) => {
  //     if (err) return res.status(400).json({ success: false, info: "Failed to delete image" })
  //   })
  // }
}

// Create New Application:
export const newApplication = async (req: Request, res: Response) => {
    
  const io = getIO();

  req.body.worker = req.user.id;

  const validatedData = ApplicationSchema.safeParse(req.body);

  if (!validatedData.success) {
    const errors = validatedData.error.issues;
    return res.status(400).json({
      success: false,
      message: errors[0].message,
      info: errors[0].message
    });
  }

  const { job, worker, location } = validatedData.data;

  try {
    const jobData = await Job.findById(job);

    if (!jobData) {
      return res.status(400).json({
        success: false,
        message: "Job does not exist",
        info: "Job does not exist"
      });
    }

    if (new Date(jobData.applyBefore) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "This job is already expired. Please try another job.",
        info: "This job is already expired. Please try another job.",
      });
    }

    if (jobData.status !== "ACCEPTED") {
      return res.status(400).json({
        success: false,
        message: "Job is not available",
        info: "Job is not available",
      });
    }

    if (jobData.positions < 1) {
      return res.status(400).json({
        success: false,
        message: "Job not available",
        info: "Job not available",
      });
    }

    const Applied = await Application.findOne({ job, worker });

    if (Applied) {
      return res.status(400).json({
        success: false,
        message: "Application already exists",
        info: "You have already applied for this job"
      });
    }

    const newApplication = new Application({ job, worker, location, company: jobData.company });
    await newApplication.save();

    // Create response
    const newResponse = await ResponseModel.create({
      job: jobData._id,
      application: newApplication._id,
      jobCreated: jobData.createdAt
    });

    const notification = await AdminNotification.create(
      NewApplicationPayload(jobData.title, new Date())
    );

    io.emit(
      "notification:new",
      notification
    );

    const workerInformation = await Worker.findOne({ _id: worker })

    if (!workerInformation) {
      return res.status(404).json({
        success: false,
        message: "Worker not found"
      })
    }

    const EmployerNotification = await UserNotification.create(
      NewApplicationPayloadEmployer(workerInformation.name, String(jobData.posted), new Date())
    )

    io.to(jobData.posted.toString()).emit(
      "notification:employer:new",
      EmployerNotification
    );

    return res.status(200).json({
      success: true,
      application: newApplication,
      info: "Job successfully has been applied!"
    });
  } catch (error: unknown) {
    instanceErrors(error, res);
  }
};



// Shared by createJob and UpdateJob: date checks, XSS sanitizing, and category matching.
// Edits pass the job's current dates so an unchanged date that has since passed is allowed.
// Changes the payload in place; returns an error message, or null when it is ready to save.
const prepareJobPayload = async (
  payload: ReturnType<typeof JobSchema.parse>,
  previous?: { startDate?: string; applyBefore?: string }
): Promise<string | null> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(payload.startDate as string);
  startDate.setHours(0, 0, 0, 0);

  const applyBefore = new Date(payload.applyBefore as string);
  applyBefore.setHours(0, 0, 0, 0);

  if (startDate < today && payload.startDate !== previous?.startDate) return "Start date cannot be in the past"
  if (applyBefore < today && payload.applyBefore !== previous?.applyBefore) return "Apply before date cannot be in the past"

  // Sanitize XSS: Link - https://medium.com/@ferrosful/nodejs-security-unleashed-exploring-xss-attack-8d3a61a01a09
  const clean = (text: string) => filterXSS(text, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: true })
  payload.title = clean(payload.title)
  payload.description = clean(payload.description)
  payload.schedule = clean(payload.schedule)
  payload.salary = clean(payload.salary)
  payload.location = clean(payload.location)
  payload.category = clean(String(payload.category))
  payload.categoryTitle = clean(String(payload.categoryTitle))
  payload.tags = payload.tags.map(clean)
  payload.requirements = payload.requirements.map(clean)
  payload.benefits = payload.benefits.map(clean)

  if (!payload.tags.length) return "Add at least one skill"

  const { categoryTitle } = payload

  if (categoryTitle?.trim()) {
    const normalizedCategory = normalize(categoryTitle);

    const industries = await Industry.find({});

    let bestMatch = null;
    let bestScore = 0;

    for (const i of industries) {
      const score = jaro.similarity(
        normalizedCategory,
        normalize(i.title)
      );

      if (score > bestScore) {
        bestScore = score;
        bestMatch = i;
      }
    }

    const THRESHOLD = 0.95;

    if (bestMatch && bestScore >= THRESHOLD) {
      payload.category = bestMatch.title;
    } else {
      const createdCategory = new Industry({
        title: categoryTitle,
      });

      await createdCategory.save();

      payload.category = createdCategory.title;
    }
  }

  return null
}



// Create new Job:
export const createJob = async (req: Request, res: Response) => {

  console.log(req.body.category, req.body.categoryTitle)
    
  const io = getIO();

  req.body.posted 
    = req.user.id

  const validatedUser = employerIdSchema.safeParse({ id: req.body.posted, role: req.user.role })
  if (validatedUser.error) { const error = validatedUser.error.issues; return res.status(400).json({ success: false, message: error[0].message }) }

  const { id, role } = validatedUser.data

  const details = await Employer.findOne({ _id: id, role })
  if (!details) return res.status(404).json({ success: false, message: "Employer not found" })

  req.body.email = details.email
  req.body.phone = details.phone
  req.body.company = req.user.company

  const validatedJobData = JobSchema.safeParse(req.body)
  if (validatedJobData.error) { const error = validatedJobData.error.issues; return res.status(400).json({ success: false, message: error[0].message }) }

  const payload = validatedJobData.data

  try {
    const problem = await prepareJobPayload(payload)
    if (problem) return res.status(400).json({ success: false, message: problem })

    const newJob = new Job(payload)
    await newJob.save()

    // AI screens the post and publishes it; the admin is only notified if it gets flagged.
    runInBackground("job moderation", () => autoModerateJob(newJob._id.toString()))

    return res.status(201).json({
      success: true,
      message: "Job Successfully Created! It will be published after a quick automated check."
    })
  } catch (error: unknown) {
    console.error(error)

    if (error instanceof Error) return res.status(400).json({ success: false, message: error.message })
    return res.status(500).json({ success: false, message: "Internal Server Error" })
  }
}





// Get Industries:
export const GetIndustries = async (req: Request, res: Response) => {
  try {
    const industries = await Industry.find({ notAccepted: { $ne: true } }).sort({ createdAt: -1 });

    if (!industries.length) {
      return res.status(200).json({
        success: true,
        message: "No industries found",
        Industries: [],
      });
    }

    return res.status(200).json({
      success: true,
      Industries: industries,
    });
  } catch (error) {
    mainError(error, res)
  }
};


// Edit a Job (employer fixing a typo, changing the pay, etc.):
// Edits are published right away without the AI check, so a rate-limited or unavailable
// AI can't leave an edited post stuck. Posts an admin declined still go back to the admin.
export const UpdateJob = async (req: Request, res: Response) => {
  const validatedUser = employerIdSchema.safeParse({ id: req.user.id, role: req.user.role })
  if (validatedUser.error) { const error = validatedUser.error.issues; return res.status(400).json({ success: false, message: error[0].message }) }

  const validatedJobId = JobIDJob.safeParse({ job: req.params._id })
  if (validatedJobId.error) { const error = validatedJobId.error.issues; return res.status(400).json({ success: false, message: error[0].message }) }

  const { id, role } = validatedUser.data
  const { job: jobId } = validatedJobId.data

  try {
    const details = await Employer.findOne({ _id: id, role })
    if (!details) return res.status(404).json({ success: false, message: "Employer not found" })

    // Only the employer who posted it can edit it, and deleted posts stay deleted.
    const job = await Job.findOne({ _id: jobId, posted: id })
    if (!job || job.status === "DELETED") return res.status(404).json({ success: false, message: "Job not found" })

    // The same fields createJob fills in on the server, so the client can't change them:
    const validatedJobData = JobSchema.safeParse({
      ...req.body,
      posted: id,
      email: details.email,
      phone: details.phone,
      company: req.user.company,
    })
    if (validatedJobData.error) { const error = validatedJobData.error.issues; return res.status(400).json({ success: false, message: error[0].message }) }

    const payload = validatedJobData.data
    const problem = await prepareJobPayload(payload, { startDate: job.startDate, applyBefore: job.applyBefore })
    if (problem) return res.status(400).json({ success: false, message: problem })

    // A cleared start date goes back to the model default instead of being removed.
    const wasDeclined = job.status === "DECLINED"
    job.set({ ...payload, startDate: payload.startDate || "Immediate", status: wasDeclined ? "PENDING" : "ACCEPTED", verification: null })
    await job.save()

    return res.status(200).json({
      success: true,
      message: wasDeclined
        ? "Job updated! An administrator will review it again."
        : "Job updated! Your changes are now live."
    })
  } catch (error: unknown) {
    console.error(error)

    if (error instanceof Error) return res.status(400).json({ success: false, message: error.message })
    return res.status(500).json({ success: false, message: "Internal Server Error" })
  }
}



// View Jobs:
export const viewJobs = async (req: Request, res: Response) => {
  const validatedWorker = WorkerIDJob.safeParse({ worker: req.user.id })
  const validatedStatus = OnlyAccepted.safeParse({ status: "ACCEPTED" })

  if (!validatedWorker.success) { const errors = validatedWorker.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}
  if (!validatedStatus.success) { const errors = validatedStatus.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}

  const { worker } = validatedWorker.data
  const { status } = validatedStatus.data

  try {
    const jobs = await Job.find({ status }).populate("posted").populate("location").sort({ createdAt: -1 })
    if (jobs.length < 1) return res.status(200).json({ success: true, jobs, message: "No jobs available" })

    for (const job of jobs) {
      const validatedJob = JobIDJob.safeParse({ job: String(job._id) })
      if (!validatedJob.success) { const errors = validatedJob.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}
    }

    // One query for all of this worker's applications instead of one or two per job:
    const applications = await Application.find({ worker, job: { $in: jobs.map((job) => job._id) } }).select("job status")
    const applied = new Set(applications.map((app) => String(app.job)))
    const accepted = new Set(applications.filter((app) => app.status === "Accepted").map((app) => String(app.job)))

    // Skill match per job (AI-assisted when GEMINI_API_KEY is set); the skill category counts as a skill:
    const profile = await Worker.findById(worker).select("skills skill")
    const { ai, matches } = await matchJobsForWorker(
      [...(profile?.skills || []), ...(profile?.skill ? [profile.skill] : [])],
      jobs.map((job) => ({ id: String(job._id), skills: job.tags || [] }))
    )

    const jobArray = jobs.map((job) => ({
      info: job,
      IsApplied: applied.has(String(job._id)),
      Accepted: accepted.has(String(job._id)),
      match: matches.get(String(job._id)),
    }))

    return res.status(200).json({
      success: true,
      jobs: jobArray,
      matching: { ai, recommendedScore: RECOMMENDED_SCORE }
    })
  } catch (error) {
    
    mainError(
      error, res
    )
  }
}



// Display Locations:
export const Locations = async (req: Request, res: Response) => {
  try {
    const Locations = await Location.find().sort({ createdAt: -1 })
    if (!Locations.length) return res.status(200).json({ success: true, Locations, message: "No locations"})

    return res.status(200).json({
      success: true,
      Locations
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}



// View Contacts:
export const ViewContacts = async (req: Request, res: Response) => {
  const validatedData = WorkerIDJob.safeParse({ worker: req.user.id })

  if (!validatedData.success) {
    const errors = validatedData.error.issues;
    return res.status(400).json({ success: false, message: errors[0].message })
  }

  const { worker } = validatedData.data;

  try {
    const contacts = await Contact.find({ worker })
      .sort({ createdAt: -1 })
      .populate({
        path: "employerId",
        populate: {
          path: "industry",
          select: "title",
        },
      });

    return res.status(200).json({
      success: true,
      contacts
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}




// View Contacts:
export const ViewContactsEmployer = async (req: Request, res: Response) => {
  const validatedData = employerIdSchema.safeParse({ id: req.user.id, role: req.user.role })

  if (!validatedData.success) {
    const errors = validatedData.error.issues;
    return res.status(400).json({ success: false, message: errors[0].message })
  }

  const { id } = validatedData.data;

  try {
    const contacts = await Contact.find({ employerId: id })
      .populate("worker")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      contacts
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}



// View Messages: // contact, worker, role, content
export const ViewMessage = async (req: Request, res: Response) => {
  const validatedData = ViewMessageByContactID.safeParse({ contact: req.params._id })

  if (!validatedData.success) {
    const errors = validatedData.error.issues;
    return res.status(400).json({
      success: false,
      message: errors[0].message
    })
  }

  const { contact } = validatedData.data;

  try {
    const ViewMessages = await Message.find({ contactId: contact }).sort({ createdAt: 1 })

    return res.status(200).json({
      success: true,
      ViewMessages
    })
  } catch (error) {
    mainError(error, res)
  }
}



// New Message:
export const NewMessage = async (req: Request, res: Response) => {
    
  const io = getIO();

  const validatedData = PostMessage.safeParse({
    contactId: req.params.contact,
    senderId: req.user.id,
    recipientId: req.body.recipient,
    senderRole: req.user.role,
    content: req.body.content
  });

  if (!validatedData.success) {
    const errors = validatedData.error.issues;

    return res.status(400).json({
      success: false,
      message: errors[0].message
    });
  }

  const { contactId, senderId, recipientId, senderRole, content } = validatedData.data;

  try {
    const sanitizedContent = filterXSS(content, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: true });

    const newMessage = new Message({ contactId, senderId, recipientId, senderRole, content: sanitizedContent });
    await newMessage.save();

    let senderLabel = "";
    let role = "";
    
    
    await Contact.findByIdAndUpdate(
      contactId,
      {
        $set: {
          lastMessage: sanitizedContent,
          lastMessageAt: new Date(),
        },
        $inc:
          senderRole === "worker"
            ? { unreadCountEmployer: 1 }
            : { unreadCountWorker: 1 },
      }
    );

    if (senderRole === "worker") {
      const worker = await Worker.findById(senderId).select("name");
      senderLabel = worker?.name || "Unknown Worker";
      role = "employer"
    }

    if (senderRole === "employer") {
      const employer = await Employer.findById(senderId).select("email");
      senderLabel = employer?.email || "Unknown Employer";
      role = "worker"
    }
    
    const notification = await UserNotification.create(
      NewMessagePayload(
        senderLabel,
        recipientId,
        new Date()
      )
    );

    io.to(recipientId.toString()).emit(
      `notification:${role}:new`,
      notification
    );
    
    return res.status(201).json({
      success: true,
      message: "Successfully sent message"
    })
  } catch (error) {
    instanceErrors(
      error,
      res
    )
  }
}


// Mark Contant As Read:
export const MarkContactAsRead = async (
  req: Request,
  res: Response
) => {
  const { contactId } = req.params;
  const { role } = req.user;

  try {
    const update =
      role === "worker"
        ? { unreadCountWorker: 0 }
        : { unreadCountEmployer: 0 };

    const contact = await Contact.findByIdAndUpdate(
      contactId,
      { $set: update },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Unread count reset successfully",
      contact,
    });
  } catch (error) {
    instanceErrors(error, res);
  }
};



// Post a Contact:
export const PostContact = async (req: Request, res: Response) => {
    
  const io = getIO();

  const validatedData = PostContacts.safeParse({
    ...req.body,
    employer: req.user.id
  })

  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      message: validatedData.error.issues[0].message
    })
  }

  const { employer, title, description, worker } = validatedData.data

  try {
    const Title = filterXSS(title, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: true
    })

    const Description = filterXSS(description, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: true
    })

    const newContact = new Contact({
      employerId: employer,
      worker,

      title: Title,
      description: Description,

      // keep existing fields updated
      lastMessage: Description,
      lastMessageAt: new Date(),
      unreadCountWorker: 1,
      unreadCountEmployer: 0,
      status: "active"
    })

    await newContact.save()

    const EmployerEmail = await Employer.findOne({ _id: employer })

    if (!EmployerEmail) {
      return res.status(400).json({
        success: false,
        Message: "Employer Not Found"
      })
    }

    const notificationPayload = PostContactPayload(
      EmployerEmail.email, // or whatever display name you use
      worker,
      new Date()
    )

    const notifications = new UserNotification(
      notificationPayload
    );

    await notifications.save();

    console.log(
      "Worker room:",
      worker.toString()
    );

    console.log(
      "Emitting to room:",
      worker.toString()
    );

    io.to(worker.toString()).emit(
      "notification:worker:new",
      notifications
    );

    return res.status(201).json({
      success: true,
      message: "Contact successfully added!"
    })

  } catch (error) {
    instanceErrors(error, res)
  }
}



// Open Positions:
export const OpenPositionsTotalApplications = async (req: Request, res: Response) => {
  const validatedData = EmployerProfileS.safeParse({ _id: req.user.id })
  const validatedComp = CompanySchemaID.safeParse({ _id: req.user.company }) // ??
  if (!validatedData.success) { const errors = validatedData.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}

  const { _id } = validatedData.data
  try {
    const OpenPositions = await Job.find({ posted: _id }).sort({ createdAt: -1 })
    const jobs = await Job.find({ company: _id }).sort({ createdAt: -1})
    const TotalApplications = await Application.find({ _id }).sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      OpenPositions,
      TotalApplications
    })
  } catch (error) {
    instanceErrors(
      error,
      res
    )
  }
}



// Is Applied Controller:
export const IsApplied = async (req: Request, res: Response) => {
  const validatedAppliedStatus = IsAppliedS.safeParse({ worker: req.user.id, job: req.params.job })
  if (!validatedAppliedStatus.success) { const errors = validatedAppliedStatus.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}

  const { worker, job } = validatedAppliedStatus.data

  try {
    const application = await Application.findOne({ worker, job })
    if (!application) return res.status(400).json({ success: false, isApplied: false })

    return res.status(200).json({
      success: true,
      isApplied: true
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}


// View Profile:
export const ViewProfileController = async (req: Request, res: Response) => {
  const validatedWorker = WorkerID.safeParse({ _id: req.user.id })
  const validatedStatus = TimeLineStatus.safeParse({ status: "Interview Scheduled", timeline: "Interview" })

  if (!validatedWorker.success) { const errors = validatedWorker.error.issues; return res.status(400).json({ success: false, message: errors[0].message })}
  if (!validatedStatus.success) { const errors = validatedStatus.error.issues; return res.status(400).json({ success: false, message: errors[0].message })}

  const { _id } = validatedWorker.data
  const { status, timeline } = validatedStatus.data

  try {
    const WorkerProf = await Worker.findOne({ _id }).select("-password").lean();
    const locations = await Location.find().sort({ createdAt: -1 })
    if (!WorkerProf) {
      return res.status(404).json({ success: false, message: "Worker doesn't exist"})
    }

    const validatedS = SkillID.safeParse({ skill: WorkerProf.skill })
    if (!validatedS.success) { const errors = validatedS.error.issues; return res.status(400).json({ success: false, message: errors[0].message })}

    const applications = await Application.find({ worker: _id }).sort({ createdAt: -1 })
    const skills = await Skill.find().sort({ createdAt: -1 })
    const interviews = await Application.find({ worker: _id, status: { $ne: status }, timeline: { $ne: timeline }, interviewDate: { $ne: "" } })

    const policyAt = inactivityPolicyEffectiveAt(WorkerProf);
    const stage = WorkerProf.inactivityWarningStage ?? 0;
    const milestone = nextInactivityMilestone(WorkerProf);
    const accountInsight = {
      lifecycle: computeLifecycle(WorkerProf),
      status: WorkerProf.status,
      lastActiveAt: policyAt ?? null,
      inactivityWarningStage: stage,
      lastInactivityNotificationAt: WorkerProf.lastInactivityNotificationAt ?? null,
      monthsSinceActivity: policyAt ? wholeMonthsSince(policyAt) : null,
      lastStageDueAt:
        policyAt && stage > 0 ? scheduledActionDate(policyAt, stage) : null,
      nextMilestoneMonths: milestone,
      nextScheduledAt:
        policyAt && milestone ? scheduledActionDate(policyAt, milestone) : null,
      deletionDueAt: policyAt ? scheduledActionDate(policyAt, DEACTIVATION_MONTHS) : null,
      deactivationMonths: DEACTIVATION_MONTHS,
    };

    return res.status(200).json({
      success: true,
      WorkerProf,
      accountInsight,
      Applications: applications.length,
      Interviews: interviews.length,
      Locations: locations,
      Skills: skills
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}




const BASE_URL = "https://api.placeslayer.com";

export const getCityProvinceList = async (req: Request, res: Response) => {
  const API_KEY = process.env.PLACESLAYER_KEY;
  try {
    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Missing PLACESLAYER_KEY"
      });
    }

    const country = req.query.country || "PH";

    // 1. Get provinces
    const provincesRes = await axios.get(
      `${BASE_URL}/countries/${country}/provinces`,
      {
        headers: {
          "X-API-Key": API_KEY
        }
      }
    );


    const provincesRaw = provincesRes.data?.data ?? provincesRes.data;
    const provinces = Array.isArray(provincesRaw) ? provincesRaw : [];

    if (!provinces.length) {
      throw new Error("No provinces returned");
    }

    const results: any[] = [];

    for (const province of provinces) {
      try {
        const citiesRes = await axios.get(
          `${BASE_URL}/countries/${country}/provinces/${province.code}/cities`,
          {
            headers: { "X-API-Key": API_KEY }
          }
        );

        const citiesRaw = citiesRes.data?.data ?? citiesRes.data;
        const cities = Array.isArray(citiesRaw) ? citiesRaw : [];

        for (const city of cities) {
          results.push({
            city: city.name,
            province: province.name
          });
        }
      } catch (err) {
        console.error("Failed province:", province.code);
      }
    }

    return res.json({
      success: true,
      data: results
    });
  } catch (error: unknown) {
    const err = error as any;

    return res.status(500).json({
      success: false,
      message: err?.message || "Unknown error",
      details: err?.response?.data || null
    });
  }
};



// [Worker]: UpdateWorker: This updates the worker information of the workers
export const UpdateWorker = async (req: Request, res: Response) => {

  req.body = req.body || {};

  if (req.body.skills) {
    req.body.skills = JSON.parse(req.body.skills);
  }

  const validatedWorker = UpdateWorkerSchema.safeParse({ 
    ...req.body, 
    _id: req.user.id 
  })
  
  if (!validatedWorker.success) { const errors = validatedWorker.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}

  const { _id, name, phoneNumber, location, jobTitle, yearsOfExperience, about_me, availability, expected_salary, skills } = validatedWorker.data
  const sanitizedBio = filterXSS(about_me, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: true })

  try {
    const WorkerInfo = await Worker.findOne({ _id })
    if (!WorkerInfo) return res.status(404).json({ success: false, message: "Worker Not Found" })

    WorkerInfo.name = name || WorkerInfo.name

    WorkerInfo.phoneNumber = phoneNumber || WorkerInfo.phoneNumber
    WorkerInfo.location = filterXSS(location, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: true }) || WorkerInfo.location

    WorkerInfo.jobTitle = jobTitle || WorkerInfo.jobTitle
    WorkerInfo.yearsOfExperience = yearsOfExperience || WorkerInfo.yearsOfExperience

    WorkerInfo.about_me = sanitizedBio || WorkerInfo.about_me
    WorkerInfo.availability = availability || WorkerInfo.availability

    WorkerInfo.expected_salary 
    = expected_salary || WorkerInfo.expected_salary

    WorkerInfo.skills = skills || WorkerInfo.skills

    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    const resume = files?.resume?.[0];
    const photo = files?.photo?.[0];

    WorkerInfo.photo = `${replaceFile(
      WorkerInfo.photo,
      photo,
      path.join(__dirname, "../../uploads/profile")
    )}`

    WorkerInfo.resume = `${replaceFile(
      WorkerInfo.resume,
      resume,
      path.join(__dirname, "../../uploads/resumes")
    )}`

    await WorkerInfo.save()

    return res.status(200).json({
      success: true,
      message: "Worker Profile Success Update!"
    })

  } catch (error) {
    instanceErrors(
      error,
      res
    )
  }
}

// [Worker] - UploadWorkerJob: This uploads the worker's jobs completed, Source: https://medium.com/@mohsinansari.dev/handling-file-uploads-and-file-validations-in-node-js-with-multer-a3716ec528a3
export const UploadWorkerJob = async (req: Request, res: Response) => {
  const io = getIO();
  
  const validatedData = UploadWorkerJobSchema.safeParse({
    ...req.body, workerId: req.user.id, ...req.params
  });

  console.log(validatedData)

  if (!validatedData.success) {
    const errors = validatedData.error.issues
    console.log(validatedData.error)

    return res.status(400).json({
      success: false,
      message: errors[0].message
    })
  }

  console.log(validatedData)

  const { workerId, workerAssignment, workerUpload, workerDescription, employerId, isLate } = validatedData.data;

  console.log(`
    Worker ID: ${workerId},
    Worker Assignment: ${workerAssignment},
    Worker Upload: ${workerUpload},
    Worker Description: ${workerDescription},
    Employer ID: ${employerId}
  `)

  try {
    const sanitizedWorkerDescription = filterXSS(workerDescription as string, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: true
    })

    const Submission = await WorkerAssignment.findOne({ _id: workerAssignment })

    if (!Submission) return res.status(404).json({ success: false })

    if (Submission.rejectLate) {
      if (new Date(Submission.submitBefore) <= new Date()) {
        console.log(new Date(), new Date(Submission.submitBefore))
        console.log("Late submitted not accepted")

        return res.status(400).json({
          success: false
        })
      }
    }

    console.log("Not Late:", new Date(Submission.submitBefore), "Current Date:", new Date())

    const newJobCompleted = new JobsCompleted({ workerId, workerAssignment, workerUpload, workerDescription: sanitizedWorkerDescription, employerId, isLate })
    await newJobCompleted.save()

    return res.status(201).json({
      success: true
    })
  } catch (error) {
    instanceErrors(error, res);
  }
}

// [Worker] - UploadWorkerJobFile: This uploads the worker's jobs completed file from multer
export const UploadWorkerJobFile = async (req: Request, res: Response) => {
  console.log("Executing UploadWorkerJobFile Controller")
  uploadJobs(req, res, (err) => {
    if (err) {
      console.log(err)
      return res.status(400).json({
        success: false,
        errors: err
      })
    }

    return res.status(201).json({
      success: true,
      filename: req.files
    })
  })
}

// [Worker & Employer] - ViewEmployerResponses: This will show the responses of the employer with regards of their application
export const ViewEmployerResponses = async (req: Request, res: Response) => {
  const validatedData = ViewEmployerResponsesSchema.safeParse(req.params)

  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      info: validatedData.error
    })
  }

  const { applicationId } = validatedData.data;

  try {
    const EmployerResponses = await Reason.find({ applicationId })
                                          .populate("workerId")
                                          .populate("employerId")
                                          .populate("jobId");

    return res.status(200).json({
      success: true,
      EmployerResponses
    })
  } catch (error) {
    mainError(error, res)
  }
}



// [Worker & Employer] - UpdateWorkerJob: This updates the status of jobs completed either worker submits / employer marks their work as completed
export const UpdateWorkerJob = async (req: Request, res: Response) => {
  const io = getIO();

  const validatedData = UpdateWorkerJobSchema.safeParse(
    req.user.role === "worker" ? { ...req.body, workerId: req.user.id, workerName: req.user.name }
                               : { ...req.body, employerId: req.user.id, email: req.user.email }
  )

  if (!validatedData.success) {
    console.log(validatedData.error)
    return res.status(400).json({
      success: false,
      message: validatedData.error.issues[0].message
    })
  }

  const { workerAssignment, workerId, email, employerId, workerName, status } = validatedData.data
  let isLate = null

  try {
    const jobs = await JobsCompleted.find({ workerAssignment, workerId })

    if (!jobs.length) {
      return res.status(400).json({
        success: false,
        message: "You have not submitted any files yet."
      })
    }
    
    if (status === "submitted") {
      
      const Submission = await WorkerAssignment.findOne({ _id: workerAssignment })

      if (!Submission) return res.status(404).json({ success: false })

      if (Submission.rejectLate) {
        if (new Date(Submission.submitBefore) <= new Date()) {
          console.log(new Date(), new Date(Submission.submitBefore))
          console.log("Late submitted not accepted")

          return res.status(400).json({
            success: false
          })
        }
      }

      if (new Date(Submission.submitBefore) <= new Date()) {
        isLate = true
      } else {
        isLate = false
      }
      
      await JobsCompleted.updateMany({ workerAssignment, workerId }, { status: "PENDING", submitted: true, isLate })

      const notification = await UserNotification.create(
        UpdateWorkerJobWorker(workerName, new Date(), employerId)
      )

      io.to(employerId.toString()).emit("notification:employer:new", notification)
    } 
    
    // If the status is completed:
    else if (status === "completed") {
      await JobsCompleted.updateMany({ workerAssignment, workerId }, { status: "COMPLETED" })
      const notification = await UserNotification.create(UpdateWorkerJobCompleted(email, new Date(), workerId))
      io.to(workerId.toString()).emit("notification:worker:new", notification)

    // If the status is rejected:
    } else {
      await JobsCompleted.updateMany({ workerAssignment, workerId }, { status: "REJECTED", submitted: false })
      const notification = await UserNotification.create(UpdateWorkerJobRejected(email, new Date(), workerId))
      io.to(workerId.toString()).emit("notification:worker:new", notification)
    }

    // Return Success:
    return res.status(200).json({
      success: true,
      message: `Job Successfully Updated!`
    })
  } catch (error) {
    mainError(error, res)
  }
}

// [Worker] - DeleteWorkerJobFile: This deletes the file & the jobCompleted table, deleting files from the jobsCompleted
export const DeleteWorkerJobFile = async (req: Request, res: Response) => {
  const validatedData = DeleteWorkerJobSchema.safeParse(req.params)

  if (!validatedData.success) {
    return res.status(404).json({
      success: false,
      message: validatedData.error.issues[0].message
    })
  }

  const { _id } = validatedData.data

  try {
    const jobCompleted = await JobsCompleted.findOneAndDelete({ _id })

    if (!jobCompleted) {
      console.error("Failed to find job completed")

      return res.status(404).json({
        success: false,
        message: "Job not found"
      })
    }

    // Source used: https://medium.com/@priyaeswaran/automatic-image-deletion-in-node-js-multer-fs-f1835d272b92
    for (let i = 0; i < jobCompleted.workerUpload.length; i++) {
      const imagePath = path.join(__dirname, "../../uploads/workerJobsCompleted", jobCompleted.workerUpload[i].name);

      fs.unlink(imagePath, (err) => {
        if (err) return res.status(400).json({ success: false, info: "Failed to delete image" })
      })
    }

    return res.status(200).json({
      success: true, info: "Successfully deleted file"
    })
  } catch (error) {
    mainError(error, res)
  }
}

// [Worker] - UploadWorkerProfilePhoto: This updates the worker profile:
export const UploadWorkerProfilePhoto = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const worker = await Worker.findById(userId);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      });
    }

    worker.photo = `/uploads/profile/${req.file.filename}`;

    await worker.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo uploaded successfully",
      data: {
        photo: worker.photo,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
};

// [Employer] - UploadEmployerProfilePhoto: This updates the employer photo:
export const UploadEmployerProfilePhoto = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const employer = await Employer.findById(userId);

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      });
    }

    employer.profile = `/uploads/profile/${req.file.filename}`;

    await employer.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo uploaded successfully",
      data: {
        profile: employer.profile,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
};

// [Employer] - UpdateEmployer: This updates the employer information
export const UpdateEmployer = async (req: Request, res: Response) => {

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const photo = files?.photo?.[0];
  const permit = files?.permit?.[0];

  const validatedEmployer = UpdateEmployerSchema.safeParse({
    ...req.body,
    _id: req.user.id
  });

  if (!validatedEmployer.success) {
    const errors = validatedEmployer.error._zod.def;
    return res.status(400).json({
      success: false,
      message: errors[0].message,
      info: errors[0].message
    });
  }

  const {
    _id,
    company,
    phone,
    industry,
    industryTitle
  } = validatedEmployer.data;

  try {
    const EmployerInformation = await Employer.findById(_id);

    if (!EmployerInformation) {
      return res.status(404).json({
        success: false,
        message: "Employer Not Found",
        info: "Employer Not Found"
      });
    }

    if (phone) EmployerInformation.phone = phone;
      
    EmployerInformation.profile = `${replaceFile(
      EmployerInformation.profile,
      photo,
      path.join(__dirname, "../../uploads/profile")
    )}`

    EmployerInformation.permit = `${replaceFile(
      EmployerInformation.permit,
      permit,
      path.join(__dirname, "../../uploads/permits")
    )}`

    const companyFiltered = filterXSS(company, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: true
    })

    if (companyFiltered.length <= 1) return res.status(400).json({ success: false, info: "Company Name must have at least 2 characters" })

    const CompanyName = normalize(companyFiltered);

    let finalIndustry =
      industry || EmployerInformation.industry.toString();

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

    EmployerInformation.industry = new Types.ObjectId(finalIndustry);

    const companies = await Company.find({});

    let bestMatch = null;
    let bestScore = 0;

    for (const c of companies) {
      const score = jaro.similarity(
        CompanyName,
        normalize(c.name)
      );

      if (score > bestScore) {
        bestScore = score;
        bestMatch = c;
      }
    }

    const THRESHOLD = 0.95;

    let finalCompanyName = CompanyName;

    if (bestMatch && bestScore >= THRESHOLD) {
      finalCompanyName = bestMatch.name;
    } else {
      const created = new Company({
        name: companyFiltered,
        industry: finalIndustry
      });

      await created.save();

      finalCompanyName = created.name;
    }

    EmployerInformation.company = finalCompanyName;

    await Job.updateMany(
      { posted: _id },
      { $set: { company: finalCompanyName } }
    )

    const jobs = await Job.find({ posted: _id }).select('_id')

    await Application.updateMany(
      { job: { $in: jobs.map(j => j._id) } },
      { $set: { company: finalCompanyName } }
    )

    await EmployerInformation.save();

    return res.status(200).json({
      success: true,
      message: "Employer has successfully been updated!",
      info: "Employer has successfully been updated!"
    });

  } catch (error) {
    mainError(error, res);
  }
};

// [Employer] - EmployerProfileController: This controller gives employer access to viewing employer profile:
export const EmployerProfileController = async (req: Request, res: Response) => {
  const validatedEmployer = EmployerProfileS.safeParse({ _id: req.user.id })
  if (!validatedEmployer.success) { const errors = validatedEmployer.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}

  const { _id } = validatedEmployer.data

  try {
    const EmployerProf = await Employer.findOne({ _id }).populate("industry")
    const Industries = await Industry.find({
      notAccepted: { $ne: true }
    }).sort({ createdAt: -1 });

    if (!EmployerProf) return res.status(404).json({ success: false, message: "Employer Not Found" })

    // console.log("FROM MONGOOSE");
    // console.dir(Industries, { depth: null });

    return res.status(200).json({
      success: true,
      EmployerProf,
      Industries,
    });
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}

// [Employer] - View jobs posted by the authenticated employer:
export const viewPostedJobs = async (req: Request, res: Response) => {
  const validatedUserId = UserSchema.safeParse({ user: req.user.id })
  if (validatedUserId.error) { const error = validatedUserId.error.issues; return res.status(400).json({ success: false, message: error[0].message }) }

  const { user } = validatedUserId.data

  try {
    const jobs = await Job.find({ posted: user }).sort({ createdAt: -1 })
    if (jobs.length === 0) {
      return res.status(200).json({
        success: true,
        jobs,
        message: "No jobs available"
      })
    }

    return res.status(200).json({
      success: true,
      jobs
    })
  } catch (error) {
    instanceErrors(error, res)
  }
}



// Post a Review:
export const ReviewUpload = async (req: Request, res: Response) => {
  const validatedInfo = RatingSchema.safeParse({ ...req.body, worker: req.user.id })
  if (!validatedInfo.success) { const errors = validatedInfo.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}

  const { worker, rating, description } = validatedInfo.data

  try {
    const Description = filterXSS(description, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: true })
    const NewRate = new Rating({ worker, rating, description: Description })

    await NewRate.save()

    return res.status(201).json({
      success: true,
      message: "Review Successfully Uploaded!"
    })
  } catch (error) {
    instanceErrors(
      error,
      res
    )
  }
}



// Display Job Overview:
export const viewJobOverview = async (req: Request, res: Response) => {
  const validatedJob = JobOverviewSchema.safeParse({ job: new Types.ObjectId(req.params.job) })
  if (validatedJob.error) { const errors = validatedJob.error.issues; return res.status(400).json({ success: false, message: errors[0].message }) }

  const { job } = validatedJob.data

  try {
    const job_Overview = await Job.findOne({ _id: job })
    if (!job_Overview) return res.status(404).json({ success: false, message: "Job doesn't exist" })

    return res.status(200).json({
      success: true, 
      job_Overview
    })
  } catch (error) {
    instanceErrors(error, res)
  }
}




// Location:
export const AddLocation = async (req: Request, res: Response) => {
  const validatedData = LocationSchema.safeParse(req.body)
  if (validatedData.error) { const errors = validatedData.error.issues; return res.status(400).json({ success: false, message: errors[0].message }) }

  const { name } = validatedData.data

  // Sanitize XSS Title:
  const sanitizedName = filterXSS(name, { whiteList: {},
        stripIgnoreTag: true,
            stripIgnoreTagBody: true
  })
  
  try {
    const newLocation = new Location({ name: sanitizedName })
    await newLocation.save()

    return res.status(201).json({ success: true, message: "Location Successfully Created!" })
  } catch (error) {

    instanceErrors(
      error,
      res
    )
  }
}



// Add Skill:
export const AddTag = async (req: Request, res: Response) => {
  const validatedData = TagSchema.safeParse(req.body)
  if (validatedData.error) { const errors = validatedData.error.issues; return res.status(400).json({ success: false, message: errors[0].message }) }

  const { title } = validatedData.data

  // Sanitize XSS Title:
  const sanitizedTitle = filterXSS(title, { whiteList: {},
        stripIgnoreTag: true,
            stripIgnoreTagBody: true
  })

  try {
    const newTag = new Tag({ title: sanitizedTitle })
    await newTag.save()

    return res.status(201).json({
      success: true,
      message: "Tag successfully Added!"
    })

  } catch (error) {

    instanceErrors(
      error,
      res
    )
  }
}



// View Job Applications:
export const viewApplicationsEmployer = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    await purgeStaleApplicationsForEmployer(userId);

    const jobIds = await Job.find({ posted: userId }).distinct("_id");

    const Applications = await Application.find({
      job: { $in: jobIds },
    })
    .populate("job")
    .populate("worker")
    .populate("location")
    .sort({ createdAt: -1 });

    const formatted = Applications.map((row) => formatApplicationForEmployer(row as never)).filter(
      (row): row is NonNullable<typeof row> => row !== null,
    );

    if (!formatted.length) {
      return res.status(200).json({
        success: true,
        message: "No Applications",
        Applications: [],
      });
    }

    return res.status(200).json({
      success: true,
      Applications: formatted,
    });
  } catch (error) {
    mainError(error, res);
  }
};





// View Job Applications:
export const viewApplications = async (req: Request, res: Response) => {
  const validatedWorker = WorkerIDJob.safeParse({ worker: req.user.id })

  if (!validatedWorker.success) { const errors = validatedWorker.error.issues; return res.status(400).json({ success: false, message: errors[0].message }) }

  const { worker } = validatedWorker.data

  try {
    const Applications = await Application.find({ worker }).populate("job").populate("location").sort({ createdAt: -1 })
    if (!Applications.length) return res.status(200).json({ success: true, message: "No Applications", Applications })

    return res.status(200).json({
      success: true,
      Applications
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}



// Update Status of Application:
export const WithdrawApplication = async (req: Request, res: Response) => {
  const validatedData = ApplicationStatusUpdate.safeParse({ _id: req.body._id, status: "Withdrawed" })
  if (!validatedData.success) { const errors = validatedData.error.issues; return res.status(400).json({ success: false, message: errors[0].message })}

  const { status, _id } = validatedData.data

  try {
    const application = await Application.findOne({ _id })
    if (!application) return res.status(404).json({ success: false, message: "Application was not found" })

    application.status = status || application.status
    await application.save()

    return res.status(200).json({
      success: true,
      message: "Application is Withdrawed"
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}



// Accept Application:
export const UpdateApp = async (req: Request, res: Response) => {
    
  const io = getIO();

  const validatedStatus = UpdateApplication.safeParse(req.body);
  const validatedEmployer = employerIdSchema.safeParse({ id: req.user.id, role: req.user.role })

  if (!validatedStatus.success) {
    const errors = validatedStatus.error.issues;
    return res.status(400).json({
      success: false,
      message: errors[0].message,
    });
  }

  if (!validatedEmployer.success) {
    const errors = validatedEmployer.error.issues;
    return res.status(400).json({
      success: false,
      message: errors[0].message,
    });
  }

  const { _id, status, timeline } = validatedStatus.data;
  const { id } = validatedEmployer.data;

  try {
    const application = await Application.findOne({ _id });
    if (!application)
      return res.status(404).json({ success: false, message: "Application not found" });

    const job = await Job.findById(application.job);
    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });

    const employer = await Employer.findOne({ _id: id })
    if (!employer)
      return res.status(404).json({ success: false, message: "Employer not found" })

    const previousStatus = application.status;
    const newStatus = status;

    // CASE 1: not accepted → accepted
    if (previousStatus !== "Accepted" && newStatus === "Accepted") {
      await Job.updateOne(
        { _id: job._id, positions: { $gt: 0 } },
        { $inc: { positions: -1 } }
      );

      await ApplicationAccepted.create({ job: job._id, jobCreatedAt: job.createdAt })
    }

    // CASE 2: accepted → not selected (rollback slot)
    if (previousStatus === "Accepted" && newStatus === "Not Selected") {
      await Job.updateOne(
        { _id: job._id },
        { $inc: { positions: 1 } }
      );
    }

    if (previousStatus === newStatus) {
      return res.status(200).json({
        success: true,
        message: "No changes applied",
      });
    }

    application.status = newStatus;
    application.timeline =
      newStatus === "Accepted" || newStatus === "Not Selected"
        ? "Final Decision"
        : timeline;

    await application.save();

    const notifications = new UserNotification(
      UpdateApplicationPayload(
        status,
        employer.email,
        new Date(),
        application.worker,
        job.title
      )
    );

    await notifications.save();
    
    console.log(
      "Worker room:",
      application.worker.toString()
    );

    console.log(
      "Emitting to room:",
      application.worker.toString()
    );

    io.to(application.worker.toString()).emit(
      "notification:worker:new",
      notifications
    );

    return res.status(200).json({
      success: true,
      message: "Application successfully updated!",
    });
  } catch (error) {
    mainError(error, res);
  }
};



// Update Interview Date:
export const UpdateInterview = async (req: Request, res: Response) => {
  const validatedDate = InterviewDate.safeParse(req.body)
  if (!validatedDate.success) { const errors = validatedDate.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}

  const { _id, interviewDate } = validatedDate.data

  // interviewDate is expected to be "YYYY-MM-DD"
  const selectedDate = new Date(interviewDate)
  const today = new Date()

  // Remove time so today is accepted
  today.setHours(0, 0, 0, 0)
  selectedDate.setHours(0, 0, 0, 0)

  if (selectedDate < today) {
    return res.status(400).json({
      success: false,
      message: "Interview date cannot be in the past."
    })
  }
  
  const newDate = interviewDate.split("-")

  try {
    const monthArray = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const year = newDate[0]
    const month = monthArray[Number(newDate[1]) - 1]
    const day = newDate[1 + 1]

    const Date = `${month} ${day}, ${year}`
    const find_application = await Application.findOne({ _id })

    if (!find_application) return res.status(404).json({ success: false, message: "Application not found" })
    find_application.interviewDate = Date || find_application.interviewDate

    await find_application.save()

    return res.status(200).json({
      success: true,
      message: "Interview Date Successfully Updated!"
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}



// View Company Details:
export const CompanyDetails = async (req: Request, res: Response) => {

  const validatedEmployer = EmployerIdSchema.safeParse({ userId: req.user.id })

  if (!validatedEmployer.success) {
    const errors = validatedEmployer.error.issues;
    return res.status(400).json({
      success: false,
      message: errors[0].message
    })
  }

  const { userId } = validatedEmployer.data

  try {
    const employer = await Employer.findById(userId);
    if (!employer) return res.status(404).json({ success: false })

    const CompanyInformation = await Company.findOne({ name: employer.company }).populate("industry")
    if (!CompanyInformation) return res.status(404).json({ success: false, message: "Company not available" })

    const TotalApplications = await Application.find({ company: employer.company })
    const Employees = await Application.find({ company: employer.company, timeline: "Final Decision", status: "Accepted" })

    const result = await Job.aggregate([
      { $match: { company: employer.company, status: "ACCEPTED" } },
      { $group: { _id: null, total: { $sum: "$positions" } } }
    ]);

    const OpenPositionsLength = result[0]?.total || 0;

    return res.status(200).json({
      success: true,
      CompanyInformation,
      TotalApplications: TotalApplications.length,
      OpenPositionsLength, Employees: Employees.length
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}

// [Worker & Employer]: SubmitReason = The purpose of this is for employers to submit reason of accepted/rejected job:
export const SubmitReason = async (req: Request, res: Response) => {
  const io = getIO()
  let parseOBJ = {}
  let Email = ""

  if (req.user.role === "worker") {
    parseOBJ = { ...req.body, workerId: req.user.id, sentBy: req.user.role }
  } else {
    parseOBJ = { ...req.body, employerId: req.user.id, sentBy: req.user.role }
  }

  const validatedData = StatusReasonSchema.safeParse(parseOBJ)

  if (!validatedData.success) {
    console.error(JSON.stringify(validatedData.error.cause))
    return res.status(400).json({
      success: false,
      info: JSON.stringify(validatedData.error.cause)
    })
  }

  const { workerId, employerId, jobId, applicationId, title, description, sentBy } = validatedData.data;

  if (sentBy === "worker") {
    const EmployerEmail = await Employer.findOne({ _id: employerId })
    if (!EmployerEmail) return res.status(404).json({ success: false, info: "Email doesn't exist" })

    Email = EmployerEmail.email
  } else {
    const WorkerEmail = await Worker.findOne({ _id: workerId })
    if (!WorkerEmail) return res.status(404).json({ success: false, info: "Email doesn't exist" })

    Email = WorkerEmail.email

    const ReasonsList = await Reason.find({ applicationId, sentBy: "employer" })

    if (!ReasonsList.length) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Source: https://nodemailer.com/message
      await transporter.sendMail({
        from: `"${req.user.email}" <${process.env.EMAIL_USER}>`,
        to: Email,
        subject: title,
        text: description
      });
    }
  }

  try {
    const filteredTitle = filterXSS(title, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: true
    })

    const filteredDescription = filterXSS(description, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: true
    })

    console.log("Request.user.email:", req.user.email)
    const newSubmitReason = new Reason({ workerId, employerId, jobId, applicationId, title: filteredTitle, description: filteredDescription, sentBy });

    await newSubmitReason.save()

    const ApplicationDetails = await Application.findOne({ _id: applicationId })
    if (!ApplicationDetails) return res.status(404).json({ success: false, info: "Application not found" })

    const JobDetails = await Job.findOne({ _id: ApplicationDetails.job })
    if (!JobDetails) return res.status(404).json({ success: false, info: "Job not found" })

    const WorkerDetails = await Worker.findOne({ _id: ApplicationDetails.worker })
    if (!WorkerDetails) return res.status(404).json({ success: false, info: "Worker not found" })

    if (sentBy === "worker") {
      const notification = new UserNotification(
        UploadReasonPayload(req.user.email, new Date(), employerId, sentBy, JobDetails.title, WorkerDetails.name)
      )
      
      await notification.save()

      io.to(employerId.toString()).emit(
        "notification:employer:new",
        notification
      )
    } else {
      const notification = new UserNotification(
        UploadReasonPayload(req.user.email, new Date(), workerId, sentBy, JobDetails.title, WorkerDetails.name)
      )

      await notification.save()

      io.to(workerId.toString()).emit(
        "notification:worker:new",
        notification
      )
    }

    return res.status(201).json({
      success: true,
      submitReason: newSubmitReason
    })
    
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      info: JSON.stringify(error)
    })
  }
}


// View Workers:
export const ViewWorkers = async (req: Request, res: Response) => {
  try {
    await purgeStaleApplicationsForEmployer(req.user.id);

    // Jobs posted by the employer
    const jobs = await Job.find(
      { 
        posted: req.user.id,
        status: "ACCEPTED"
      },
      "_id"
    );

    const jobIds = jobs.map((job) => job._id);

    const applications = await Application.find({
      job: { $in: jobIds },
      status: "Accepted",
    }).select("worker");

    const workerIds = [
      ...new Set(applications.map((app) => app.worker.toString())),
    ];

    const workers = await Worker.find({
      _id: { $in: workerIds },
      status: { $ne: "deleted" },
    })
      .sort({ createdAt: -1 })
      .then((rows) => rows.filter((w) => !isWorkerUnavailableToEmployer(w)));

    return res.status(200).json({
      success: true, workers,
    });
  } catch (error) {
    mainError(error, res);
  }
};

// Recommended Workers for one of the employer's open jobs (AI-assisted skill match):
export const RecommendedWorkers = async (req: Request, res: Response) => {
  const { jobId } = req.params;
  if (!Types.ObjectId.isValid(String(jobId))) return res.status(400).json({ success: false, message: "Invalid job" });

  try {
    const job = await Job.findOne({ _id: jobId, posted: req.user.id, status: "ACCEPTED" }).select("title category tags");
    if (!job) return res.status(404).json({ success: false, message: "Open job not found" });

    // A job without tags is matched on its category and title instead.
    const jobSkills = job.tags?.length ? job.tags : [job.category, job.title].filter(Boolean) as string[];

    const workers = await Worker.find({ status: "active" })
      .select("name photo resume jobTitle location yearsOfExperience availability skills skill rating")
      .lean();

    // The skill category counts as a skill, as in viewJobs:
    const { ai, matches } = await matchWorkersForJob(
      jobSkills,
      workers.map((w) => ({ id: String(w._id), skills: [...(w.skills || []), ...(w.skill ? [w.skill] : [])] }))
    );

    const [verified, applications] = await Promise.all([
      VerifiedWorker.find({ worker: { $in: workers.map((w) => w._id) } }).select("worker"),
      Application.find({ job: job._id }).select("worker status"),
    ]);
    const verifiedIds = new Set(verified.map((v) => String(v.worker)));
    const applicationStatus = new Map(applications.map((a) => [String(a.worker), a.status]));

    const recommended = workers
      .map((w) => ({
        ...w,
        isVerified: verifiedIds.has(String(w._id)),
        applicationStatus: applicationStatus.get(String(w._id)) ?? null,
        match: matches.get(String(w._id))!,
      }))
      .filter((w) => (w.match.score ?? 0) > 0)
      .sort((a, b) =>
        (b.match.score ?? 0) - (a.match.score ?? 0) ||
        Number(b.isVerified) - Number(a.isVerified) ||
        Number(b.rating || 0) - Number(a.rating || 0)
      )
      .slice(0, 50);

    return res.status(200).json({
      success: true,
      job: { _id: job._id, title: job.title, skills: jobSkills },
      workers: recommended,
      matching: { ai, recommendedScore: RECOMMENDED_SCORE },
    });
  } catch (error) {
    mainError(error, res);
  }
};

// Log Out Controller:
export const LogOut = async (req: Request, res: Response) => {
  try {
    return res.clearCookie("token", clearAuthCookieOptions).status(200).json({ success: true, message: "Successfully Logged Out!" })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error"
    })
  }
}