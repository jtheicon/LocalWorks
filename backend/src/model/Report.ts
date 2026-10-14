// models/Report.ts

import { Document, Schema, Types, model } from "mongoose";


export interface IReport extends Document {
  workerId: Types.ObjectId;
  employerId: Types.ObjectId;
  reportType: string;
  description: string;
  status: string;
  sentBy: Types.ObjectId;
  submitEvidence: {
    fileName: string;
    fileType: string;
  }[];
  reporter: string;
}

// Source: https://medium.com/@virtualnautilus/nested-array-of-object-in-mongoose-67902f4b90d2
const submitEvidenceSchema = new Schema({
  fileName: { type: String, required: true },
  fileType: { type: String, required: true }
})

const reportSchema = new Schema<IReport>({
  workerId: { type: Schema.Types.ObjectId, ref: "Worker", required: [true, "Worker ID must be a string"] },
  employerId: { type: Schema.Types.ObjectId, ref: "Employer", required: [true, "Employer ID must be a string"] },
  reportType: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  status: { type: String, enum: ["Pending","Under Review", "Resolved", "Rejected"], default: "Pending" },
  sentBy: { type: Schema.Types.ObjectId, required: [true, "Sent By must be a string"] },
  submitEvidence: { type: [submitEvidenceSchema], required: [true, "Submit Evidence is required" ]},
  reporter: { type: String, enum: ["worker", "employer"], required: [true, "Reporter type is required"] }
}, { timestamps: true });

export default model<IReport>(
  "Report",
  reportSchema
);