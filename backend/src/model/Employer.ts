import { Document, Schema, Types, model } from "mongoose"

export interface IEmployer extends Document {
  company: string,
  logo: string,
  location: string,
  description: string,
  noOfEmployees: string,
  website: string,
  owner: string,
  email: string,
  password: string,
  phone: string,
  industry: Types.ObjectId,
  profile: string,
  permit: string,
  status: string,
  role: string
}

const EmployerSchema: Schema = new Schema({
  // Source - https://stackoverflow.com/a/12096922
// Posted by JohnnyHK, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-27, License - CC BY-SA 3.0

  company: { type: String, required: [true, "Company is required"] },
  logo: { type: String, default: "default.png" },
  location: { type: String, default: "No Location" },
  description: { type: String, default: "No Description" },
  noOfEmployees: { type: Number, default: 0 },
  website: { type: String, default: "N/A" },
  owner: { type: String, default: "N/A" },
  email: { type: String, required: [true, "Email is required"], unique: [true, "Email is already in use"] },
  password: { type: String, required: [true, "Password is required"], select: false },
  phone: { type: String, required: [true, "Phone is required"] },
  industry: { type: Schema.Types.ObjectId, ref: 'Industry', required: [true, "Industry is required"] },
  profile: { type: String, default: "default.jpg" },
  permit: { type: String, default: "" },
  status: { type: String, default: "pending" },
  role: { type: String, enum: ["employer"], default: "employer" }
}, { timestamps: true })

export default model<IEmployer>("Employer", EmployerSchema)