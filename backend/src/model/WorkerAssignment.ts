import { Document, Schema, Types, model } from "mongoose"

export interface IWorkerAssignment extends Document {
  employerId: Types.ObjectId;
  targetWorkers: { _id: Types.ObjectId; }[];
  title: string;
  description: string;
  submitBefore: Date;
  rejectLate: Boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkerAssignmentSchema: Schema = new Schema({
  employerId: {
    type: Schema.Types.ObjectId,
    ref: "Employer",
    required: [true, "Employer is required"]
  },

  targetWorkers: {
    type: [{
      _id: {
        type: Schema.Types.ObjectId,
        ref: "Worker"
      }
    }],
    required: [true, "Target Workers are required"]
  },

  title: {
    type: String,
    required: [true, "Title is required"]
  },

  description: {
    type: String,
    required: [true, "Description is required"]
  },

  submitBefore: {
    type: String,
    required: [true, "Submit Before is required"]
  },

  rejectLate: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

export default model<IWorkerAssignment>("WorkerAssignment", WorkerAssignmentSchema)