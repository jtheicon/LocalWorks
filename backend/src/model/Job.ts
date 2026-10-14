import { Document, Schema, ObjectId, model, Types } from "mongoose";

export interface IJob extends Document {
  title: string,
  company: string,
  posted: Types.ObjectId,
  location: string,
  type: string,
  salary: string,
  hoursNeeded: Number,
  description: string,
  tags: string[],
  requirements: string[],
  benefits: string[],
  schedule: string,
  startDate: string,
  status: string,
  positions: number,
  category: string,
  applyBefore: string,
  contactEmail: string,
  contactPhone: string,
  createdAt: Date
}

const JobSchema: Schema = new Schema({
  title: { type: String, required: [true, "Title is required"], unique: false },
  company: { type: String, required: [true, "Company is required"] },
  posted: { type: Schema.Types.ObjectId, ref: 'Employer', required: [true, "Employer ID is required"] },
  location: { type: String, required: [true, "Location is required"] },
  type: { type: String, enum: ["Part-Time", "Full-Time", "Contract", "Temporary", "Intern"], default: "Full-Time" },
  salary: { type: String, required: [true, "Salary is required"] },
  description: { type: String, required: [true, "Description is required"] },
  tags: [
    { type: String }
  ],
  requirements: [
    { type: String }
  ],
  benefits: [
    { type: String }
  ],
  schedule: { type: String },
  startDate: { type: String, default: "Immediate" },
  status: { type: String, default: "PENDING" },
  positions: {
    type: Number,
    default: 0
  },
  category: { type: String },
  applyBefore: { type: String, default: "N/A" },
  email: { type: String },
  phone: { type: String }
}, { timestamps: true })

export default model<IJob>("Job", JobSchema)