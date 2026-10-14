import { Document, ObjectId, Types, Schema, model } from "mongoose"

export interface IApplication extends Document {
  job: Types.ObjectId,
  worker: Types.ObjectId,
  location: string,
  timeline: string,
  status: string,
  company: string,
  interviewDate?: string
}

const ApplicationSchema = new Schema({
  job: { type: Schema.Types.ObjectId, ref: 'Job', required: [true, "Job is required"] },
  worker: { type: Schema.Types.ObjectId, ref: 'Worker', required: [true, "Worker is required"] },
  location: { type: String, required: [true, "Location is required"] },
  timeline: { type: String, enum: [ "Submitted", "Review", "Interview", "Final Decision" ], default: "Submitted" },
  status: { type: String, enum: [ "Pending Review", "Interview Scheduled", "Accepted", "Not Selected", "Withdrawed" ], default: "Pending Review" },
  company: { type: String, required: [true, "Company is required"] },
  interviewDate: { type: String, default: "" }
}, { timestamps: true })

export default model<IApplication>("Application", ApplicationSchema)