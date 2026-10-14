import Worker from "../model/Worker";
import VerifiedWorker from "../model/VerifiedWorker";
import {
  AcceptedSchema,
  PendingSchema,
  DeclinedSchema,
  TotalWorkerSchema,
  VerifiedWorkersSchema,
  PendingVerificationWorkersSchema,
  DeclinedWorkersSchema,
  NewSkillSchema,
  AppStatusSchema,
  UpdateSchema,
  AddNewCompanySchema,
  AddNewIndustryValidation,
  DashboardSchema,
  ProfileSchema,
  UpdateWorkersEmployers,
  SkillsInformation,
  CompanySchema,
  markAsReadAdminSchema,
  AdminIdSchema,
  VerifyWorkerSchema,
  UpdateReportSchema
} from "../validator/admin";
import { instanceErrors, mainError } from "../errors/showErrors";
import Employer from "../model/Employer";
import Job from "../model/Job";
import Skill from "../model/Skill";
import { SortSchema } from "../validator/protected";
import Industry from "../model/Industry";
import { Types } from "mongoose";
import Company from "../model/Company";
import { Request, Response } from "express";
import { z } from "zod";
import filterXSS from "xss";
import Application from "../model/Application";
import AdminNotification from "../model/AdminNotification";
import UserNotification from "../model/UserNotification";
import { JobPostPayload } from "../notif-payload/user";
import Admin from "../model/Admin";
import { getIO } from "../socket";
import Report from "../model/Report";
import bcrypt from "bcryptjs";

// Update Admin Password:
export const UpdatePass = async (req: Request, res: Response) => {
  try {
    const AdminInfo = await Admin.findOne({ _id: req.user.id })
    if (!AdminInfo) return res.status(404).json({ success: false, info: "Account Not Found" })

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(req.body.password, salt)

    console.log(hashed, ", this is the password")

    AdminInfo.password = hashed || AdminInfo.password;
    
    await AdminInfo.save();

    return res.status(200).json({
      success: true,
      info: "Successfully updated the password."
    })
  } catch (error) {
    mainError(error, res)
  }
}


// Profile:
export const Profile = async (req: Request, res: Response) => {
  const validatedAdmin = AdminIdSchema.safeParse({ _id: req.user.id })

  if (!validatedAdmin.success) {
    return res.status(400).json({
      success: false,
      message: validatedAdmin.error.issues[0].message
    })
  }

  const { _id } = validatedAdmin.data;

  try {
    const AdminProfile = await Admin.findOne({ _id })

    if (!AdminProfile) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      })
    }

    return res.status(200).json({ success: true, AdminProfile })

  } catch (error) {
    mainError(
      error,
      res
    )
  }
}


// Update Reported Worker Status:
export const UpdateReportStatus = async (req: Request, res: Response) => {
  const validatedData = UpdateReportSchema.safeParse(req.body)

  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      message: validatedData.error.issues[0].message
    })
  }

  const { _id, status } = validatedData.data;

  try {
    await Report.updateOne({ _id }, { status })

    return res.status(200).json({
      success: true
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}

// Dashboard:
export const Dashboard = async (req: Request, res: Response) => {
  try {
    const JOBS = await Job.find({ status: { $ne: "DELETED" } })
      .populate("posted")
      .populate("location")
      .sort({ createdAt: -1 });

    const WORKERS = await Worker.find().sort({ createdAt: -1 });

    const VERIFIED_WORKERS = await VerifiedWorker.find();

    const REPORT_WORKERS = await Report.find()

    return res.status(200).json({
      success: true,
      JOBS,
      WORKERS,
      VERIFIED_WORKERS,
      REPORT_WORKERS
    });
  } catch (error) {
    mainError(error, res);
  }
};



// Update all notifications:
export const markNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const { scope } = req.body;

    const filter: any = {};

    if (scope === "unread") {
      filter.read = false;
    }

    if (scope === "job") {
      filter.category = "job";
    }

    if (scope === "account") {
      filter.category = "account";
    }

    if (scope === "all") {
      // no filter
    }

    const result = await AdminNotification.updateMany(filter, {
      $set: { read: true },
    });

    return res.status(200).json({
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
    });
  }
};



