// models/Report.ts

import mongoose, { Document, Schema, Types } from "mongoose";


export type ReportStatus =
  | "Pending"
  | "Under Review"
  | "Resolved"
  | "Rejected";


export interface IReportWorker extends Document {
  workerId: Types.ObjectId;
  employerId: Types.ObjectId;

  reportType: string;

  description: string;

  status: ReportStatus;

  createdAt: Date;
  updatedAt: Date;
}


const reportWorkerSchema = new Schema<IReportWorker>(
  {
    workerId: {
      type: Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },

    employerId: {
      type: Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
    },

    reportType: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Under Review",
        "Resolved",
        "Rejected",
      ],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);


const ReportWorker = mongoose.model<IReportWorker>(
  "ReportWorker",
  reportWorkerSchema
);


export default ReportWorker;