import { Document, model, Schema, Types } from "mongoose";

export interface IJobsCompleted extends Document {
  workerId: Types.ObjectId;
  employerId: Types.ObjectId;
  workerAssignment: Types.ObjectId;
  workerUpload: [
    {
      name: string;
    }
  ];
  workerDescription: string;
  isLate: Boolean;
}

const JobsCompletedSchema: Schema = new Schema({
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

  workerAssignment: {
    type: Schema.Types.ObjectId,
    ref: "WorkerAssignment",
    required: [true, "Worker Assignment is required"]
  },

  workerUpload: {
    type: [
      {
        name: {
          type: String
        }
      }
    ]
  },

  workerDescription: {
    type: String,
    default: ""
  },

  submitted: {
    type: Boolean,
    default: false
  },

  status: {
    type: String,
    enum: ["PENDING", "COMPLETED", "REJECTED"],
    default: "PENDING"
  },

  isLate: {
    type: Boolean,
    required: [true, "isLate is required"]
  }
}, { timestamps: true })

export default model<IJobsCompleted>("JobsCompleted", JobsCompletedSchema)