// Mark as Read:
export const MarkAsReadAdmin = async (req: Request, res: Response) => {
  const validated = markAsReadAdminSchema.safeParse(req.params)

  if (validated.error) {
    const error = validated.error.issues

    return res.status(400).json({
      success: false,
      message: error[0].message
    })
  }

  const { _id } = validated.data

  try {
    const notification = await AdminNotification.findById(_id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      })
    }

    notification.read = true

    await notification.save()

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read"
    })
  }
}



// Display Admin Notifications:
export const AdminNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await AdminNotification
      .find()
      .sort({ time: -1 })

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    })
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin notifications"
    })
  }
}



// Display Applications:
export const Applications = async (req: Request, res: Response) => {
  const validatedData = CompanySchema.safeParse({ company: req.params.company })

  if (!validatedData.success) {
    const errors = validatedData.error.issues

    return res.status(400).json({
      success: false,
      message: errors[0].message
    })
  }

  const { company } = validatedData.data
  const sanitizedComp = filterXSS(company, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: true })

  try {
    const applications = await Application.aggregate([
      { $match: { company: sanitizedComp } },

      // Keep only the latest application per worker
      { $sort: { createdAt: -1 } },

      {
        $group: {
          _id: "$worker",
          application: { $first: "$$ROOT" },
        },
      },

      { $replaceRoot: { newRoot: "$application" } },

      { $sort: { createdAt: -1 } },
    ]);

    const ids = applications.map(id => id._id)
    console.log(new Set(ids))

    await Application.populate(applications, {
      path: "worker",
    });

    return res.status(200).json({
      success: true,
      applications
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}



// Profiles:
export const Profiles = async (req: Request, res: Response) => {
  const validatedRole = ProfileSchema.safeParse({ role: req.params.role })
  if (!validatedRole.success) { const errors = validatedRole.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}

  const { role } = validatedRole.data
  try {
    if (role !== "all") {
      let Users
      if (role === "worker") {
        Users = await Worker.find().sort({ createdAt: -1 })
      } else {
        Users = await Employer.find().populate("industry").sort({ createdAt: -1 })
      }

      return res.status(200).json({
        success: true,
        Users
      })
    } else {
      let Users = []
      const Workers = await Worker.find().sort({ createdAt: -1 })
      const Employers = await Employer.find().populate("industry").sort({ createdAt: -1 })

      const verifiedWorkers = await VerifiedWorker.find().select("worker");

      const verifiedSet = new Set(
        verifiedWorkers.map(v => v.worker.toString())
      );

      for (let worker = 0; worker < Workers.length; worker++) {
        const workerObj = Workers[worker];

        const reportsSubmitted = await Report.find({
          workerId: workerObj._id,
        });

        const reportObj = {
          reportsSubmitted: reportsSubmitted.length,
          isVerified: verifiedSet.has(workerObj._id.toString()),
        };

        if (workerObj.status !== "deleted") {
          Users.push({
            ...workerObj.toObject(),
            ...reportObj,
          });
        }
      }
      
      for (let employer = 0; employer < Employers.length; employer++) {
        if (Employers[employer].status !== "deleted") {
          Users.push(Employers[employer])
        }
      }

      return res.status(200).json({
        success: true,
        Users
      })
    }
  } catch (error) {
    mainError(error, res)
  }
}

// Verify Worker:
export const WorkerVerification = async (req: Request, res: Response) => {
  const validatedData = VerifyWorkerSchema.safeParse({ worker: req.body.worker })

  if (!validatedData.success) {
    const errors = validatedData.error.issues;

    return res.status(400).json({
      success: false,
      message: errors[0].message
    })
  }

  const { worker } = validatedData.data;

  try {
    const workerExists = await Worker.findOne({ _id: worker });

    if (!workerExists) {
      return res.status(404).json({
        success: false,
        message: "Worker doesn't exist"
      })
    }

    const verifiedWorker = new VerifiedWorker({
      worker
    })

    const IsVerified = await VerifiedWorker.findOne({ worker })
    if (IsVerified) return res.status(400).json({ success: false, message: "Worker is already verified" })

    await verifiedWorker.save()

    return res.status(201).json({
      success: true,
      message: "Worker successfully verified!"
    })
  } catch (error) {
    mainError(error, res)
  }
}

// Update Worker & Employer Status Information:
export const UpdateWorkersEmployersInformation = async (req: Request, res: Response) => {
  const validatedStatus = UpdateWorkersEmployers.safeParse(req.body)
  if (!validatedStatus.success) { const errors = validatedStatus.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}

  const { _id, status, role } = validatedStatus.data

  try {
    if (role === "employer") {
      const EmployerUpdate = await Employer.findOne({ _id })
      if (!EmployerUpdate) return res.status(404).json({ success: false, message: "Employer not found"})

      EmployerUpdate.status = status || EmployerUpdate.status
      await EmployerUpdate.save()
    } else {
      const WorkerUpdate = await Worker.findOne({ _id })
      if (!WorkerUpdate) return res.status(404).json({ success: false, message: "Worker not found"})

      WorkerUpdate.status = status || WorkerUpdate.status
      await WorkerUpdate.save()
    }

    return res.status(200).json({
      success: true,
      message: "Updated successfully!"
    })
  } catch (error) {
    instanceErrors(
      error,
      res
    )
  }
}


// Delete the worker / employer:
export const DeleteWorkerEmployer = async (req: Request, res: Response) => {
  const validatedId = UpdateWorkersEmployers.safeParse(req.body)

  if (!validatedId.success) {
    return res.status(400).json({
      success: false,
      message: validatedId.error._zod.def[0].message,
    })
  }

  const { _id, status, role } = validatedId.data

  try {
    if (role === "employer") {
      const EmployerUpdate = await Employer.findById(_id)

      if (!EmployerUpdate) {
        return res.status(404).json({
          success: false,
          message: "Employer not found",
        })
      }

      EmployerUpdate.status = status || EmployerUpdate.status
      await EmployerUpdate.save()

      if (status === "deleted") {
        await Job.updateMany(
          { posted: new Types.ObjectId(_id) },
          { $set: { status: "DELETED" } }
        )
      }
    } else {
      const WorkerUpdate = await Worker.findById(_id)

      if (!WorkerUpdate) {
        return res.status(404).json({
          success: false,
          message: "Worker not found",
        })
      }

      WorkerUpdate.status = status || WorkerUpdate.status
      await WorkerUpdate.save()
    }

    return res.status(200).json({
      success: true,
      message: "Deleted successfully!",
    })
  } catch (error) {
    mainError(error, res)
  }
}

// Reports:
export const Reports = async (req: Request, res: Response) => {
  try {
    const Industries = await Industry.find().sort({ createdAt: -1 }) || [];
    const ReportedWorkers = await Report.find().sort({ createdAt: -1 })
                                        .populate("workerId")
                                        .populate("employerId");

    const workerGrowth = await Worker.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },

          newWorkers: { $sum: 1 },

          activeWorkers: {
            $sum: {
              $cond: [
                { $eq: ["$status", "active"] },
                1,
                0
              ]
            }
          },
        },
      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },

      {
        $project: {
          _id: 0,

          month: {
            $concat: [
              {
                $arrayElemAt: [
                  [
                    "",
                    "Jan","Feb","Mar","Apr","May","Jun",
                    "Jul","Aug","Sep","Oct","Nov","Dec"
                  ],
                  "$_id.month",
                ],
              },

              " ",

              { $toString: "$_id.year" },
            ],
          },

          newWorkers: 1,
          activeWorkers: 1,
        },
      },
    ]);

    // PAYMENT SUMMARY DATA (this is what your chart needs)
    const jobsByIndustry = await Job.aggregate([
      {
        $match: {
          category: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$category",
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          value: 1
        }
      },
      {
        $sort: { value: -1 }
      }
    ]);

  const jobPerformance = await Job.aggregate([
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        posted: { $sum: 1 },
        filled: {
          $sum: {
            $cond: [
              { $lt: [{ $ifNull: ["$positions", 0] }, 1] },
              1,
              0,
            ],
          },
        },
        expired: {
          $sum: {
            $cond: [
              { $lt: [{ $toDate: "$applyBefore" }, "$$NOW"] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: {
          $arrayElemAt: [
            [
              "",
              "Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ],
            "$_id.month"
          ]
        },
        posted: 1,
        filled: 1,
        expired: 1,
      },
    },
  ]);

  console.log(jobPerformance);
  
  const categoryTable = await Job.aggregate([
    {
      $lookup: {
        from: "workers",
        localField: "category",
        foreignField: "industry",
        as: "workers",
      },
    },

    {
      $lookup: {
        from: "applications",
        localField: "_id",
        foreignField: "job",
        as: "applications"
      }
    },

    {
      $addFields: {
        applications: {
          $cond: [
            { $isArray: "$applications" },
            "$applications",
            []
          ]
        }
      }
    },

{
  $group: {
    _id: "$category",

    totalApplications: {
      $sum: { $size: "$applications" }
    },

    acceptedApplications: {
      $sum: {
        $size: {
          $filter: {
            input: "$applications",
            as: "a",
            cond: { $eq: ["$$a.status", "Accepted"] }
          }
        }
      }
    },

  activeJobs: {
    $sum: {
      $cond: [
        {
          $and: [
            { $gt: [{ $toDate: "$applyBefore" }, "$$NOW"] },
            {
              $not: {
                $in: [
                  "$status",
                  ["DELETED", "DECLINED", "PENDING"]
                ]
              }
            }
          ]
        },
        1,
        0
      ]
    }
  },

    totalJobs: { $sum: 1 },
  }
},

{
  $addFields: {
    workers: {
      $reduce: {
        input: "$workers",
        initialValue: [],
        in: { $concatArrays: ["$$value", "$$this"] }
      }
    }
  }
},

{
  $project: {
    _id: 0,
    name: "$_id",

    activeJobs: 1,
    totalApplications: 1,

    avgApplications: {
      $round: [
        {
          $cond: [
            { $eq: ["$totalJobs", 0] },
            0,
            { $divide: ["$totalApplications", "$totalJobs"] }
          ]
        },
        0
      ]
    },

    acceptanceRate: {
      $round: [
        {
          $cond: [
            { $eq: ["$totalApplications", 0] },
            0,
            {
              $multiply: [
                { $divide: ["$acceptedApplications", "$totalApplications"] },
                100
              ]
            }
          ]
        },
        0
      ]
    },

    acceptedApplications: {
      $sum: {
        $size: {
          $filter: {
            input: { $ifNull: ["$applications", []] },
            as: "a",
            cond: { $eq: ["$$a.status", "Accepted"] }
          }
        }
      }
    }
  }
}
  ]);

    return res.status(200).json({
      success: true,
      jobsByIndustry,
      industries: Industries,
      workerGrowth,
      jobPerformance,
      categoryTable,
      ReportedWorkers
    });

  } catch (error) {
    mainError(error, res);
  }
};



// Workers:
export const TotalWorkers = async (req: Request, res: Response) => {
  try {
    const workers = await Worker.find().sort({ createdAt: -1 })
    return res.status(200).json({ success: true, workers, noOfWorkers: workers.length })
    
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}



// deleteAdminNotifSchema:
export const deleteAdminNotifSchema = async (req: Request, res: Response) => {
  const validatedNotif = markAsReadAdminSchema.safeParse(req.params)

  if (validatedNotif.error) {
    const error = validatedNotif.error.issues
    return res.status(400).json({ error })
  }

  const { _id } = validatedNotif.data

  try {
    const deletedNotif = await AdminNotification.findByIdAndDelete(_id)

    if (!deletedNotif) {
      return res.status(404).json({
        error: "Notification not found"
      })
    }

    return res.status(200).json({
      message: "Notification deleted successfully"
    })

  } catch (error) {
    mainError(error, res)
  }
}




// Verified Workers:
export const VerifiedWorkers = async (req: Request, res: Response) => {
  const validatedRoleAndStatus = VerifiedWorkersSchema.safeParse({ status: "verified" })
  if (validatedRoleAndStatus.error) { const errors = validatedRoleAndStatus.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message }) }

  const { status } = validatedRoleAndStatus.data

  try {
    const workers = await Worker.find({ status }).sort({ createdAt: -1 })
    return res.status(200).json({ success: true, workers, noOfVerifiedWorkers: workers.length })

  } catch (error) {
    mainError(
      error,
      res
    )
  }
}




