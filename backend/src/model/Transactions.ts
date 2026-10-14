import { Document, Schema, model } from "mongoose";

export interface ITransactions extends Document {
  workerId: string,
  employerId: string,
  sender: string
}

const TransactionSchema: Schema = new Schema({
  workerId: { type: Schema.Types.ObjectId, ref: "Worker", required: [true, "Worker ID required"] },
  employerId: { type: Schema.Types.ObjectId, ref: "Employer", required: [true, "Employer ID required"] },
  sender: { type: Schema.Types.ObjectId, required: [true, "Sender ID is required"] }
}, { timestamps: true })

export default model<ITransactions>("Transaction", TransactionSchema)