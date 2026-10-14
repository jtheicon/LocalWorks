import { Document, Schema, model, ObjectId } from "mongoose";
import mongoose from "mongoose";

// https://www.mongodb.com/resources/products/compatibilities/using-typescript-with-mongodb-tutorial#creating-models-with-typescript
// https://stackoverflow.com/questions/69412049/mongoose-typescript-objectid-casting-type-string-is-not-assignable-to-type
export interface IStatusReason extends Document {
  workerId: mongoose.Types.ObjectId,
  employerId: mongoose.Types.ObjectId,
  jobId: mongoose.Types.ObjectId,
  applicationId: mongoose.Types.ObjectId,
  sentBy: string,
  title: string,
  description: string
}

const Reason: Schema = new Schema({
  workerId: {
    type: Schema.Types.ObjectId,
    ref: "Worker",
    required: [true, "Worker ID is required"]
  },

  employerId: {
    type: Schema.Types.ObjectId,
    ref: "Employer",
    required: [true, "Employer ID is required"]
  },

  jobId: {
    type: Schema.Types.ObjectId,
    ref: "Job",
    required: [true, "Job ID is required"]
  },

  applicationId: {
    type: Schema.Types.ObjectId,
    ref: "Application",
    required: [true, "Application ID is required"]
  },

  sentBy: {
    type: String,
    enum: ["worker", "employer"],
    required: [true, "Sent By is required"]
  },

  title: {
    type: String,
    required: [true, "Title is required"]
  },
  
  description: {
    type: String,
    required: [true, "Description is required"]
  }
}, { timestamps: true })

export default model<IStatusReason>("SubmitReason", Reason)