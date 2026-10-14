import { Document, Types, model, Schema } from "mongoose"

export interface IVerifiedWorker extends Document {
  worker: Types.ObjectId
}

const VerifiedWorkerSchema = new Schema({
  worker: {
    type: Schema.Types.ObjectId,
    required: true
  }
}, { timestamps: true })

export default model("VerifiedWorker", VerifiedWorkerSchema)