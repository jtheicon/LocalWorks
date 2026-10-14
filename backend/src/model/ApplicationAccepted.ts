import { Document, Schema, model, Types } from "mongoose";

export interface IApplicationAccepted extends Document { job: Types.ObjectId, jobCreatedAt: Date, createdAt: Date }

const ApplicationAcceptedSchema = new Schema({
  job: {
    type: Schema.Types.ObjectId,
    ref: "Job",
    required: true
  },
  
  jobCreatedAt: {
    type: Date,
    required: true
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default model<IApplicationAccepted>(
  "ApplicationAccepted",
  ApplicationAcceptedSchema
);