// Pending Workers:
export const PendingWorkers = async (req: Request, res: Response) => {
  const validatedRoleAndStatus = PendingVerificationWorkersSchema.safeParse({ status: "pending" })
  if (validatedRoleAndStatus.error) { const errors = validatedRoleAndStatus.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message }) }

  const { status } = validatedRoleAndStatus.data

  try {
    const workers = await Worker.find({ status }).sort({ createdAt: -1 })
    return res.status(200).json({ success: true, workers, noOfPendingWorkers: workers.length })
    
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}





// Declined Workers:
export const DeclinedWorkers = async (req: Request, res: Response) => {
  const validatedRoleAndStatus = DeclinedWorkersSchema.safeParse({ status: "declined" })
  if (validatedRoleAndStatus.error) { const errors = validatedRoleAndStatus.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message }) }

  const { status } = validatedRoleAndStatus.data

  try {
    const workers = await Worker.find({ status }).sort({ createdAt: -1 })
    return res.status(200).json({ success: true, workers, declined: workers.length })
    
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}




// Reported Accounts:
export const ReportedAccounts = async (req: Request, res: Response) => {
  try {

  } catch (error) {
    console.error(error)
    
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    })
  }
}






// Add New Skill:
export const NewSkillController = async (req: Request, res: Response) => {
  const validatedData = NewSkillSchema.safeParse(req.body)
  if (!validatedData.success) { const errors = validatedData.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message }) }
  
  const { title } = validatedData.data

  try {
    const addSkill = new Skill({ title })
    await addSkill.save()

    return res.status(200).json({
      success: true,
      message: "Added new Skill"
    })
  } catch (error: unknown) {
    instanceErrors(
      error,
      res
    )
  }
}







// Display Exported Jobs:
export const ViewJobsNew = async (req: Request, res: Response) => {
  try {
    const jobs = await Job.find({
      status: { $ne: "DELETED" }
    }).sort({ createdAt: -1 });

    if (jobs.length === 0)
      return res.status(200).json({
        success: true,
        jobs,
        message: "No jobs available"
      });

    return res.status(200).json({
      success: true,
      jobs
    });
  } catch (error) {
    mainError(error, res);
  }
};





// Display Exported Jobs:
export const ViewJobsOld = async (req: Request, res: Response) => {
  try {
    const jobs = await Job.find().sort({ createdAt: 1 })
    if (jobs.length === 0) return res.status(200).json({ success: true, jobs, message: "No jobs available" })

    return res.status(200).json({
      success: true,
      jobs
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}






// Update Status:
export const UpdateJobStatus = async (req: Request, res: Response) => {

  const io = getIO();

  const { job } = req.params
  const { newStatus } = req.body

  const validatedStatus = UpdateSchema.safeParse({ id: job, status: newStatus })

  if (validatedStatus.error) { const errors = validatedStatus.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message }) }

  const { id, status } = validatedStatus.data

  try {
    const NewStatus = await Job.findOne({ _id: id })
    if (!NewStatus) return res.status(400).json({ success: false, message: "Job not found" })

    const employer = await Employer.findOne({ _id: NewStatus.posted })
    if (!employer) return res.status(404).json({ success: false, message: "Employer not found" })

    const workers = await Worker.find()
    const worker_id = workers.map(worker => worker._id)

    NewStatus.status = status || NewStatus.status
    await NewStatus.save()

    if (status === "ACCEPTED") {
      const notification = new UserNotification(
        JobPostPayload(
          employer.email,
          NewStatus.title,
          worker_id,
          new Date()
        )
      );

      await notification.save();

      io.emit(
        "notification:worker:new",
        notification
      );
    }

    return res.status(200).json({
      success: true,
      message: "You have successfully updated job status!",
      NewStatus
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}







// Display Workers & Employers:
export const WorkersEmployers = async (req: Request, res: Response) => {
  try {
    const workers = await Worker.find().sort({ name: 1, createdAt: -1 })
    const employers = await Employer.find().sort({ email: 1, createdAt: -1 })

    return res.status(200).json({
      success: true,
      workers,
      employers
    })
  } catch (error) {
    mainError(
      error,
      res
    )
  }
}




// Add New Industry:
export const AddNewIndustry = async (req: Request, res: Response) => {
  const validatedIndustry = AddNewIndustryValidation.safeParse(req.body)
  if (!validatedIndustry.success) { const errors = validatedIndustry.error._zod.def; return res.status(400).json({ success: false, message: errors[0].message })}

  const { title } = validatedIndustry.data

  const sanitizedTitle = filterXSS(title, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: true })

  try {
    const NewIndustry = new Industry({ title: sanitizedTitle })
    await NewIndustry.save()

    return res.status(201).json({
      success: true,
      message: "New Industry Added!"
    })
  } catch (error) {
    instanceErrors(
      error,
      res
    )
  }
}